import { describe, expect, it } from 'vitest';
import { CREW, FD30_KEY, HISTORY, OWNER, REST, START, WAKE, WAKE_EVENT, EXERCISE_EVENTS, EXERCISE_HISTORY, EXERCISE_SESSION, DAY_EVENTS, elapsedMinutes, exerciseSessions, ingestExercise, latestPersonalEvent, latestNews, nextPreviewEvent, previewReply, freshPreview, previewReduce, previewTime, restorePreview } from './fd30';
import { fitPosition, fromPreference, intersects, toPreference } from './position';
import { createInitialState } from '../state/initialState';
import { STORAGE_KEY } from '../state/persistence';
import { parseRoute, toHash } from '../app/routes';

describe('FD30 wake cut — clock, provenance and isolation', () => {
  it('starts at 05:55 with readable history, no measurement and no news', () => {
    const s = freshPreview(1000);
    expect(previewTime(s, 1000)).toBe(START);
    expect(s.wakeReceived).toBe(false);
    expect(s.profiles[OWNER].seen).toBe(false);
    expect(HISTORY.measurement).toBeNull();
    expect(WAKE_EVENT.measurement).toBeNull();
    expect(Date.parse(REST.end) - Date.parse(REST.start)).toBe(8.5 * 3600_000);
    expect(WAKE_EVENT.association.crewId).toBe(HISTORY.crewId);
  });
  it('ingests at the due time without requiring next, exactly once including catch-up', () => {
    const s = freshPreview(1000);
    expect(previewReduce(s, { type: 'tick', now: 300_999 })).toBe(s);
    const received = previewReduce(s, { type: 'tick', now: 301_000 });
    expect(received.wakeReceived).toBe(true);
    expect(received.profiles[OWNER].seen).toBe(false);
    expect(previewReduce(received, { type: 'tick', now: 900_000 })).toBe(received);
    expect(previewReduce(s, { type: 'tick', now: 900_000 }).wakeReceived).toBe(true);
  });
  it('next skips only the remaining interval, then 1x continues; no wrap on repeat', () => {
    const s = freshPreview(1000);
    const advanced = previewReduce(s, { type: 'next', now: 61_000 });
    expect(previewTime(advanced, 61_000)).toBe(WAKE);
    expect(previewTime(advanced, 71_000)).toBe(WAKE + 10_000);
    expect(nextPreviewEvent(advanced)?.kind).toBe('lab.sample_taken');
    expect(previewReduce(advanced, { type: 'seen', owner: OWNER }).profiles[OWNER].seen).toBe(true);
  });
  it('retains conversation, draft and receipt over reload, with language of original input', () => {
    let s = previewReduce(freshPreview(1000), { type: 'next', now: 2000 });
    s = previewReduce(s, { type: 'ask', owner: OWNER, text: 'Ver mi resumen', lang: 'es' });
    s = previewReduce(s, { type: 'draft', owner: OWNER, text: 'my unfinished question' });
    const loaded = restorePreview(JSON.stringify(s), 5000);
    expect(loaded).toEqual(s);
    expect(loaded.profiles[OWNER].turns[0]).toEqual({ text: 'Ver mi resumen', lang: 'es', reply: 'sleep' });
    expect(previewReduce(loaded, { type: 'tick', now: 5000 })).toBe(loaded);
  });
  it('resets only the cut and rejects invalid snapshots without consuming an M1 snapshot', () => {
    const m1 = createInitialState(1000, 'es');
    expect(FD30_KEY).not.toBe(STORAGE_KEY);
    for (const raw of ['invalid', JSON.stringify(m1), JSON.stringify({ ...freshPreview(1000), offsetMs: -1 }), JSON.stringify({ ...freshPreview(1000), profiles: {} })]) {
      expect(restorePreview(raw, 2000)).toEqual(freshPreview(2000));
    }
    expect(previewReduce(freshPreview(1000), { type: 'reset', now: 2000 })).toEqual(freshPreview(2000));
    expect(m1.missions.iss.clockStart).toBe('2027-03-09T14:00:00Z');
  });
  it('uses the canonical personal route, retaining all published M1 route meanings', () => {
    for (const page of ['sleep', 'today', 'exercise', 'laboratory'] as const) {
      const route = { view: 'fd30', page } as const;
      expect(parseRoute(toHash(route))).toEqual(route);
    }
    expect(toHash({ view: 'fd30', page: 'sleep' })).toBe('#/onboard/personal/sleep');
    expect(parseRoute('#/onboard/today')).toEqual({ view: 'onboard', page: 'today' });
    expect(toHash({ view: 'fd30', page: 'exercise' })).toBe('#/onboard/personal/exercise');
  });
});

describe('Floating companions — private preferences and safe positions', () => {
  it('switches profiles without changing clocks or wake attribution; stale private writes do nothing', () => {
    let s = previewReduce(freshPreview(1000), { type: 'position', owner: OWNER, position: { x: .2, y: .3 } });
    s = previewReduce(s, { type: 'ask', owner: OWNER, text: 'my private turn', lang: 'en' });
    const lucia = s.profiles[OWNER];
    s = previewReduce(s, { type: 'select', crewId: 'iss:crew-ti' });
    expect(previewTime(s, 2000)).toBe(START + 1000);
    expect(s.profiles['iss:crew-ti'].turns).toEqual([]);
    expect(previewReduce(s, { type: 'draft', owner: OWNER, text: 'late text' })).toBe(s);
    expect(previewReduce(s, { type: 'position', owner: OWNER, position: null })).toBe(s);
    s = previewReduce(s, { type: 'position', owner: 'iss:crew-ti', position: { x: .7, y: .1 } });
    s = previewReduce(s, { type: 'next', now: 2000 });
    expect(s.wakeReceived).toBe(true);
    expect(WAKE_EVENT.association.crewId).toBe(OWNER);
    expect(s.profiles[OWNER]).toEqual(lucia);
    s = previewReduce(s, { type: 'select', crewId: OWNER });
    expect(s.profiles[OWNER].position).toEqual({ x: .2, y: .3 });
    const offset = s.offsetMs;
    s = previewReduce(s, { type: 'position', owner: OWNER, position: null });
    expect(s.offsetMs).toBe(offset);
    expect(s.profiles['iss:crew-ti'].position).toEqual({ x: .7, y: .1 });
  });
  it('migrates the original preview snapshot without losing its clock, receipt, chat or draft', () => {
    const legacy = { version: 1, sessionStartMs: 1000, offsetMs: 300000, wakeReceived: true,
      profiles: { [OWNER]: { seen: true, draft: 'unfinished', turns: [{ text: 'resumen', lang: 'es', reply: 'sleep' }] } } };
    const s = restorePreview(JSON.stringify(legacy), 2000);
    expect(s.version).toBe(4);
    expect(s.sessionStartMs).toBe(1000);
    expect(s.offsetMs).toBe(300000);
    expect(s.wakeReceived).toBe(true);
    expect(s.profiles[OWNER].draft).toBe('unfinished');
    expect(s.profiles[OWNER].turns).toEqual(legacy.profiles[OWNER].turns);
    expect(s.profiles['iss:crew-ti'].turns).toEqual([]);
    expect(restorePreview(JSON.stringify(s), 3000)).toEqual(s);
    expect(new Set(CREW.map(c => c.shape)).size).toBe(3);
  });
  it('fits a drop outside essential controls, bounds all edges and preserves normalized preference', () => {
    const bounds = { x: 8, y: 150, width: 374, height: 680 }, size = { width: 88, height: 140 };
    const obstacle = { x: 100, y: 300, width: 150, height: 45 };
    const point = fitPosition({ x: 120, y: 310 }, bounds, size, [obstacle]);
    expect(intersects({ ...point, ...size }, obstacle)).toBe(false);
    const edge = fitPosition({ x: 999, y: -99 }, bounds, size);
    expect(edge).toEqual({ x: 294, y: 150 });
    const preference = toPreference(point, bounds, size);
    const narrow = { ...bounds, width: 280 };
    const adjusted = fromPreference(preference, narrow, size);
    expect(adjusted.x).toBeLessThanOrEqual(200);
    expect(fromPreference(preference, bounds, size).x).toBeCloseTo(point.x);
    expect(fromPreference(null, bounds, size)).toEqual({ x: 294, y: 690 });
  });
  it('rejects malformed coordinates and invalid owners on restore', () => {
    const s = freshPreview(1000);
    const bad = { ...s, profiles: { ...s.profiles, [OWNER]: { ...s.profiles[OWNER], position: { x: 2, y: 0 } } } };
    expect(restorePreview(JSON.stringify(bad), 2000)).toEqual(freshPreview(2000));
    expect(restorePreview(JSON.stringify({ ...s, activeCrewId: 'unknown' }), 2000)).toEqual(freshPreview(2000));
  });
});


describe('IMP03 exercise — owner-scoped workflow, journal and migration', () => {
  it('preloads only Lucía, readable without events, never as novelty or a measurement', () => {
    const state = freshPreview(1000);
    expect(exerciseSessions(state, OWNER)).toHaveLength(1);
    expect(exerciseSessions(state, 'iss:crew-mo')).toEqual([]);
    expect(exerciseSessions(state, 'iss:crew-ti')).toEqual([]);
    expect(state.processedIds).toEqual(expect.arrayContaining(EXERCISE_HISTORY.map(e => e.id)));
    expect(latestNews(state, OWNER)).toBeNull();
    expect(EXERCISE_HISTORY.every(e => e.measurement === null && e.sourceId === 'demo-history')).toBe(true);
  });
  it('automatically starts/finishes at source times with the same clock, including inactive owners and catch-up', () => {
    let state = previewReduce(freshPreview(1000), { type: 'select', crewId: 'iss:crew-mo' });
    const startAt = Date.parse(EXERCISE_EVENTS[0].occurredAt) - START + 1000;
    const finishAt = Date.parse(EXERCISE_EVENTS[1].occurredAt) - START + 1000;
    state = previewReduce(state, { type: 'tick', now: startAt - 1 });
    expect(state.exercise.find(s => s.id === EXERCISE_SESSION)).toBeUndefined();
    state = previewReduce(state, { type: 'tick', now: startAt });
    let session = exerciseSessions(state, OWNER).find(s => s.id === EXERCISE_SESSION)!;
    expect(session.start).toEqual(EXERCISE_EVENTS[0]);
    expect(elapsedMinutes(session)).toBeNull();
    expect(latestNews(state, 'iss:crew-mo')).toBeNull();
    state = previewReduce(state, { type: 'tick', now: finishAt });
    session = exerciseSessions(state, OWNER).find(s => s.id === EXERCISE_SESSION)!;
    expect(session.finish).toEqual(EXERCISE_EVENTS[1]);
    expect(elapsedMinutes(session)).toBe(60);
    expect(state.offsetMs).toBe(0);
    const catchUp = previewReduce(freshPreview(1000), { type: 'tick', now: finishAt });
    expect(catchUp.exercise).toEqual(state.exercise);
    expect(previewReduce(state, { type: 'tick', now: finishAt + 10000 })).toBe(state);
    expect(restorePreview(JSON.stringify(state), finishAt + 10000)).toEqual(state);
  });
  it('next processes the shared day in source order, then resumes 1x without wrapping or duplication', () => {
    let state = freshPreview(1000);
    for (const event of DAY_EVENTS) {
      state = previewReduce(state, { type: 'next', now: 2000 });
      expect(previewTime(state, 2000)).toBe(Date.parse(event.occurredAt));
      expect(state.processedIds.filter(id => id === event.id)).toHaveLength(1);
    }
    expect(nextPreviewEvent(state)).toBeUndefined();
    expect(previewTime(state, 3000)).toBe(Date.parse(DAY_EVENTS.at(-1)!.occurredAt) + 1000);
    expect(previewReduce(state, { type: 'next', now: 3000 })).toBe(state);
  });
  it('summary action acknowledges exactly its event, highlights its session and rejects stale owner/session references', () => {
    let state = previewReduce(freshPreview(1000), { type: 'tick', now: Date.parse(EXERCISE_EVENTS[1].occurredAt) - START + 1000 });
    expect(latestNews(state, OWNER)?.id).toBe(EXERCISE_EVENTS[1].id);
    state = previewReduce(state, { type: 'exercise/view', owner: OWNER, sessionId: EXERCISE_SESSION, eventId: EXERCISE_EVENTS[1].id });
    expect(state.profiles[OWNER].highlightedSessionId).toBe(EXERCISE_SESSION);
    expect(state.profiles[OWNER].exerciseSeenIds).toEqual([EXERCISE_EVENTS[1].id]);
    expect(latestPersonalEvent(state, OWNER)?.id).toBe(EXERCISE_EVENTS[1].id);
    expect(latestPersonalEvent(state, 'iss:crew-mo')).toBeNull();
    expect(state.profiles[OWNER].seen).toBe(false);
    expect(previewReply(state, OWNER, 'my sleep summary')).toBe('sleep');
    expect(previewReply(state, OWNER, 'Ver mi resumen')).toBe('exercise');
    expect(previewReply(state, 'iss:crew-mo', 'Ver mi resumen')).toBe('sleep');
    expect(previewReduce(state, { type: 'exercise/view', owner: OWNER, sessionId: EXERCISE_SESSION, eventId: EXERCISE_EVENTS[1].id })).toBe(state);
    expect(previewReduce(state, { type: 'exercise/view', owner: OWNER, sessionId: 'other', eventId: EXERCISE_EVENTS[1].id })).toBe(state);
    state = previewReduce(state, { type: 'select', crewId: 'iss:crew-ti' });
    expect(previewReduce(state, { type: 'exercise/view', owner: OWNER, sessionId: EXERCISE_SESSION, eventId: EXERCISE_EVENTS[1].id })).toBe(state);
  });
  it('migrates v2 without losing owner positions, drafts, turns, receipts, active owner or mission time', () => {
    const initial = freshPreview(1000);
    const legacy = { version: 2, sessionStartMs: 1000, offsetMs: 500000, wakeReceived: true, activeCrewId: 'iss:crew-ti',
      profiles: Object.fromEntries(CREW.map((c, i) => [c.id, { seen: true, draft: `private-${i}`, turns: [{ text: `turn-${i}`, lang: 'es', reply: 'sleep' }], position: { x: i / 4, y: .4 } }])) };
    const restored = restorePreview(JSON.stringify(legacy), 10000);
    expect(restored.version).toBe(4);
    expect(restored.activeCrewId).toBe(legacy.activeCrewId);
    expect(restored.sessionStartMs).toBe(legacy.sessionStartMs);
    expect(restored.offsetMs).toBe(legacy.offsetMs);
    for (const c of CREW) expect(restored.profiles[c.id]).toMatchObject(legacy.profiles[c.id]);
    expect(restored.wakeReceived).toBe(true);
    expect(restored.exercise).toEqual(initial.exercise);
    expect(restored.processedIds).toContain(WAKE_EVENT.id);
    expect(restorePreview(JSON.stringify(restored), 11000)).toEqual(restored);
  });
  it('rejects duplicate, wrong mission/source, unconfirmed and backwards events without leaking content', () => {
    const state = freshPreview(1000), due = Date.parse(EXERCISE_EVENTS[1].occurredAt);
    const started = ingestExercise(state, [EXERCISE_EVENTS[0]], due);
    expect(ingestExercise(started, [EXERCISE_EVENTS[0]], due)).toBe(started);
    for (const patch of [{ missionId: 'cislunar' }, { sourceId: 'unknown' }, { association: { status: 'unconfirmed' as const } }, { association: { status: 'confirmed' as const, crewId: 'unknown' } }]) {
      const rejected = ingestExercise(state, [{ ...EXERCISE_EVENTS[0], ...patch }], due);
      expect(rejected.exercise).toEqual(state.exercise);
      expect(rejected.diagnostics).toHaveLength(1);
      expect(latestNews(rejected, OWNER)).toBeNull();
      expect(Object.keys(rejected.diagnostics[0]).sort()).toEqual(['eventId', 'sourceId', 'status']);
      expect(ingestExercise(rejected, [{ ...EXERCISE_EVENTS[0], ...patch }], due)).toBe(rejected);
    }
    const incomplete = ingestExercise(state, [EXERCISE_EVENTS[1]], due);
    expect(elapsedMinutes(incomplete.exercise.find(s => s.id === EXERCISE_SESSION)!)).toBeNull();
    const backwards = ingestExercise(incomplete, [EXERCISE_EVENTS[0]], due);
    expect(backwards.exercise).toEqual(incomplete.exercise);
    expect(backwards.diagnostics[0].status).toBe('rejected');
  });
});
