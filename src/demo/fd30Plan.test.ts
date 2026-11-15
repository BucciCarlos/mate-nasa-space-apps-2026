import { describe, expect, it } from 'vitest';
import { EQUIPMENT, PLAN_FD30, planFor, plannedExercise, validatePlan } from './fd30Plan';
import { CREW, EXERCISE_EVENTS, OWNER } from './fd30';

describe('FD30 plan and exclusive equipment reservations', () => {
  it('has distinct personal lanes and no person or equipment collision', () => {
    expect(validatePlan(PLAN_FD30)).toBe(true);
    for (const c of CREW) {
      expect(planFor(c.id).every(b => b.crewIds.includes(c.id))).toBe(true);
      expect(planFor(c.id).some(b => b.kind === 'exercise')).toBe(true);
    }
    const lucia = plannedExercise(OWNER)!, tomas = plannedExercise('iss:crew-ti')!, mei = plannedExercise('iss:crew-mo')!;
    expect(lucia.start).toBe(EXERCISE_EVENTS[0].occurredAt);
    expect(lucia.end).toBe(EXERCISE_EVENTS[1].occurredAt);
    expect(tomas.start).toBe(lucia.start);
    expect(tomas.equipmentId).not.toBe(lucia.equipmentId);
    expect(mei.equipmentId).toBe(lucia.equipmentId);
    expect(Date.parse(mei.start)).toBeGreaterThanOrEqual(Date.parse(lucia.end));
    expect(Object.keys(EQUIPMENT)).toHaveLength(2);
  });
  it('rejects double booking but permits adjacent reservations', () => {
    const a = plannedExercise(OWNER)!, b = plannedExercise('iss:crew-ti')!;
    expect(validatePlan([a, { ...b, equipmentId: a.equipmentId }])).toBe(false);
    expect(validatePlan([a, { ...b, equipmentId: a.equipmentId, start: a.end, end: '2027-03-10T12:00:00Z' }])).toBe(true);
    expect(validatePlan([{ ...a, equipmentId: 'unknown' }])).toBe(false);
    expect(validatePlan([{ ...a, end: a.start }])).toBe(false);
  });
});
