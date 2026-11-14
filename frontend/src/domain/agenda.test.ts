import { describe, expect, it } from 'vitest';
import { advanceTask, diffForCrew, changeRange } from './agenda';
import { createInitialState } from '../state/initialState';
import { reduce } from '../state/reducer';
import { durationMinutes } from './time';

const T0 = 1_000_000;
const plan = () => createInitialState(T0).missions.iss.ground.plan;

describe('U-AG advanceTask (04 §8.1)', () => {
  it('U-AG-01: blk-16 advanced 90 → rest 8 h 30 → 7 h 00 (−90) for Lucía and Tomás, post-sleep 04:30–06:00', () => {
    const r = advanceTask(plan(), 'iss:blk-16', 90);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.perCrew.map((c) => c.crewId)).toEqual(['iss:crew-lf', 'iss:crew-ti']);
    for (const c of r.perCrew) {
      expect(c.rest).not.toBeNull();
      expect(durationMinutes(c.rest!.before)).toBe(510);
      expect(durationMinutes(c.rest!.after)).toBe(420);
      expect(c.rest!.deltaMinutes).toBe(-90);
      expect(c.rest!.after).toEqual({ start: '2027-03-09T21:30:00Z', end: '2027-03-10T04:30:00Z' });
      const ps = c.moves.find((m) => m.kind === 'post_sleep')!;
      expect(ps.after).toEqual({ start: '2027-03-10T04:30:00Z', end: '2027-03-10T06:00:00Z' });
      expect(c.moves[0].kind).toBe('task');
      expect(c.moves[0].after).toEqual({ start: '2027-03-10T06:00:00Z', end: '2027-03-10T07:30:00Z' });
    }
    expect(r.plan.version).toBe(2);
  });

  it('U-AG-02: 120 → 6 h 30 (−120); 30 after the 90 change → 6 h 30 (−30 vs v2)', () => {
    const r = advanceTask(plan(), 'iss:blk-16', 120);
    expect(r.ok && durationMinutes(r.perCrew[0].rest!.after)).toBe(390);
    expect(r.ok && r.perCrew[0].rest!.deltaMinutes).toBe(-120);
    const v2 = advanceTask(plan(), 'iss:blk-16', 90);
    expect(v2.ok).toBe(true);
    if (!v2.ok) return;
    const v3 = advanceTask(v2.plan, 'iss:blk-16', 30);
    expect(v3.ok).toBe(true);
    if (!v3.ok) return;
    expect(durationMinutes(v3.perCrew[0].rest!.after)).toBe(390);
    expect(v3.perCrew[0].rest!.deltaMinutes).toBe(-30);
    expect(v3.plan.version).toBe(3);
  });

  it('U-AG-03: blk-20 advanced 60 allowed with rest unchanged; 90/120 conflict with blk-19', () => {
    const ok = advanceTask(plan(), 'iss:blk-20', 60);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.perCrew[0].crewId).toBe('iss:crew-mo');
      expect(ok.perCrew[0].rest?.deltaMinutes ?? 0).toBe(0);
      expect(ok.perCrew[0].moves.map((m) => m.blockId)).toEqual(['iss:blk-20']);
    }
    for (const m of [90, 120]) {
      const bad = advanceTask(plan(), 'iss:blk-20', m);
      expect(bad.ok).toBe(false);
      if (!bad.ok) { expect(bad.reason).toBe('conflict'); expect(bad.blockIds).toEqual(['iss:blk-19']); }
    }
  });

  it('U-AG-04: invalid amount and non-movable block', () => {
    const a = advanceTask(plan(), 'iss:blk-16', 45);
    expect(!a.ok && a.reason).toBe('invalid_amount');
    const b = advanceTask(plan(), 'iss:blk-01', 30);
    expect(!b.ok && b.reason).toBe('not_movable');
    const c = advanceTask(plan(), 'nope', 30);
    expect(!c.ok && c.reason).toBe('not_movable');
  });

  it('U-AG-05: Ground perCrew equals the Onboard notice moves and rest', () => {
    let s = createInitialState(T0);
    s = reduce(s, { type: 'plan/change_sent', missionId: 'iss', taskId: 'iss:blk-16', advanceMinutes: 90, nowMs: T0 });
    s = reduce(s, { type: 'clock/tick', nowMs: T0 + 5000 });
    const change = s.missions.iss.ground.changes[0];
    const notice = s.missions.iss.onboard.notices[0];
    const ground = change.perCrew.find((c) => c.crewId === 'iss:crew-lf')!;
    expect(notice.moves).toEqual(ground.moves);
    expect(notice.rest).toEqual(ground.rest);
    expect(notice.trace).toEqual({ ruleId: 'agenda.rest_window_delta', fromVersion: 1, toVersion: 2, taskId: 'iss:blk-16', advanceMinutes: 90 });
    const diff = diffForCrew(createInitialState(T0).missions.iss.ground.plan, s.missions.iss.onboard.plan, 'iss:crew-lf');
    expect(diff).toEqual(ground);
  });

  it('changeRange: 1 h margins around the A5 change → Mar 9 20:30 → Mar 10 10:00', () => {
    const r = advanceTask(plan(), 'iss:blk-16', 90);
    if (!r.ok) throw new Error();
    expect(changeRange(r.perCrew[0])).toEqual({ start: '2027-03-09T20:30:00Z', end: '2027-03-10T10:00:00Z' });
  });
});
