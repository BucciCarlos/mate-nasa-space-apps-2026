import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FD30_KEY, OWNER, freshPreview, previewReduce, previewTime } from '../../demo/fd30';
import { parseRoute, toHash } from '../../app/routes';
import { AppProvider } from '../../state/AppProvider';
import { Fd30Preview } from '../../demo/Fd30Preview';
import { plannedExercise } from '../../demo/fd30Plan';
import { createInitialState } from '../../state/initialState';
import { I18nProvider } from '../../i18n/I18nProvider';
import type { Locale } from '../../state/types';
import { COMMANDER, freshOps, opsReduce, ownCheckins, restoreOps, visibleRequests } from './opsState';
import type { Checkin, OpsAction, OpsState } from './opsState';
import { commanderView, groundView, operationalCrew } from './opsSelectors';
import { GroundOverview } from './GroundOverview';
import { CommanderView } from './CommanderView';
import { WellbeingView } from './WellbeingView';
import { RequestsView } from './RequestsView';
import { OpsNavigation } from './OpsNavigation';
import { FD30_PUBLIC_TEXT } from '../../demo/fd30PublicText';

const at = (value: string) => Date.parse(`2027-03-10T${value}:00Z`);
const time = at('10:41');
const html = (element: ReturnType<typeof createElement>, locale: Locale) => renderToStaticMarkup(createElement(I18nProvider, { locale, children: element }));
const apply = (s: OpsState, a: OpsAction) => opsReduce(s, a, OWNER, time);
function withDraft() {
  return apply(freshOps(), { type: 'request/draft', owner: OWNER, kind: 'support', blockId: plannedExercise(OWNER)!.id, text: '  exact operational message\nsecond line  ' });
}
function withPreview() { return apply(withDraft(), { type: 'request/preview', owner: OWNER, lang: 'es' }); }
function shared() { const s = withPreview(); return apply(s, { type: 'request/send', owner: OWNER, previewId: s.profiles[OWNER].preview!.id }); }

describe('OPS01 voluntary private context and explicit sharing', () => {
  it('saves only an owner-scoped qualitative entry; no request or clinical field is generated', () => {
    const initial = freshOps();
    let s = apply(initial, { type: 'wellbeing/draft', owner: OWNER, topic: 'day', text: 'PRIVATE_CHECKIN' });
    expect(s.requests).toEqual([]); expect(s.profiles[OWNER].checkins).toEqual([]);
    s = apply(s, { type: 'wellbeing/save', owner: OWNER, lang: 'es' });
    expect(ownCheckins(s, OWNER, time)[0]).toMatchObject({ text: 'PRIVATE_CHECKIN', lang: 'es', topic: 'day' });
    expect(Object.keys(ownCheckins(s, OWNER, time)[0]).sort()).toEqual(['at', 'id', 'lang', 'owner', 'text', 'topic']);
    expect(ownCheckins(s, COMMANDER, time)).toEqual([]);
    expect(ownCheckins(s, OWNER, time - 1)).toEqual([]);
    expect(s.requests).toEqual([]);
    expect(apply(s, { type: 'wellbeing/save', owner: OWNER, lang: 'es' })).toBe(s);
    expect(initial.profiles[OWNER].checkins).toEqual([]);
  });
  it('discards stale-owner writes instead of retargeting them; cancel and skip do not create an entry', () => {
    const s = freshOps();
    expect(opsReduce(s, { type: 'wellbeing/draft', owner: OWNER, topic: 'leisure', text: 'old owner' }, COMMANDER, time)).toBe(s);
    expect(opsReduce(s, { type: 'request/preview', owner: OWNER, lang: 'en' }, COMMANDER, time)).toBe(s);
    const draft = apply(s, { type: 'wellbeing/draft', owner: OWNER, topic: 'leisure', text: 'optional' });
    const cancelled = apply(draft, { type: 'wellbeing/cancel', owner: OWNER });
    expect(cancelled.profiles[OWNER].wellbeing.text).toBe(''); expect(cancelled.profiles[OWNER].checkins).toEqual([]);
  });
  it('requires exact-message preview and explicit send; never attaches a private entry or chat', () => {
    let s = withDraft();
    s.profiles[OWNER].wellbeing.text = 'PRIVATE_NOTE';
    s = apply(s, { type: 'wellbeing/save', owner: OWNER, lang: 'en' });
    expect(apply(s, { type: 'request/send', owner: OWNER, previewId: 'missing' })).toBe(s);
    s = apply(s, { type: 'request/preview', owner: OWNER, lang: 'es' });
    const preview = s.profiles[OWNER].preview!;
    expect(preview).toMatchObject({ owner: OWNER, recipient: COMMANDER, text: '  exact operational message\nsecond line  ', lang: 'es' });
    expect(JSON.stringify(preview)).not.toContain('PRIVATE_NOTE');
    const delivered = apply(s, { type: 'request/send', owner: OWNER, previewId: preview.id });
    expect(delivered.requests).toHaveLength(1);
    expect(delivered.requests[0]).toEqual({ ...preview, sentAt: time });
    expect(apply(delivered, { type: 'request/send', owner: OWNER, previewId: preview.id })).toBe(delivered);
    expect(Object.keys(delivered.requests[0]).sort()).toEqual(['blockId', 'end', 'id', 'kind', 'lang', 'owner', 'recipient', 'sentAt', 'start', 'text', 'title']);
  });
  it('invalidates preview on editing and cannot send another person’s task or send as a stale owner', () => {
    const s = withPreview(), id = s.profiles[OWNER].preview!.id;
    const edited = apply(s, { type: 'request/draft', owner: OWNER, kind: 'support', blockId: plannedExercise(OWNER)!.id, text: 'changed' });
    expect(edited.profiles[OWNER].preview).toBeNull();
    expect(apply(edited, { type: 'request/send', owner: OWNER, previewId: id })).toBe(edited);
    expect(opsReduce(s, { type: 'request/send', owner: OWNER, previewId: id }, 'iss:crew-mo', time)).toBe(s);
    expect(apply(s, { type: 'request/draft', owner: OWNER, kind: 'support', blockId: plannedExercise('iss:crew-mo')!.id, text: 'wrong task' })).toBe(s);
  });
  it('delivers only to sender and named commander, and hides a sent message on rewind without duplicating it', () => {
    const s = shared();
    expect(visibleRequests(s, OWNER, time)).toHaveLength(1); expect(visibleRequests(s, COMMANDER, time)).toHaveLength(1);
    expect(visibleRequests(s, 'iss:crew-mo', time)).toEqual([]); expect(visibleRequests(s, COMMANDER, time - 1)).toEqual([]);
    expect(visibleRequests(s, COMMANDER, time + 1)).toHaveLength(1); expect(s.requests).toHaveLength(1);
  });
  it('restores private drafts, entry language and immutable sent messages without accepting M1 snapshots', () => {
    const s = shared(); s.profiles[OWNER].wellbeing.text = 'unsent';
    expect(restoreOps(JSON.stringify(s))).toEqual(s);
    expect(restoreOps(JSON.stringify(createInitialState(1000, 'es')))).toEqual(freshOps());
    expect(restoreOps('bad JSON')).toEqual(freshOps());
    const bad = JSON.parse(JSON.stringify(s)); bad.requests[0].recipient = 'iss:crew-mo';
    expect(restoreOps(JSON.stringify(bad))).toEqual(freshOps());
    expect(opsReduce(s, { type: 'reset' }, OWNER, time)).toEqual(freshOps());
  });
});

describe('OPS01 role projections, planned progress and rewind', () => {
  it('keeps both perspectives in the same FD30 route/session family and preserves M1 route meanings', () => {
    for (const page of ['today', 'ground', 'crew', 'wellbeing', 'requests'] as const) {
      expect(parseRoute(toHash({ view: 'fd30', page }))).toEqual({ view: 'fd30', page });
    }
    expect(toHash({ view: 'fd30', page: 'ground' })).toBe('#/demo/fd30/ground');
    expect(parseRoute('#/ground/iss/agenda')).toEqual({ view: 'ground', missionId: 'iss', page: 'agenda' });
    expect(parseRoute('#/onboard/agenda')).toEqual({ view: 'onboard', page: 'agenda' });
    expect(parseRoute('#/onboard/personal/evidence')).toEqual({ view: 'fd30', page: 'evidence' });
    expect(parseRoute('#/onboard/personal/ground')).toBeNull();
  });
  it('gates Crew by the fixed commander ID, without leaking private journal fields', () => {
    const s = shared(); s.profiles[OWNER].wellbeing.text = 'PRIVATE_DRAFT';
    expect(commanderView(s, OWNER, time)).toBeNull(); expect(commanderView(s, 'iss:crew-mo', time)).toBeNull();
    const projected = commanderView(s, COMMANDER, time)!;
    expect(projected.crew).toHaveLength(3); expect(projected.requests).toHaveLength(1);
    expect(JSON.stringify(projected)).not.toContain('PRIVATE_DRAFT');
    expect(JSON.stringify(projected)).not.toMatch(/pulse_bpm|checkins|laboratory|conversation|wellbeing/);
  });
  it('makes both Ground roles independent of all personal FD30 records, including source event existence', () => {
    const baseline = freshPreview(1000), privateState = previewReduce(baseline, { type: 'seek', target: at('11:45'), now: 1000 });
    privateState.profiles[OWNER].draft = 'PRIVATE_CHAT';
    privateState.profiles[OWNER].turns = [{ text: 'PRIVATE_CHAT', lang: 'en', reply: 'laboratory' }];
    for (const role of ['mission_operator', 'medical_professional'] as const) {
      const a = groundView(baseline, role, time), b = groundView(privateState, role, time);
      expect(a).toEqual(b); expect(b?.medicalSummaries).toEqual([]);
      expect(JSON.stringify(b)).not.toMatch(/PRIVATE_CHAT|pulse_bpm|analysis_started|sample-lf|episode|checkins/);
    }
  });
  it('uses half-open planned intervals for current activity and a time fraction, never measured exercise progress', () => {
    const during = operationalCrew(time);
    expect(during[0].current?.title.en).toBe('Ergometer reservation'); expect(during[0].progress).toBe(18);
    expect(during[1].current?.title.en).toBe('Treadmill reservation'); expect(during[1].progress).toBe(18);
    expect(during[2].current?.title.en).toBe('Payload operations'); expect(during[2].progress).toBe(12);
    expect(during[2].reservation?.start).toContain('13:00');
    expect(operationalCrew(at('11:30'))[0].current).toBeNull();
    expect(operationalCrew(at('10:29'))[0].current?.kind).toBe('conference');
    expect(operationalCrew(at('09:16'))[0].current?.title.en).toBe('Planned personal activity');
  });
  it('projections preserve the single shared clock, selected profile, position and M1 snapshot', () => {
    let state = previewReduce(freshPreview(1000), { type: 'seek', target: time, now: 1000 });
    state = previewReduce(state, { type: 'select', crewId: COMMANDER });
    state = previewReduce(state, { type: 'position', owner: COMMANDER, position: { x: .2, y: .4 } });
    const snapshot = JSON.stringify(state), m1 = createInitialState(1000, 'es'), m1Snapshot = JSON.stringify(m1);
    const before = previewTime(state, 1000);
    groundView(state, 'mission_operator', before); commanderView(shared(), COMMANDER, before); groundView(state, 'medical_professional', before);
    expect(JSON.stringify(state)).toBe(snapshot); expect(state.activeCrewId).toBe(COMMANDER); expect(previewTime(state, 1000)).toBe(before);
    expect(JSON.stringify(m1)).toBe(m1Snapshot);
  });
});

describe('OPS01 bilingual rendering and absence states', () => {
  for (const locale of ['en', 'es'] as const) {
    it(`renders three fictional portraits and only operational content in ${locale}`, () => {
      for (const role of ['mission_operator', 'medical_professional'] as const) {
        const out = html(createElement(GroundOverview, { data: groundView(freshPreview(0), role, time), onRole: () => {} }), locale);
        expect(out.match(/data-ops-card=/g)).toHaveLength(3); expect(out.match(/class="ops-portrait"/g)).toHaveLength(3);
        expect(out).not.toMatch(/pulse_bpm|PRIVATE_|data-session|data-sample|Inspiration4|C001/);
        expect(out).toContain(locale === 'es' ? 'bloque planificado' : 'planned block');
      }
    });
    it(`denies noncommander content and keeps private notes out of the request preview in ${locale}`, () => {
      const denied = html(createElement(CommanderView, { data: null }), locale);
      expect(denied).not.toContain('data-commander-person'); expect(denied).not.toContain('exact operational message');
      const ops = withPreview(), p = ops.profiles[OWNER];
      const out = html(createElement(RequestsView, { owner: OWNER, draft: p.request, preview: p.preview, requests: [], onAction: () => {} }), locale);
      expect(out).toContain('exact operational message'); expect(out).toContain('Tomás Ibarra');
      expect(out).not.toContain('PRIVATE_CHECKIN');
      const cross = html(createElement(RequestsView, { owner: 'iss:crew-mo', draft: ops.profiles['iss:crew-mo'].request, preview: p.preview, requests: [], onAction: () => {} }), locale);
      expect(cross).not.toContain('exact operational message');
      const entry: Checkin = { id: 'iss:ops:checkin:1', owner: OWNER, topic: 'day', text: 'PRIVATE_CHECKIN', lang: locale, at: time };
      const privateOut = html(createElement(WellbeingView, { owner: 'iss:crew-mo', draft: ops.profiles['iss:crew-mo'].wellbeing, entries: [entry], onAction: () => {}, onSkip: () => {} }), locale);
      expect(privateOut).not.toContain('PRIVATE_CHECKIN');
    });
    it(`offers Crew navigation only to the commander in ${locale}`, () => {
      const ordinary = html(createElement(OpsNavigation, { owner: OWNER, page: 'wellbeing' }), locale);
      const commander = html(createElement(OpsNavigation, { owner: COMMANDER, page: 'crew' }), locale);
      expect(ordinary).not.toContain('href="#/onboard/personal/crew"');
      expect(commander).toContain('href="#/onboard/personal/crew"');
      expect(ordinary).not.toContain('href="#/demo/fd30/ground"');
    });
    it(`mounts Ground inside FD30 without private identity controls, chat, notices or source-event labels in ${locale}`, () => {
      let session = previewReduce(freshPreview(1000), { type: 'seek', target: time, now: 1000 });
      session = previewReduce(session, { type: 'running/set', running: false, now: 1000 });
      session.profiles[OWNER].draft = 'PRIVATE_CHAT';
      vi.stubGlobal('window', { sessionStorage: { getItem: (key: string) => key === FD30_KEY ? JSON.stringify(session) : null } });
      try {
        const out = renderToStaticMarkup(createElement(AppProvider, { children: createElement(I18nProvider, { locale,
          children: createElement(Fd30Preview, { page: 'ground' }) }) }));
        expect(out).toContain('data-surface="ground"');
        const demo = out.split('<section class="fd-demo"')[1].split('<div class="fd-workspace"')[0];
        expect(demo).toContain(FD30_PUBLIC_TEXT[locale].switchToOnboard);
        expect(demo.match(/fd-perspective-switch/g)).toHaveLength(1);
        expect(demo.match(/fd-secondary-link/g)).toHaveLength(1);
        expect(out).not.toContain('ops-perspective');
        expect(out).toContain('10:41');
        expect(out.match(/data-ops-card=/g)).toHaveLength(3);
        expect(out).not.toMatch(/PRIVATE_CHAT|fd-view-as|fd-character|id="fd-ask"|role="status"|lab.sample|sample-lf|exercise.finished/);
      } finally { vi.unstubAllGlobals(); }
    });
  }
});
