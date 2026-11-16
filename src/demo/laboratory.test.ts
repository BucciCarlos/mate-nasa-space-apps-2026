import { describe, expect, it } from 'vitest';
import { DAY_EVENTS, EXERCISE_EVENTS, EXERCISE_SESSION, OWNER, START, elapsedMinutes, freshPreview, latestNews, latestPersonalEvent, nextPreviewEvent, previewReduce, previewReply, previewTime, restorePreview } from './fd30';
import { BLOOD_SAMPLE, HISTORICAL_BLOOD_SAMPLE, LAB_EVENTS, LAB_HISTORY, URINE_SAMPLE, ingestLab, labIncomplete, labSamples, labStatus } from './laboratory';
import { parseRoute, toHash } from '../app/routes';

const wallAt = (time: string) => Date.parse(`2027-03-10T${time}:00Z`) - START + 1000;
const tickAt = (time: string) => previewReduce(freshPreview(1000, 1), { type: 'tick', now: wallAt(time) });

describe('IMP04 laboratory — private sample workflow and source limits', () => {
  it('opens the canonical route and preloads only Lucía’s stored sample, never a new result', () => {
    const route = { view: 'fd30', page: 'laboratory' } as const;
    expect(toHash(route)).toBe('#/onboard/personal/laboratory');
    expect(parseRoute(toHash(route))).toEqual(route);
    const state = freshPreview(1000, 1);
    const samples = labSamples(state, OWNER);
    expect(samples).toHaveLength(1);
    expect(samples[0].id).toBe(HISTORICAL_BLOOD_SAMPLE);
    expect(samples[0].collection?.handlingStatus).toBe('stored_awaiting_analysis');
    expect(samples[0].analysis).toBeNull();
    expect(samples[0].result).toBeNull();
    expect(samples[0].collection?.measurement).toBeNull();
    expect(state.processedIds).toContain(LAB_HISTORY.id);
    expect(latestNews(state, OWNER)).toBeNull();
    for (const other of ['iss:crew-ti', 'iss:crew-mo'] as const) expect(labSamples(state, other)).toEqual([]);
  });
  it('ingests exact source instants automatically, with independent blood and optional urine samples', () => {
    const times = ['09:14', '09:15', '09:20', '09:25', '09:30', '11:45', '11:50'];
    const statuses = ['planned', 'collection', 'analysis', 'analysis', 'analysis', 'result', 'result'];
    for (let i = 0; i < times.length; i++) {
      const state = tickAt(times[i]);
      expect(labStatus(labSamples(state, OWNER).find(s => s.id === BLOOD_SAMPLE))).toBe(statuses[i]);
      expect(state.offsetMs).toBe(0);
      expect(state.laboratory.find(s => s.id === HISTORICAL_BLOOD_SAMPLE)?.collection).toEqual(LAB_HISTORY);
    }
    const state = tickAt('11:45');
    expect(labStatus(state.laboratory.find(s => s.id === URINE_SAMPLE))).toBe('analysis');
    const blood = state.laboratory.find(s => s.id === BLOOD_SAMPLE)!;
    expect(blood.collection).toEqual(LAB_EVENTS[0]);
    expect(blood.analysis).toEqual(LAB_EVENTS[1]);
    expect(blood.result).toEqual(LAB_EVENTS[4]);
    expect(blood.result?.measurement).toBeNull();
    expect(blood.result?.sourceReview).toBeUndefined();
    expect(labIncomplete(blood)).toBe(false);
    expect(latestPersonalEvent(state, OWNER)?.id).toBe(LAB_EVENTS[4].id);
    expect(latestNews(state, OWNER)?.id).toBe(LAB_EVENTS[4].id);
    expect(previewReply(state, OWNER, 'Ver mi resumen')).toBe('laboratory');
    expect(previewReply(state, OWNER, 'my sleep summary')).toBe('sleep');
    expect(previewReply(state, OWNER, 'exercise summary')).toBe('exercise');
    expect(previewReply(state, 'iss:crew-mo', 'Ver mi resumen')).toBe('sleep');
  });
  it('shares one ordered clock/journal with unchanged wake and 60-minute exercise event times', () => {
    let state = freshPreview(1000, 1);
    expect(DAY_EVENTS.map(e => e.occurredAt.slice(11, 16))).toEqual(['06:00', '09:15', '09:20', '09:25', '09:30', '10:30', '11:30', '11:45', '11:50', '13:15', '13:20', '15:45', '16:15', '16:20']);
    const preload = state.processedIds.length;
    for (const event of DAY_EVENTS) {
      expect(nextPreviewEvent(state)?.id).toBe(event.id);
      state = previewReduce(state, { type: 'next', now: 2000 });
      expect(previewTime(state, 2000)).toBe(Date.parse(event.occurredAt));
    }
    expect(state.processedIds.slice(preload)).toEqual(DAY_EVENTS.map(e => e.id));
    expect(state.wakeReceived).toBe(true);
    const session = state.exercise.find(s => s.id === EXERCISE_SESSION)!;
    expect(session.start).toEqual(EXERCISE_EVENTS[0]);
    expect(session.finish).toEqual(EXERCISE_EVENTS[1]);
    expect(elapsedMinutes(session)).toBe(60);
    expect(nextPreviewEvent(state)).toBeUndefined();
    expect(previewReduce(state, { type: 'next', now: 2000 })).toBe(state);
  });
  it('receives for an inactive owner without changing profile preferences or creating another owner’s news', () => {
    const initial = previewReduce(freshPreview(1000, 1), { type: 'position', owner: OWNER, position: { x: .2, y: .4 } });
    const inactive = previewReduce(initial, { type: 'select', crewId: 'iss:crew-mo' });
    const state = previewReduce(inactive, { type: 'tick', now: wallAt('11:45') });
    expect(state.activeCrewId).toBe('iss:crew-mo');
    expect(state.profiles).toEqual(inactive.profiles);
    expect(labSamples(state, 'iss:crew-mo')).toEqual([]);
    expect(latestNews(state, 'iss:crew-mo')).toBeNull();
    expect(latestPersonalEvent(state, 'iss:crew-mo')).toBeNull();
    expect(latestNews(state, OWNER)?.id).toBe(LAB_EVENTS[4].id);
  });
  it('acknowledges exactly the requested sample event, rejecting stale or mismatched actions; reopening never replays', () => {
    let state = tickAt('11:45');
    const action = { type: 'laboratory/view', owner: OWNER, sampleId: BLOOD_SAMPLE, eventId: LAB_EVENTS[4].id } as const;
    expect(previewReduce(state, { ...action, sampleId: HISTORICAL_BLOOD_SAMPLE })).toBe(state);
    state = previewReduce(state, action);
    expect(state.profiles[OWNER].highlightedSampleId).toBe(BLOOD_SAMPLE);
    expect(state.profiles[OWNER].labSeenIds).toEqual([LAB_EVENTS[4].id]);
    expect(state.profiles[OWNER].exerciseSeenIds).toEqual([]);
    expect(previewReduce(state, action)).toBe(state);
    expect(previewReduce(state, { type: 'tick', now: wallAt('11:45') + 1000 })).toBe(state);
    const restored = restorePreview(JSON.stringify(state), wallAt('11:45') + 1000);
    expect(restored).toEqual(state);
    expect(previewReduce(restored, action)).toBe(restored);
    expect(restored.laboratory.filter(s => s.id === BLOOD_SAMPLE)).toHaveLength(1);
    const switched = previewReduce(state, { type: 'select', crewId: 'iss:crew-ti' });
    expect(previewReduce(switched, action)).toBe(switched);
    expect(latestPersonalEvent(tickAt('11:50'), OWNER)?.id).toBe(LAB_EVENTS[5].id);
  });
  it('deduplicates, rejects incorrect sources/missions/mappings/correlations and keeps content-free diagnostics', () => {
    const state = freshPreview(1000, 1), due = Date.parse(LAB_EVENTS[4].occurredAt);
    const collected = ingestLab(state, [LAB_EVENTS[0]], due);
    const rewriteHistory = ingestLab(state, [{ ...LAB_EVENTS[1], sampleId: HISTORICAL_BLOOD_SAMPLE }], due);
    expect(rewriteHistory.laboratory).toEqual(state.laboratory);
    expect(rewriteHistory.diagnostics[0].status).toBe('rejected');
    expect(ingestLab(collected, [LAB_EVENTS[0]], due)).toBe(collected);
    for (const patch of [{ missionId: 'cislunar' }, { sourceId: 'unknown' }, { association: { status: 'unconfirmed' as const } }, { association: { status: 'confirmed' as const, crewId: 'unknown' } }, { occurredAt: 'invalid' }]) {
      const rejected = ingestLab(state, [{ ...LAB_EVENTS[0], ...patch }], due);
      expect(rejected.laboratory).toEqual(state.laboratory);
      expect(latestNews(rejected, OWNER)).toBeNull();
      expect(rejected.diagnostics).toHaveLength(1);
      expect(Object.keys(rejected.diagnostics[0]).sort()).toEqual(['eventId', 'sourceId', 'status']);
      expect(ingestLab(rejected, [{ ...LAB_EVENTS[0], ...patch }], due)).toBe(rejected);
    }
    for (const patch of [{ sampleType: 'urine' as const }, { association: { status: 'confirmed' as const, crewId: 'iss:crew-ti' } }]) {
      const rejected = ingestLab(collected, [{ ...LAB_EVENTS[1], ...patch }], due);
      expect(rejected.laboratory).toEqual(collected.laboratory);
      expect(rejected.diagnostics[0].status).toBe('rejected');
    }
  });
  it('keeps missing predecessors incomplete and source review distinct from usable values', () => {
    const state = freshPreview(1000, 1), due = Date.parse(LAB_EVENTS[4].occurredAt);
    const flaggedEvent = { ...LAB_EVENTS[4], sourceReview: 'flagged' as const };
    const flagged = ingestLab(state, [flaggedEvent], due);
    const sample = flagged.laboratory.find(s => s.id === BLOOD_SAMPLE)!;
    expect(sample.collection).toBeNull();
    expect(sample.analysis).toBeNull();
    expect(sample.result?.sourceReview).toBe('flagged');
    expect(sample.result?.measurement).toBeNull();
    expect(labIncomplete(sample)).toBe(true);
    expect(labStatus(sample)).toBe('result');
    const backwards = ingestLab(flagged, [LAB_EVENTS[0]], due);
    expect(backwards.laboratory).toEqual(flagged.laboratory);
    expect(backwards.diagnostics[0].status).toBe('rejected');
    const reverseWithLaterSequence = ingestLab(flagged, [{ ...LAB_EVENTS[1], scenarioSequence: 99 }], due);
    expect(reverseWithLaterSequence.laboratory).toEqual(flagged.laboratory);
    expect(reverseWithLaterSequence.diagnostics[0].status).toBe('rejected');
  });
  it('migrates IMP03 snapshots without resetting clock, exercise, wake, positions, drafts, chat or acknowledgement', () => {
    let original = tickAt('11:30');
    original = previewReduce(original, { type: 'ask', owner: OWNER, text: 'Exercise', lang: 'en' });
    original = previewReduce(original, { type: 'draft', owner: OWNER, text: 'private unfinished' });
    original = previewReduce(original, { type: 'position', owner: OWNER, position: { x: .4, y: .2 } });
    original = previewReduce(original, { type: 'exercise/view', owner: OWNER, sessionId: EXERCISE_SESSION, eventId: EXERCISE_EVENTS[1].id });
    const { laboratory: _lab, ...old } = original;
    const legacy = { ...old, version: 3, processedIds: original.processedIds.filter(id => !id.includes('sample') && id !== LAB_HISTORY.id),
      profiles: Object.fromEntries(Object.entries(original.profiles).map(([id, profile]) => { const { labSeenIds: _seen, highlightedSampleId: _highlight, ...rest } = profile; return [id, rest]; })) };
    const loaded = restorePreview(JSON.stringify(legacy), wallAt('11:30'));
    expect(loaded.version).toBe(6);
    expect(loaded.sessionStartMs).toBe(original.sessionStartMs);
    expect(loaded.offsetMs).toBe(original.offsetMs);
    expect(loaded.exercise).toEqual(original.exercise);
    expect(loaded.wakeReceived).toBe(original.wakeReceived);
    expect(loaded.profiles[OWNER]).toEqual({ ...original.profiles[OWNER], labSeenIds: [], highlightedSampleId: null });
    expect(loaded.laboratory).toEqual(original.laboratory);
    expect(loaded.processedIds).toEqual(expect.arrayContaining(legacy.processedIds));
    const catchUp = previewReduce(loaded, { type: 'tick', now: wallAt('11:45') });
    expect(latestPersonalEvent(catchUp, OWNER)?.id).toBe(LAB_EVENTS[4].id);
    expect(catchUp.exercise).toEqual(original.exercise);
    expect(restorePreview(JSON.stringify(catchUp), wallAt('11:45'))).toEqual(catchUp);
  });
});
