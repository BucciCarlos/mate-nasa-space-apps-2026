import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/state/initialState';
import { reduce } from '../src/state/reducer';
import { selectGroundCrew, selectGroundInbox, selectGroundLinkRows, selectGroundLog, selectGroundPlan } from '../src/state/selectors';
import type { AppState, GroundRole } from '../src/state/types';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';

const T0 = 1_000_000;
const ROLES: GroundRole[] = ['mission_operator', 'medical_professional'];
const PRIVATE = 'Me cuesta dormir con cambios de horario.';
const COMMENT = 'Please review my schedule.';

function scenario(linkDown: boolean): AppState {
  let s = createInitialState(T0);
  s = reduce(s, { type: 'plan/change_sent', missionId: 'iss', taskId: 'iss:blk-16', advanceMinutes: 90, nowMs: T0 });
  s = reduce(s, { type: 'clock/tick', nowMs: T0 + 5000 });
  s = reduce(s, { type: 'companion/asked', missionId: 'iss', input: { mode: 'text', text: { text: 'what changed', lang: 'en' }, intent: 'schedule.what_changed' }, nowMs: T0 + 6000 });
  if (linkDown) s = reduce(s, { type: 'link/status_set', missionId: 'iss', status: 'down', nowMs: T0 + 6500 });
  s = reduce(s, {
    type: 'observation/saved', missionId: 'iss', crewId: 'iss:crew-lf', topics: ['rest'],
    privateNote: { text: PRIVATE, lang: 'es' }, relatedChangeId: 'iss:chg-1', share: { comment: { text: COMMENT, lang: 'en' } }, nowMs: T0 + 7000,
  });
  return s;
}

function groundOutputs(s: AppState, role: GroundRole) {
  return { link: selectGroundLinkRows(s, 'iss', role), inbox: selectGroundInbox(s, 'iss', role), crew: selectGroundCrew(s, 'iss', role), log: selectGroundLog(s, 'iss', role), plan: selectGroundPlan(s, 'iss', role) };
}
const json = (v: unknown) => JSON.stringify(v);

describe('U-ROLE-01', () => {
  it('Ground selector outputs never contain private notes, observations, conversation turns or notices', () => {
    const s = scenario(false);
    const final = reduce(s, { type: 'clock/tick', nowMs: T0 + 20_000 });
    for (const st of [s, final]) for (const role of ROLES) {
      const out = json(groundOutputs(st, role));
      expect(out).not.toContain(PRIVATE);
      expect(out).not.toContain('privateNote');
      expect(out).not.toContain('iss:obs-');
      expect(out).not.toContain('iss:turn-');
      expect(out).not.toContain('iss:ntc-');
      expect(out).not.toContain('"speaker"');
    }
  });
});

describe('U-ROLE-02', () => {
  it('operator inbox items contain no topics or comment', () => {
    const s = reduce(scenario(false), { type: 'clock/tick', nowMs: T0 + 20_000 });
    const inbox = selectGroundInbox(s, 'iss', 'mission_operator');
    expect(inbox).toHaveLength(1);
    expect(inbox[0].kind).toBe('restricted');
    expect(json(inbox)).not.toContain('"rest"');
    expect(json(inbox)).not.toContain('topics');
    expect(json(inbox)).not.toContain(COMMENT);
    expect(inbox[0].crewId).toBe('iss:crew-lf');
  });
});

describe('U-ROLE-03 downlink content before delivery (02 §9.4)', () => {
  it('queued, in transit, queued after a cut: no content for either role; delivered: medical only', () => {
    const summaryId = 'iss:sum-';
    const check = (st: AppState, label: string) => {
      const msg = st.missions.iss.messages.find((m) => m.kind === 'crew_summary')!;
      expect(msg.status, label).not.toBe('delivered');
      for (const role of ROLES) {
        const o = groundOutputs(st, role);
        const all = json([o.link, o.inbox, o.log]);
        expect(all, label).not.toContain(COMMENT);
        expect(all, label).not.toContain('"rest"');
        expect(all, label).not.toContain(summaryId);
        expect(json(o.link.filter((r) => r.direction === 'downlink')), label).not.toContain('iss:crew-lf');
        expect(json(o.link.filter((r) => r.direction === 'downlink')), label).not.toContain('iss:chg-1');
        expect(o.inbox, label).toHaveLength(0);
        for (const t of [en, es]) {
          const row = t.ground.downlinkPending;
          expect(row).not.toContain(t.topics.rest);
          expect(row).not.toContain(COMMENT);
        }
      }
    };
    const queued = scenario(true);
    check(queued, 'queued');
    let s = reduce(queued, { type: 'link/status_set', missionId: 'iss', status: 'up', nowMs: T0 + 8000 });
    check(s, 'in_transit');
    s = reduce(s, { type: 'link/status_set', missionId: 'iss', status: 'down', nowMs: T0 + 9000 });
    check(s, 'queued again');
    s = reduce(s, { type: 'link/status_set', missionId: 'iss', status: 'up', nowMs: T0 + 10_000 });
    s = reduce(s, { type: 'clock/tick', nowMs: T0 + 30_000 });
    const med = selectGroundInbox(s, 'iss', 'medical_professional');
    expect(med).toHaveLength(1);
    expect(med[0].kind === 'medical' && med[0].topics).toEqual(['rest']);
    expect(med[0].kind === 'medical' && med[0].comment?.text).toBe(COMMENT);
    expect(json(med)).not.toContain(PRIVATE);
    const op = selectGroundInbox(s, 'iss', 'mission_operator');
    expect(op[0].kind).toBe('restricted');
    expect(json(op)).not.toContain(COMMENT);
    expect(op[0].crewId).toBe('iss:crew-lf');
    expect(op[0].receivedAtMs).toBeGreaterThan(0);
  });
});

describe('U-OBS-01', () => {
  it('save without sharing → no message; with sharing → one message without the private note', () => {
    const s0 = createInitialState(T0);
    const a = reduce(s0, { type: 'observation/saved', missionId: 'iss', crewId: 'iss:crew-lf', topics: ['wellbeing'], privateNote: { text: PRIVATE, lang: 'es' }, relatedChangeId: null, share: null, nowMs: T0 });
    expect(a.missions.iss.messages).toHaveLength(0);
    expect(a.missions.iss.onboard.observations[0].sharedSummaryId).toBeNull();
    const b = reduce(s0, { type: 'observation/saved', missionId: 'iss', crewId: 'iss:crew-lf', topics: ['wellbeing'], privateNote: { text: PRIVATE, lang: 'es' }, relatedChangeId: null, share: { comment: null }, nowMs: T0 });
    expect(b.missions.iss.messages).toHaveLength(1);
    expect(json(b.missions.iss.messages[0])).not.toContain(PRIVATE);
    expect(b.missions.iss.onboard.observations[0].sharedSummaryId).toBe('iss:sum-2');
    const c = reduce(s0, { type: 'observation/saved', missionId: 'iss', crewId: 'iss:crew-lf', topics: [], privateNote: null, relatedChangeId: null, share: null, nowMs: T0 });
    expect(c).toBe(s0);
  });
});
