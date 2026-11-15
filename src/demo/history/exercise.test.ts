import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CREW, DAY_EVENTS, EXERCISE_SESSION, OWNER, freshPreview, previewReduce } from '../fd30';
import { EXERCISE_PLAN, EXERCISE_RECORDS, comparableReason, exerciseComparisons, exerciseHistory } from './exercise';
import type { ExerciseViewer } from './exercise';
import { exerciseSessionView } from '../exerciseSession';
import { scriptedAnswer } from '../fd30Chat';
import { EQUIPMENT, PLAN_FD30, validatePlan } from '../fd30Plan';
import { groundView, commanderView } from '../../views/fd30-ops/opsSelectors';
import { freshOps } from '../../views/fd30-ops/opsState';
import { ExerciseHistory } from '../../views/history/exercise/ExerciseHistory';
import { ExerciseSummary } from '../../views/history/exercise/ExerciseSummary';
import { ExerciseProvenance } from '../../views/history/exercise/ExerciseProvenance';
import { EXERCISE_TEXT } from '../../views/history/exercise/exerciseText';
import { I18nProvider } from '../../i18n/I18nProvider';
import { Fd30Conversation } from '../Fd30Conversation';

const at = (h: string) => Date.parse(`2027-03-10T${h}:00Z`);
const seek = (s: ReturnType<typeof freshPreview>, h: string) => previewReduce(s, { type: 'seek', now: 1000, target: at(h) });
const own = (owner: typeof CREW[number]['id'] = OWNER, h = '05:55') => previewReduce(seek(freshPreview(1000), h), { type: 'select', crewId: owner });
const viewer = (owner: typeof CREW[number]['id'] = OWNER): ExerciseViewer => ({ perspective: 'onboard', owner });

describe('HIST02 private exercise history', () => {
  it('declares distinct exercise-only coverage with conflict-free equipment, stable IDs and no invented daily sessions', () => {
    expect(EXERCISE_RECORDS).toHaveLength(50);
    expect(new Set(EXERCISE_RECORDS.map(r => r.id)).size).toBe(50);
    expect(EXERCISE_PLAN).toHaveLength(87);
    expect(EXERCISE_RECORDS.filter(r => r.owner === OWNER && r.fd === 29).map(r => r.id)).toEqual(['iss:history:lf:exercise-fd29']);
    expect(EXERCISE_RECORDS.every(r => r.fd < 30 && r.durationMinutes === 60 && r.source.scope === 'crew_private' && EQUIPMENT[r.equipmentId])).toBe(true);
    for (const d of EXERCISE_PLAN.filter(d => d.start)) {
      expect(EXERCISE_PLAN.filter(o => o !== d && o.equipmentId === d.equipmentId && o.start && Date.parse(d.start!) < Date.parse(o.end!) && Date.parse(o.start) < Date.parse(d.end!))).toEqual([]);
    }
    expect(validatePlan(PLAN_FD30)).toBe(true);
    expect(new Set(CREW.map(c => JSON.stringify(EXERCISE_RECORDS.filter(r => r.owner === c.id).map(r => [r.fd, r.powerW])))).size).toBe(3);
  });
  it('filters occurrence AND receipt before the independent 7/30 range, with no state mutation', () => {
    const s = own(), before = JSON.stringify(s);
    const seven = exerciseHistory(s, viewer(), at('05:55'), 'last7')!, all = exerciseHistory(s, viewer(), at('05:55'), 'all')!;
    expect(seven.days.map(d => d.fd)).toEqual([24,25,26,27,28,29,30]);
    expect(all.days).toHaveLength(30); expect(seven.records).toHaveLength(4); expect(all.records).toHaveLength(21);
    expect(JSON.stringify(s)).toBe(before);
    const future = { ...EXERCISE_RECORDS[0], id: 'test', fd: 30, start: '2027-03-10T09:00:00Z', end: '2027-03-10T10:00:00Z', receivedAt: '2027-03-10T11:00:00Z' };
    expect(exerciseHistory(s, viewer(), at('10:59'), 'all', [future])?.records).toEqual([]);
    expect(exerciseHistory(s, viewer(), at('11:00'), 'all', [future])?.records).toEqual([future]);
    expect(exerciseHistory(s, viewer(), at('10:59'), 'all', [{ ...future, end: '2027-03-10T11:00:00Z', receivedAt: '2027-03-10T10:00:00Z' }])?.records).toEqual([]);
  });
  it('calculates Tomás own ergometer reference before range: 4 versus 9, no FD30 treadmill equivalence', () => {
    const owner = 'iss:crew-ti', s = own(owner, '23:59');
    const seven = exerciseHistory(s, viewer(owner), at('23:59'), 'last7')!, all = exerciseHistory(s, viewer(owner), at('23:59'), 'all')!;
    expect(seven.comparisons).toEqual(all.comparisons);
    const c = seven.comparisons[0];
    expect(c.recent.map(r => r.fd)).toEqual([23,25,27,29]); expect(c.baseline).toHaveLength(9);
    expect(c.referenceW).toBe(200); expect(c.recentW).toBe(181); expect(c.differenceW).toBe(-19); expect(c.differencePercent).toBe(-9.5);
    expect(c.rows.every(r => r.owner === owner && r.equipmentId === 'demo-ergometer' && r.protocolId === 'demo-steady-60.1')).toBe(true);
    expect(seven.days.at(-1)).toMatchObject({ status: 'no_record', sessions: [], reservation: { equipmentId: 'demo-treadmill' } });
    const insufficient = exerciseComparisons(c.rows.slice(1))[0]; expect(insufficient.referenceW).toBe(200); // 8 prior still valid
    expect(exerciseComparisons(c.rows.slice(2))[0].referenceW).toBeNull();
    const mixed = exerciseComparisons(c.rows.map((r, i) => i < 4 ? { ...r, protocolId: 'other' } : r));
    expect(mixed.every(g => g.referenceW === null)).toBe(true);
    expect(exerciseComparisons(c.rows.map((r, i) => i < 4 ? { ...r, owner: OWNER } : r)).every(g => g.referenceW === null)).toBe(true);
  });
  it('rejects noncomparable sessions and keeps missing metrics absent instead of zero', () => {
    const r = EXERCISE_RECORDS[0]; expect(comparableReason(r)).toBeNull();
    const patches = [
      [{ equipmentId: 'demo-treadmill' }, 'equipment'], [{ protocolId: '' }, 'protocol'], [{ confirmed: false }, 'confirmation'],
      [{ end: r.start }, 'order'], [{ durationMinutes: 54 }, 'duration'], [{ powerW: null }, 'power'], [{ powerMinutes: 47 }, 'coverage'],
    ] as const;
    for (const [patch, reason] of patches) expect(comparableReason({ ...r, ...patch })).toBe(reason);
    expect(comparableReason({ ...r, powerMinutes: 48 })).toBeNull();
    const lf = exerciseHistory(own(), viewer(), at('05:55'), 'all')!;
    expect(Math.abs(lf.comparisons[0].differencePercent!)).toBeLessThan(3);
    expect(lf.records.find(r => r.fd === 17)?.powerW).toBeNull();
    expect(lf.comparisons[0].rows.some(r => r.fd === 17 || r.fd === 24)).toBe(false);
    for (const durationMinutes of [54, 66]) expect(comparableReason({ ...r, durationMinutes, powerMinutes: durationMinutes,
      end: new Date(Date.parse(r.start) + durationMinutes * 60_000).toISOString(),
      receivedAt: new Date(Date.parse(r.start) + durationMinutes * 60_000).toISOString() })).toBeNull();
    const mei = exerciseHistory(own('iss:crew-mo'), viewer('iss:crew-mo'), at('05:55'), 'all')!;
    expect(mei.days.find(d => d.fd === 26)).toMatchObject({ status: 'no_record', sessions: [] });
    expect(mei.days.find(d => d.fd === 27)).toMatchObject({ status: 'no_activity', sessions: [] });
    expect(exerciseHistory(own('iss:crew-mo'), viewer('iss:crew-mo'), at('05:55'), 'all', [], [])?.days[0].status).toBe('no_record');
    expect(Math.abs(mei.comparisons[0].differencePercent!)).toBeLessThan(2);
  });
  it('derives LF FD30 once from received completion/telemetry; rewind restores live readings, means and notices without replay', () => {
    let s = own(OWNER, '10:29');
    expect(exerciseHistory(s, viewer(), at('10:29'), 'all')?.records.some(r => r.fd === 30)).toBe(false);
    s = seek(s, '10:41'); expect(exerciseSessionView(s, OWNER, at('10:41')).points).toHaveLength(12);
    expect(exerciseHistory(s, viewer(), at('10:41'), 'all')?.days.at(-1)?.status).toBe('live');
    s = seek(s, '10:54'); expect(exerciseSessionView(s, OWNER, at('10:54')).current?.workload_w).toBeNull();
    s = seek(s, '11:30');
    const record = exerciseHistory(s, viewer(), at('11:30'), 'all')!.records.at(-1)!;
    expect(record).toMatchObject({ id: EXERCISE_SESSION, fd: 30, durationMinutes: 60, powerMinutes: 57, protocolId: 'demo-live-60.1' });
    const points = exerciseSessionView(s, OWNER, at('11:30')).points.slice(0, -1).filter(p => p.workload_w !== null);
    expect(record.powerW).toBe(points.reduce((sum, p) => sum + p.workload_w!, 0) / 57);
    expect(exerciseHistory(s, viewer(), at('11:29'), 'all')?.records.some(r => r.fd === 30)).toBe(false);
    const delayed = { ...s, exercise: s.exercise.map(row => row.id === EXERCISE_SESSION ? { ...row, finish: { ...row.finish!, receivedAt: '2027-03-10T11:40:00Z' } } : row) };
    expect(exerciseHistory(delayed, viewer(), at('11:39'), 'all')?.records.some(r => r.fd === 30)).toBe(false);
    expect(exerciseHistory(delayed, viewer(), at('11:40'), 'all')?.records.at(-1)?.id).toBe(EXERCISE_SESSION);
    s = previewReduce(s, { type: 'events/announce', owner: OWNER, ids: DAY_EVENTS.map(e => e.id) });
    const memories = s.profiles[OWNER];
    for (let i = 0; i < 3; i++) {
      s = seek(s, '00:00'); expect(exerciseHistory(s, viewer(), at('00:00'), 'all')?.records.some(r => r.fd === 30)).toBe(false);
      s = seek(s, '11:30');
      expect(exerciseHistory(s, viewer(), at('11:30'), 'all')?.records.filter(r => r.id === EXERCISE_SESSION)).toEqual([record]);
      expect(s.profiles[OWNER]).toEqual(memories);
      expect(previewReduce(s, { type: 'events/announce', owner: OWNER, ids: DAY_EVENTS.map(e => e.id) })).toBe(s);
    }
    expect(DAY_EVENTS).toHaveLength(9);
    for (const c of CREW.slice(1)) expect(exerciseHistory(own(c.id, '23:59'), viewer(c.id), at('23:59'), 'all')?.records.some(r => r.fd === 30)).toBe(false);
  });
  it('denies other owners and Ground roles; Ground/Commander projections remain plan-only', () => {
    const s = own(OWNER, '12:00'); expect(exerciseHistory(s, viewer('iss:crew-ti'), at('12:00'), 'all')).toBeNull();
    for (const role of ['mission_operator','medical_professional'] as const) {
      expect(exerciseHistory(s, { perspective: 'ground', role }, at('12:00'), 'all')).toBeNull();
      expect(groundView(s, role, at('12:00'))).toEqual(groundView({ ...s, exercise: [] }, role, at('12:00')));
      expect(groundView(s, role, at('12:00'))?.medicalSummaries).toEqual([]);
    }
    expect(JSON.stringify(commanderView(freshOps(), 'iss:crew-ti', at('12:00')))).not.toMatch(/powerW|cadenceRpm|iss:history:.*exercise|fd30-exercise-history/);
  });
  for (const locale of ['en','es'] as const) it(`renders shared module/Today/Mate records and public-only provenance in ${locale}`, () => {
    const render = (node: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(I18nProvider, { locale, children: node }));
    for (const c of CREW) {
      const s = own(c.id, '12:00'), v = exerciseHistory(s, viewer(c.id), at('12:00'), 'last7')!;
      const latest = EXERCISE_TEXT[locale].latest(`FD${v.latest!.fd}`, '60');
      expect(render(createElement(ExerciseSummary, { state: s, owner: c.id, time: at('12:00') }))).toContain(latest);
      expect(scriptedAnswer(s, c.id, at('12:00'), 'exercise', locale).body).toContain(latest);
      const html = render(createElement(ExerciseHistory, { state: s, owner: c.id, time: at('12:00') }));
      expect(html).toContain(`data-exercise-owner="${c.id}"`); expect(html).toContain('data-exercise-range="last7"');
      expect(html).toContain(EXERCISE_TEXT[locale].demo); expect(html).toContain(EXERCISE_TEXT[locale].table);
    }
    const provenance = render(createElement(ExerciseProvenance));
    expect(provenance).toContain('fd30-exercise-history.1'); expect(provenance).not.toMatch(/iss:history:|powerW|FD29|Lucía|Tomás|Mei/);
    let s = own(OWNER, '11:30'); s = previewReduce(s, { type: 'ask', owner: OWNER, text: 'exercise', lang: locale, now: 1000 });
    const conversation = (time: number) => render(createElement(Fd30Conversation, { profile: s.profiles[OWNER], character: 'Mate', logRef: { current: null }, onAsk: () => {}, onDraft: () => {}, onOpen: () => {}, time }));
    expect(conversation(at('11:29'))).not.toContain('fd-chat-pair'); expect(conversation(at('11:30'))).toContain('fd-chat-pair');
  });
});
