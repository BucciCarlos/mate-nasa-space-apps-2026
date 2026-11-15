import { describe, expect, it } from 'vitest';
import { CREW, freshPreview, previewReduce, OWNER } from './fd30';
import type { CrewId, PreviewState } from './fd30';
import { exerciseSessionView } from './exerciseSession';
import { restingPulse, sessionPulse, spo2, wellbeingIndex, wellbeingParts } from './wellbeing';

const wall = 1000;
const at = (hhmm: string) => Date.parse(`2027-03-10T${hhmm}:00Z`);
const world = (time: number, owner: CrewId): PreviewState =>
  previewReduce(previewReduce(freshPreview(wall), { type: 'seek', target: time, now: wall }), { type: 'select', crewId: owner });

describe('MATE-WELL01 simulated resting pulse', () => {
  it('stays within 75–77 bpm over a full day and visits every value', () => {
    const seen = new Set<number>();
    for (let m = 0; m < 24 * 60; m++) {
      const v = restingPulse(OWNER, Date.parse('2027-03-10T00:00:00Z') + m * 60_000);
      expect(v).toBeGreaterThanOrEqual(75);
      expect(v).toBeLessThanOrEqual(77);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([75, 76, 77]);
  });

  it('is a pure function of the mission clock: same instant, same value, rewinds identically', () => {
    const t = at('11:17');
    expect(restingPulse(OWNER, t)).toBe(restingPulse(OWNER, t));
    expect(restingPulse(OWNER, at('10:00'))).toBe(restingPulse(OWNER, at('10:00')));
  });

  it('shows the live session pulse only for the owner whose session is live', () => {
    const lucia = world(at('10:41'), OWNER);
    const live = exerciseSessionView(lucia, OWNER, at('10:41'));
    expect(live.phase).toBe('live');
    expect(sessionPulse(lucia, OWNER, at('10:41'))).toBe(live.current?.pulse_bpm ?? null);
    expect(sessionPulse(world(at('10:41'), 'iss:crew-ti'), 'iss:crew-ti', at('10:41'))).toBeNull();
    expect(sessionPulse(world(at('09:00'), OWNER), OWNER, at('09:00'))).toBeNull();
  });
});

describe('MATE-WELL01 wellbeing index', () => {
  it('is absent without the sleep part, never zero and never exercise-only', () => {
    expect(wellbeingIndex({ sleep: null, exercise: null })).toBeNull();
    expect(wellbeingIndex({ sleep: null, exercise: 100 })).toBeNull();
  });

  it('averages the available parts, rounding half up', () => {
    expect(wellbeingIndex({ sleep: 71, exercise: null })).toBe(71);
    expect(wellbeingIndex({ sleep: 71, exercise: 100 })).toBe(86);
    expect(wellbeingIndex({ sleep: 70, exercise: 69 })).toBe(70);
  });

  it('uses the last scored received night and reports its FD: FD30 without time in bed falls back to FD29, labelled', () => {
    const before = wellbeingParts(world(at('05:55'), OWNER), OWNER, at('05:55'));
    expect(before).toMatchObject({ sleep: 71, sleepFd: 29 });
    const after = wellbeingParts(world(at('06:00'), OWNER), OWNER, at('06:00'));
    expect(after).toMatchObject({ sleep: 71, sleepFd: 29 });
  });

  it('counts the exercise part only once the owner\'s session is completed by the cursor', () => {
    expect(wellbeingParts(world(at('10:41'), OWNER), OWNER, at('10:41')).exercise).toBeNull();
    expect(wellbeingParts(world(at('11:45'), OWNER), OWNER, at('11:45')).exercise).toBe(100);
  });
});

describe('MATE-WELL01 cohort reach', () => {
  it('keeps the index and pulse for the other profiles on their own data only', () => {
    for (const c of CREW) {
      const t = at('11:45');
      const parts = wellbeingParts(world(t, c.id), c.id, t);
      expect(parts.exercise === null || c.id === OWNER).toBe(true);
    }
  });
});

describe('MATE-WELL01 simulated SpO2', () => {
  it('stays within 95–99 % over a full day, visits every value, and is deterministic by clock', () => {
    const seen = new Set<number>();
    for (let m = 0; m < 24 * 60; m++) {
      const v = spo2(OWNER, Date.parse('2027-03-10T00:00:00Z') + m * 60_000);
      expect(v).toBeGreaterThanOrEqual(95);
      expect(v).toBeLessThanOrEqual(99);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([95, 96, 97, 98, 99]);
    expect(spo2(OWNER, at('11:17'))).toBe(spo2(OWNER, at('11:17')));
  });
});
