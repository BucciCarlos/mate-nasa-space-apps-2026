import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import iss from '../data/scenario/iss.json';
import { I18nProvider } from '../i18n/I18nProvider';
import { SCHEDULE_TEXT } from '../i18n/fd30Schedule';
import { freshOps, opsReduce, ownCheckins, restoreOps, visibleRequests } from '../views/fd30-ops/opsState';
import { groundView } from '../views/fd30-ops/opsSelectors';
import { Fd30GroundAgenda, groundAgendaLanes } from './Fd30GroundAgenda';
import { Fd30PersonalAgenda } from './Fd30PersonalAgenda';
import { Fd30Timebar } from './Fd30Timebar';
import { CREW, DAY_EVENTS, DAY_START, DAY_END, END, ENTRY, OWNER, freshPreview, nextPreviewEvent, previewReduce, previewTime, projectDomain, receivedPersonalEvents, restorePreview } from './fd30';
import { PLAN_FD30, PLAN_VERSION, planFor, validatePlan } from './fd30Plan';
import { scheduleClock, scheduleContinuation, scheduleInterval } from './fd30Day';
import { SCHEDULE_START, SCHEDULE_END } from './fd30Schedule';

const at = (h: string) => Date.parse(`2027-03-10T${h}:00Z`);
const seek = (s: ReturnType<typeof freshPreview>, target: number) => previewReduce(s, { type: 'seek', now: 1000, target });
describe('DAY01 full FD30, independent plans and snapshot migration', () => {
  it('starts at entry, reaches both day bounds, stops at 23:59 and keeps running after the script ends', () => {
    expect(previewTime(freshPreview(1000), 1000)).toBe(ENTRY);
    expect(previewTime(seek(freshPreview(1000), DAY_START - 100), 1000)).toBe(DAY_START);
    let s = seek(freshPreview(1000), at('11:50'));
    // After Lucía's nine events the next scripted event is Tomás's own sample collection (LAB04); Lucía's nine are all received.
    expect(nextPreviewEvent(s)).toMatchObject({ association: { crewId: 'iss:crew-ti' }, kind: 'lab.sample_taken' });
    expect(s.running).toBe(true);
    expect(previewTime(s, 61000)).toBe(at('11:51'));
    s = seek(s, END - 1000);
    s = previewReduce(s, { type: 'tick', now: 3000 });
    expect(previewTime(s, 999999999)).toBe(END);
    expect(s.running).toBe(false);
    expect(previewReduce(s, { type: 'running/set', now: 3000, running: true }).running).toBe(false);
    expect(previewTime(seek(s, DAY_END), 1000)).toBe(END);
    expect(DAY_END - END).toBe(60000); // DA-1's last selectable instant, no scripted sub-minute final event.
  });
  for (const running of [true, false]) it(`migrates a v5 ${running ? 'running' : 'paused'} cursor without shifting time or private state`, () => {
    let s = seek(freshPreview(1000), at('10:41'));
    s = previewReduce(s, { type: 'ask', owner: OWNER, text: 'my day', lang: 'es', now: 1000 });
    s = previewReduce(s, { type: 'draft', owner: OWNER, text: 'unfinished' });
    s = previewReduce(s, { type: 'position', owner: OWNER, position: { x: .25, y: .6 } });
    s = previewReduce(s, { type: 'events/announce', owner: OWNER, ids: DAY_EVENTS.map(e => e.id) });
    s = previewReduce(s, { type: 'select', crewId: 'iss:crew-mo' });
    const legacy = { ...s, version: 5, running };
    const migrated = restorePreview(JSON.stringify(legacy), 61000);
    expect(migrated.version).toBe(6);
    expect(previewTime(migrated, 61000)).toBe(at(running ? '10:42' : '10:41'));
    expect(migrated.running).toBe(running);
    expect(migrated.activeCrewId).toBe(legacy.activeCrewId);
    expect(migrated.profiles).toEqual(legacy.profiles);
    const expired = restorePreview(JSON.stringify({ ...legacy, running: true }), 99_000_000);
    expect(previewTime(expired, 99_000_000)).toBe(at('12:00')); // old clock's real visible cap
    expect(expired.profiles).toEqual(legacy.profiles);
  });
  it('round-trips signed v6 offsets and hides/restores only due events without repeated IDs/notices', () => {
    let s = seek(freshPreview(1000), at('11:50'));
    s = previewReduce(s, { type: 'events/announce', owner: OWNER, ids: DAY_EVENTS.map(e => e.id) });
    const profiles = s.profiles;
    for (let i = 0; i < 3; i++) {
      s = seek(s, DAY_START);
      expect(s.offsetMs).toBeLessThan(0);
      expect(receivedPersonalEvents(s, OWNER)).toEqual([]);
      expect(s.laboratory.some(sample => sample.result)).toBe(false);
      s = restorePreview(JSON.stringify(s), 1000);
      expect(previewTime(s, 1000)).toBe(DAY_START);
      s = previewReduce(seek(s, at('11:44')), { type: 'next', now: 1000 });
      expect(s.laboratory.filter(sample => sample.result)).toHaveLength(1);
      s = seek(s, at('11:50'));
      expect(s.profiles).toEqual(profiles);
      expect(new Set(s.processedIds).size).toBe(s.processedIds.length);
      expect(s.processedIds).toEqual(projectDomain(at('11:50')).processedIds);
      expect(previewReduce(s, { type: 'events/announce', owner: OWNER, ids: DAY_EVENTS.map(e => e.id) })).toBe(s);
    }
    expect(DAY_EVENTS.filter(e => e.association.crewId === OWNER)).toHaveLength(9); // Lucía's nine are unchanged
    expect(DAY_EVENTS.filter(e => e.association.crewId !== OWNER).map(e => e.association.crewId)).toEqual(['iss:crew-ti', 'iss:crew-ti', 'iss:crew-ti', 'iss:crew-mo', 'iss:crew-mo']);
  });
  it('preserves every previous block and adds distinct non-overlapping plans through the visual boundary', () => {
    expect(PLAN_VERSION).toBe('fd30-plan.2');
    expect(validatePlan(PLAN_FD30)).toBe(true);
    for (const old of iss.blocks.filter(b => Date.parse(b.end) > ENTRY)) {
      expect(PLAN_FD30.find(b => b.id === old.id)).toMatchObject({ ...old, movable: false });
    }
    expect(SCHEDULE_START).toBe(DAY_START); expect(SCHEDULE_END).toBe(DAY_END);
    expect(groundAgendaLanes().map(l => l.blocks.map(b => b.id))).toEqual(CREW.map(c => planFor(c.id).map(b => b.id)));
    for (const c of CREW) {
      const blocks = planFor(c.id), rest = blocks.at(-1)!;
      expect(rest).toMatchObject({ continuesAfterDay: true, kind: 'sleep' });
      expect(Date.parse(rest.end)).toBe(DAY_END);
      expect(blocks.some(b => b.start === '2027-03-10T18:00:00Z')).toBe(true);
      expect(blocks.every(b => Date.parse(b.end) <= DAY_END)).toBe(true);
      expect(scheduleInterval(rest)).toBe('21:30–24:00 UTC');
      expect(scheduleInterval(blocks[0])).toBe('00:00–06:00 UTC');
      expect(scheduleClock(DAY_END)).toBe('24:00');
      for (const locale of ['en','es'] as const) {
        expect(scheduleContinuation(rest, SCHEDULE_TEXT[locale])).toBe(SCHEDULE_TEXT[locale].continues);
        expect(scheduleContinuation(blocks[0], SCHEDULE_TEXT[locale])).toBe(SCHEDULE_TEXT[locale].fromPrevious);
      }
    }
  });
  for (const time of [at('02:00'), at('13:00'), END]) it(`saves and restores the private journal and operational requests at ${time}`, () => {
    let journal = opsReduce(freshOps(), { type: 'wellbeing/draft', owner: OWNER, topic: 'day', text: 'private' }, OWNER, time);
    journal = opsReduce(journal, { type: 'wellbeing/save', owner: OWNER, lang: 'es' }, OWNER, time);
    journal = opsReduce(journal, { type: 'request/draft', owner: OWNER, kind: 'support', text: 'please help', blockId: planFor(OWNER).at(-1)!.id }, OWNER, time);
    journal = opsReduce(journal, { type: 'request/preview', owner: OWNER, lang: 'en' }, OWNER, time);
    const id = journal.profiles[OWNER].preview!.id;
    journal = opsReduce(journal, { type: 'request/send', owner: OWNER, previewId: id }, OWNER, time);
    expect(restoreOps(JSON.stringify(journal))).toEqual(journal);
    expect(ownCheckins(journal, OWNER, time)).toHaveLength(1);
    expect(ownCheckins(journal, OWNER, time-1)).toHaveLength(0);
    expect(visibleRequests(journal, 'iss:crew-ti', time)).toHaveLength(1);
    expect(visibleRequests(journal, 'iss:crew-ti', time-1)).toHaveLength(0);
    expect(opsReduce(journal, { type: 'wellbeing/draft', owner: OWNER, topic: 'day', text: 'late foreign' }, 'iss:crew-mo', time)).toBe(journal);
    for (const role of ['mission_operator', 'medical_professional'] as const) {
      expect(groundView(seek(freshPreview(1000), time), role, time)).toEqual(groundView(freshPreview(1000), role, time));
    }
  });
  for (const locale of ['en', 'es'] as const) it(`renders both midnight boundaries and planned continuation without FD31 records in ${locale}`, () => {
    const state = seek(freshPreview(1000), DAY_START);
    const html = (node: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(I18nProvider, { locale, children: node }));
    for (const owner of CREW.map(c => c.id)) {
      const personal = html(createElement(Fd30PersonalAgenda, { state, owner, time: DAY_START }));
      expect(personal).toContain('24:00');
      expect(personal).toContain(SCHEDULE_TEXT[locale].continues);
      expect(personal).toContain(SCHEDULE_TEXT[locale].fromPrevious);
    }
    const ground = html(createElement(Fd30GroundAgenda, { time: DAY_START }));
    expect(ground).toContain('gat-now-chip');
    expect(ground).toContain('00:00–06:00 UTC');
    expect(ground).toContain('21:30–24:00 UTC');
    expect(ground).not.toMatch(/09 Mar|9 mar|2027-03-11|Blood collection|Toma de sangre/);
    const clock = html(createElement(Fd30Timebar, { state, time: DAY_START, dispatch: () => {}, onSeek: () => {} }));
    expect(clock).toContain(`min="${DAY_START}"`); expect(clock).toContain(`max="${END}"`);
    expect(clock).toContain('00:00 UTC, FD30');
  });
});
