import { describe, expect, it } from 'vitest';
import { parseRoute, toHash } from '../app/routes';
import { EXERCISE_SESSION, OWNER, freshPreview, previewReduce } from './fd30';
import { planFor, plannedExercise } from './fd30Plan';
import { BLOOD_SAMPLE, LAB_PLAN, URINE_SAMPLE } from './laboratory';
import { SCHEDULE_END, SCHEDULE_START, scheduleBlockView, scheduleX } from './fd30Schedule';

const stamp = (time: string) => Date.parse(`2027-03-10T${time}:00Z`);
const seek = (time: string) => previewReduce(freshPreview(1000), { type: 'seek', now: 1000, target: stamp(time) });
const exerciseId = plannedExercise(OWNER)!.id;

describe('personal FD30 Schedule: existing plans and exact received associations', () => {
  it('adds a separate personal route, preserving M1 and Ground agenda routes', () => {
    expect(parseRoute(toHash({ view: 'fd30', page: 'agenda' }))).toEqual({ view: 'fd30', page: 'agenda' });
    expect(toHash({ view: 'fd30', page: 'agenda' })).toBe('#/onboard/personal/agenda');
    expect(parseRoute('#/onboard/agenda')).toEqual({ view: 'onboard', page: 'agenda' });
    expect(parseRoute('#/ground/iss/agenda')).toEqual({ view: 'ground', missionId: 'iss', page: 'agenda' });
    expect(parseRoute('#/onboard/personal/catalog')).toEqual({ view: 'fd30', page: 'catalog' });
  });
  it('keeps reservations without links before a received start; receipt and rewind control confirmation', () => {
    const before = scheduleBlockView(seek('10:29'), OWNER, exerciseId, stamp('10:29'))!;
    expect(before.block).toBe(plannedExercise(OWNER));
    expect(before).toMatchObject({ event: null, module: null });
    expect(scheduleBlockView(seek('10:41'), OWNER, exerciseId, stamp('10:41'))).toMatchObject({ module: 'exercise', event: { kind: 'exercise.started' } });
    const finished = seek('11:30');
    expect(scheduleBlockView(finished, OWNER, exerciseId, stamp('11:30'))).toMatchObject({ module: 'exercise', event: { kind: 'exercise.finished' } });
    expect(scheduleBlockView(finished, OWNER, exerciseId, stamp('10:29'))).toMatchObject({ module: null, event: null });
    expect(scheduleBlockView(finished, OWNER, exerciseId, stamp('10:41'))?.event?.kind).toBe('exercise.started');
    expect(scheduleBlockView(freshPreview(1000), OWNER, exerciseId, stamp('11:30'))?.module).toBeNull();
  });
  it('uses distinct sample IDs, never a generic task title or a result from another sample', () => {
    expect(scheduleBlockView(seek('09:14'), OWNER, LAB_PLAN.blood.id, stamp('09:14'))?.module).toBeNull();
    expect(scheduleBlockView(seek('09:15'), OWNER, LAB_PLAN.blood.id, stamp('09:15'))).toMatchObject({ module: 'laboratory', event: { sampleId: BLOOD_SAMPLE, kind: 'lab.sample_taken' } });
    expect(scheduleBlockView(seek('09:20'), OWNER, LAB_PLAN.urine.id, stamp('09:20'))?.event).toBeNull();
    expect(scheduleBlockView(seek('09:25'), OWNER, LAB_PLAN.urine.id, stamp('09:25'))).toMatchObject({ event: { sampleId: URINE_SAMPLE, kind: 'lab.sample_taken' } });
    const result = seek('11:45');
    expect(scheduleBlockView(result, OWNER, LAB_PLAN.blood.id, stamp('11:45'))?.event?.kind).toBe('lab.result_available');
    expect(scheduleBlockView(result, OWNER, LAB_PLAN.blood.id, stamp('11:44'))?.event?.kind).toBe('lab.analysis_started');
    expect(scheduleBlockView(result, OWNER, LAB_PLAN.urine.id, stamp('11:45'))?.event?.kind).toBe('lab.analysis_started');
    const meiTask = planFor('iss:crew-mo').find(b => b.title.en === 'Sample processing')!;
    expect(scheduleBlockView(result, 'iss:crew-mo', meiTask.id, stamp('11:45'))).toMatchObject({ event: null, module: null });
  });
  it('rejects unconfirmed, wrong-owner, mismatched-record, out-of-block and future-receipt starts', () => {
    for (const patch of [
      { association: { status: 'unconfirmed' as const, crewId: OWNER } },
      { association: { status: 'confirmed' as const, crewId: 'iss:crew-ti' } },
      { sessionId: 'iss:other-session' },
      { occurredAt: '2027-03-10T09:00:00Z' },
      { receivedAt: '2027-03-10T11:31:00Z' },
    ]) {
      const state = seek('11:30');
      const session = state.exercise.find(s => s.id === EXERCISE_SESSION)!;
      session.start = { ...session.start!, ...patch };
      expect(scheduleBlockView(state, OWNER, exerciseId, stamp('11:30'))).toMatchObject({ event: null, module: null });
    }
    const state = seek('11:45');
    const blood = state.laboratory.find(s => s.id === BLOOD_SAMPLE)!;
    blood.collection = null;
    expect(scheduleBlockView(state, OWNER, LAB_PLAN.blood.id, stamp('11:45'))?.module).toBeNull();
  });
  it('never exposes Lucía’s blocks or records through another profile', () => {
    const state = seek('11:45');
    for (const owner of ['iss:crew-ti', 'iss:crew-mo'] as const) {
      expect(scheduleBlockView(state, owner, exerciseId, stamp('11:45'))).toBeNull();
      expect(scheduleBlockView(state, owner, LAB_PLAN.blood.id, stamp('11:45'))).toBeNull();
      expect(scheduleBlockView(state, owner, plannedExercise(owner)!.id, stamp('11:45'))).toMatchObject({ module: null, event: null });
    }
  });
  it('only projects geometry and details: no time, state, plan or profile writes', () => {
    const state = seek('10:41');
    const snapshot = JSON.stringify(state), plan = JSON.stringify(planFor(OWNER));
    for (const block of planFor(OWNER)) scheduleBlockView(state, OWNER, block.id, stamp('10:41'));
    expect(JSON.stringify(state)).toBe(snapshot);
    expect(JSON.stringify(planFor(OWNER))).toBe(plan);
    expect(scheduleX(stamp('11:00')) - scheduleX(stamp('10:00'))).toBe(480);
    expect(SCHEDULE_START).toBeLessThanOrEqual(stamp('05:55'));
    expect(SCHEDULE_END).toBeGreaterThan(Date.parse(plannedExercise('iss:crew-mo')!.end));
  });
});
