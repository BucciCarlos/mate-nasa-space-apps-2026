import { describe, expect, it } from 'vitest';
import { EXERCISE_SESSION, OWNER, freshPreview, previewReduce } from './fd30';
import { exerciseSessionView } from './exerciseSession';

const stamp = (time: string) => Date.parse(`2027-03-10T${time}Z`);
const seek = (time: string) => previewReduce(freshPreview(1000), { type: 'seek', now: 1000, target: stamp(time) });
const view = (time: string) => exerciseSessionView(seek(time), OWNER, stamp(time));

describe('Exercise panel follows confirmed session and mission cursor', () => {
  it('keeps the reservation empty before start, then shows only the current received minute', () => {
    expect(view('10:29:00')).toMatchObject({ phase: 'planned', points: [], current: null, elapsedSeconds: null });
    expect(view('10:30:00')).toMatchObject({ phase: 'live', elapsedSeconds: 0, current: { pulse_bpm: 108 } });
    expect(view('10:41:00')).toMatchObject({ phase: 'live', elapsedSeconds: 660,
      current: { pulse_bpm: 110, workload_w: 140, cadence_rpm: 68 } });
    expect(view('10:41:59').elapsedSeconds).toBe(719);
    expect(view('10:41:59').points).toHaveLength(12);
  });
  it('preserves all missing channels while elapsed time continues, then receives a new minute', () => {
    for (const minute of ['10:52:00', '10:53:00', '10:54:00']) {
      expect(view(minute).current).toMatchObject({ pulse_bpm: null, workload_w: null, cadence_rpm: null });
      expect(view(minute).elapsedSeconds).toBe((stamp(minute) - stamp('10:30:00')) / 1000);
    }
    expect(view('10:55:00').current?.pulse_bpm).toBe(118);
  });
  it('closes into a frozen summary and reconstructs earlier readings without future points', () => {
    const finished = seek('11:30:00');
    expect(exerciseSessionView(finished, OWNER, stamp('11:30:00'))).toMatchObject({ phase: 'completed', current: null, elapsedSeconds: 3600 });
    expect(view('12:00:00').points).toHaveLength(61);
    expect(view('12:00:00').elapsedSeconds).toBe(3600);
    const rewound = previewReduce(finished, { type: 'seek', now: 1000, target: stamp('10:41:00') });
    const earlier = exerciseSessionView(rewound, OWNER, stamp('10:41:00'));
    expect(earlier.phase).toBe('live');
    expect(earlier.current?.pulse_bpm).toBe(110);
    expect(earlier.points).toHaveLength(12);
    // Even a stale completed workflow snapshot cannot reveal its future finish/readings.
    const stale = exerciseSessionView(finished, OWNER, stamp('10:41:00'));
    expect(stale).toMatchObject({ phase: earlier.phase, elapsedSeconds: earlier.elapsedSeconds, current: earlier.current, points: earlier.points });
    expect(exerciseSessionView(finished, OWNER, stamp('10:29:00')).points).toEqual([]);
  });
  it('does not treat a reservation, unconfirmed owner or future receipt as a session start', () => {
    const time = stamp('10:41:00');
    expect(exerciseSessionView(freshPreview(1000), OWNER, time).points).toEqual([]);
    for (const patch of [
      { association: { status: 'unconfirmed' as const, crewId: OWNER } },
      { association: { status: 'confirmed' as const, crewId: 'iss:crew-ti' } },
      { receivedAt: '2027-03-10T10:42:00Z' },
    ]) {
      const state = seek('10:41:00');
      const session = state.exercise.find(s => s.id === EXERCISE_SESSION)!;
      session.start = { ...session.start!, ...patch };
      expect(exerciseSessionView(state, OWNER, time)).toMatchObject({ phase: 'planned', points: [], current: null });
    }
  });
  it('never gives Tomás or Mei Lucía’s readings, including after finish', () => {
    for (const time of ['10:29:00', '10:41:00', '10:54:00', '11:30:00']) {
      for (const owner of ['iss:crew-ti', 'iss:crew-mo'] as const) {
        expect(exerciseSessionView(seek(time), owner, stamp(time))).toMatchObject({ phase: 'planned', points: [], current: null, elapsedSeconds: null });
      }
    }
  });
  it('requires a confirmed owner and received finish before closing the summary', () => {
    for (const patch of [
      { association: { status: 'unconfirmed' as const, crewId: OWNER } },
      { association: { status: 'confirmed' as const, crewId: 'iss:crew-ti' } },
      { receivedAt: '2027-03-10T11:31:00Z' },
    ]) {
      const state = seek('11:30:00');
      const session = state.exercise.find(s => s.id === EXERCISE_SESSION)!;
      session.finish = { ...session.finish!, ...patch };
      expect(exerciseSessionView(state, OWNER, stamp('11:30:00')).phase).toBe('live');
    }
  });
});
