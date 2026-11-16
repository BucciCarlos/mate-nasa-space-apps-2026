import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CREW, DAY_EVENTS, DAY_START, OWNER, freshPreview, previewReduce } from '../fd30';
import { groundView, commanderView } from '../../views/fd30-ops/opsSelectors';
import { freshOps } from '../../views/fd30-ops/opsState';
import { planFor } from '../fd30Plan';
import { I18nProvider } from '../../i18n/I18nProvider';
import { SleepDetail } from '../../views/history/sleep/SleepDetail';
import { SleepSummary } from '../../views/history/sleep/SleepSummary';
import { SleepProvenance } from '../../views/history/sleep/SleepProvenance';
import { SLEEP_TEXT } from '../../views/history/sleep/sleepText';
import { scriptedAnswer } from '../fd30Chat';
import { SLEEP_SCORE_TEXT } from '../../views/history/sleep/sleepScoreText';
import { sleepScoreDetail } from './sleepScore';
import { SLEEP_RECORDS, fdDate, medianMinutes, sleepDuration, sleepHistory, sleepSegments } from './sleep';
import type { SleepViewer } from './sleep';

const at = (h: string) => Date.parse(`2027-03-10T${h}:00Z`);
const seek = (s: ReturnType<typeof freshPreview>, h: string) => previewReduce(s, { type: 'seek', now: 1000, target: at(h) });
const viewer = (owner: typeof CREW[number]['id'] = OWNER): SleepViewer => ({ perspective: 'onboard', owner });
const own = (owner: typeof CREW[number]['id'], h = '05:55') => previewReduce(seek(freshPreview(1000, 1), h), { type: 'select', crewId: owner });

describe('HIST01 canonical fictional sleep records', () => {
  it('has distinct, stable private records; omissions emit no rows and no clinical extras', () => {
    expect(new Set(SLEEP_RECORDS.map(r => r.id)).size).toBe(SLEEP_RECORDS.length);
    expect(SLEEP_RECORDS).toHaveLength(85);
    for (const r of SLEEP_RECORDS) {
      expect(r.durationMinutes).toBeGreaterThan(0); expect(r.durationMinutes).toBeLessThan(600);
      expect(r.fd).toBeGreaterThanOrEqual(1); expect(r.fd).toBeLessThanOrEqual(30);
      expect(r.occurredAt.slice(0, 10)).toBe(fdDate(r.fd));
      expect(Date.parse(r.receivedAt)).toBeGreaterThanOrEqual(Date.parse(r.occurredAt));
      expect(r.source.dataClass).toBe('fictional_fd30'); expect(r.source.scope).toBe('crew_private');
      expect(r.source.unit).toBe('min');
      expect(Object.keys(r).sort()).toEqual(['durationMinutes','fd','id','occurredAt','owner','receivedAt','source', ...(r.fd === 30 ? ['eventId'] : [])].sort());
    }
    const lucia = SLEEP_RECORDS.filter(r => r.owner === OWNER);
    expect(lucia.slice(-3).map(r => r.durationMinutes)).toEqual([405,395,385]);
    const base = medianMinutes(lucia.filter(r => r.fd < 28))!;
    expect(lucia.slice(-3).every(r => base - r.durationMinutes >= 40 && base - r.durationMinutes <= 90)).toBe(true);
    expect(SLEEP_RECORDS.filter(r => r.owner === 'iss:crew-mo')).toHaveLength(28);
    expect(SLEEP_RECORDS.some(r => r.owner === 'iss:crew-mo' && r.fd === 27)).toBe(false);
    expect(new Set(CREW.map(c => JSON.stringify(SLEEP_RECORDS.filter(r => r.owner === c.id).map(r => r.durationMinutes)))).size).toBe(3);
    expect(fdDate(1)).toBe('2027-02-09'); expect(fdDate(30)).toBe('2027-03-10');
    expect(sleepDuration(479.5)).toBe('8:00');
  });
  it('uses exactly FD24–FD30 for seven days and filters cursor before window and median', () => {
    const s = own(OWNER), seven = sleepHistory(s, viewer(), at('05:55'), 'last7')!, all = sleepHistory(s, viewer(), at('05:55'), 'all')!;
    expect(seven.days.map(d => d.fd)).toEqual([24,25,26,27,28,29,30]);
    expect(seven.records).toHaveLength(6); expect(all.days).toHaveLength(30); expect(all.records).toHaveLength(27);
    expect(all.records.every(r => r.fd < 30)).toBe(true);
    expect(all.medianMinutes).toBe(medianMinutes(all.records));
    expect(all.days.filter(d => d.status === 'no_record').map(d => d.fd)).toEqual([10,19]);
    expect(seven.days.at(-1)).toMatchObject({ fd: 30, record: null, status: 'not_received' });
    const snapshot = JSON.stringify(s); sleepHistory(s, viewer(), at('05:55'), 'all');
    expect(JSON.stringify(s)).toBe(snapshot);
    const future = { ...SLEEP_RECORDS[0], id: 'iss:future-test', fd: 24, durationMinutes: 1, occurredAt: '2027-03-10T11:00:00Z', receivedAt: '2027-03-10T11:30:00Z' };
    expect(sleepHistory(s, viewer(), at('11:15'), 'all', [future])?.records).toEqual([]);
    expect(sleepHistory(s, viewer(), at('11:30'), 'all', [future])?.records).toEqual([future]);
    expect(sleepHistory(s, viewer(), at('11:00'), 'all', [{ ...future, occurredAt: '2027-03-10T11:30:00Z', receivedAt: '2027-03-10T11:00:00Z' }])?.records).toEqual([]);
  });
  it('does not turn a planned end into a record; uses the existing received wake and preserves nine events', () => {
    const raw = freshPreview(1000, 1), plan = planFor(OWNER).find(b => b.kind === 'sleep')!;
    expect(plan.end).toBe('2027-03-10T06:00:00Z');
    expect(sleepHistory(raw, viewer(), at('06:00'), 'all')?.records.some(r => r.fd === 30)).toBe(false);
    let s = seek(raw, '06:00');
    s = previewReduce(s, { type: 'events/announce', owner: OWNER, ids: DAY_EVENTS.map(e => e.id) });
    const announced = s.profiles[OWNER].announcedIds;
    for (let i = 0; i < 3; i++) {
      s = seek(s, '00:00');
      expect(sleepHistory(s, viewer(), DAY_START, 'all')?.records).toHaveLength(27);
      s = seek(s, '05:59'); expect(sleepHistory(s, viewer(), at('05:59'), 'all')?.records).toHaveLength(27);
      s = seek(s, '06:00'); expect(sleepHistory(s, viewer(), at('06:00'), 'all')?.records).toHaveLength(28);
      expect(sleepHistory(s, viewer(), at('05:59'), 'all')?.records).toHaveLength(27);
      expect(s.profiles[OWNER].announcedIds).toEqual(announced);
      expect(previewReduce(s, { type: 'events/announce', owner: OWNER, ids: DAY_EVENTS.map(e => e.id) })).toBe(s);
    }
    expect(DAY_EVENTS.filter(e => e.association.crewId === OWNER)).toHaveLength(9); // Lucía's nine unchanged; LAB04 adds only other owners' lab events
    expect(DAY_EVENTS.filter(e => e.kind === 'sleep.episode_ended')).toHaveLength(1);
    for (const c of CREW.slice(1)) expect(sleepHistory(own(c.id, '23:59'), viewer(c.id), at('23:59'), 'all')?.records.some(r => r.fd === 30)).toBe(false);
  });
  it('keeps missing nights out of the median and splits the trend at each gap', () => {
    const s = own('iss:crew-mo', '12:00'), view = sleepHistory(s, viewer('iss:crew-mo'), at('12:00'), 'last7')!;
    expect(view.records).toHaveLength(5);
    expect(view.medianMinutes).toBe(443);
    expect(sleepSegments(view.days).map(segment => segment.map(r => r.fd))).toEqual([[24,25,26],[28,29]]);
    expect(view.days.find(d => d.fd === 27)?.record).toBeNull();
  });
  it('denies foreign owners and both Ground roles, whose projections remain invariant', () => {
    const s = own(OWNER, '12:00');
    expect(sleepHistory(s, viewer('iss:crew-ti'), at('12:00'), 'all')).toBeNull();
    for (const role of ['mission_operator','medical_professional'] as const) {
      expect(sleepHistory(s, { perspective: 'ground', role }, at('12:00'), 'all')).toBeNull();
      expect(groundView(s, role, at('12:00'))).toEqual(groundView(freshPreview(1000, 1), role, at('12:00')));
      expect(groundView(s, role, at('12:00'))?.medicalSummaries).toEqual([]);
    }
    expect(JSON.stringify(commanderView(freshOps(), 'iss:crew-ti', at('12:00')))).not.toMatch(/durationMinutes|fd30-sleep|iss:sleep:|sleepRecords/);
  });
  for (const locale of ['en','es'] as const) it(`shares the same records with Today and Mate and renders private/absent states in ${locale}`, () => {
    const render = (node: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(I18nProvider, { locale, children: node }));
    for (const c of CREW) {
      const s = own(c.id, '06:00'), h = sleepHistory(s, viewer(c.id), at('06:00'), 'last7')!;
      const summary = render(createElement(SleepSummary, { state: s, owner: c.id, time: at('06:00') }));
      expect(summary).toContain(SLEEP_TEXT[locale].latest(`FD${h.latest!.fd}`, sleepDuration(h.latest!.durationMinutes)));
      // SLEEP-VOICE03: Mate shows the night, duration and score from the same record and calculation as the detail; no score when unavailable.
      const night = `FD${h.latest!.fd}`, length = sleepDuration(h.latest!.durationMinutes), calc = sleepScoreDetail(s, viewer(c.id), at('06:00'), h.latest!.fd)!, st = SLEEP_SCORE_TEXT[locale];
      expect(scriptedAnswer(s, c.id, at('06:00'), 'sleep', locale).body).toBe(`${calc.score ? st.chatScore(night, length, calc.score.display) : st.chatNoScore(night, length, st.chatReason[calc.reason!])}\n${st.chatCount(h.records.length)}`);
      const detail = render(createElement(SleepDetail, { state: s, owner: c.id, time: at('06:00') }));
      expect(detail).toContain(`data-sleep-owner="${c.id}"`);
      expect(detail).toContain('data-sleep-range="last7"');
      expect(detail).toContain(SLEEP_TEXT[locale].demo);
      if (c.id !== OWNER) expect(detail).toContain(SLEEP_TEXT[locale].noPlan); // no invented historical plans
      else expect(detail).toContain('2027-03-09 · 21:30 UTC');
      expect(detail).not.toMatch(/sleep\.score|clinical|NASA|barger|phase|stress/);
    }
    const provenance = render(createElement(SleepProvenance));
    expect(provenance).toContain('fd30-sleep.1');
    expect(provenance).not.toMatch(/iss:sleep:|durationMinutes|385|FD27|Mei Okada|Lucía Ferraro/);
  });
});
