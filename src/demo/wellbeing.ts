import { CREW } from './fd30';
import type { CrewId, PreviewState } from './fd30';
import { exerciseSessionView } from './exerciseSession';
import { sleepHistory } from './history/sleep';
import { scoreNight } from './history/sleepScore';

/**
 * MATE-WELL01: original M.A.T.E. demonstration index and a simulated resting pulse, both pure functions of the
 * mission cursor and the owner's own received data. Neither writes state nor reaches Ground. Stress and health are
 * not included: no verified source exists for them in this prototype.
 */
export const WELLBEING_VERSION = 'mate-wellbeing.1';
export const RESTING_PULSE = { version: 'mate-resting-pulse.1', base: 76, amplitude: 1, periodMinutes: 20 } as const;
/** Simulated SpO2 (%), 95–99: a deterministic cycle of the mission clock, like the resting pulse. Source: MODULOS PDF lists SpO2; the range is a team decision. */
export const SPO2 = { version: 'mate-spo2.1', base: 97, amplitude: 2, periodMinutes: 13 } as const;

export function spo2(owner: CrewId, time: number): number {
  const index = Math.max(0, CREW.findIndex(c => c.id === owner));
  const phase = index * (2 * Math.PI / 3) + 1;
  const cycle = Math.sin(2 * Math.PI * (time / 60_000) / SPO2.periodMinutes + phase);
  return SPO2.base + Math.round(SPO2.amplitude * cycle);
}

/** Simulated resting pulse: 75–77 bpm, a cycle driven only by the mission clock and the owner's fixed phase. */
export function restingPulse(owner: CrewId, time: number): number {
  const index = Math.max(0, CREW.findIndex(c => c.id === owner));
  const phase = index * (2 * Math.PI / 3);
  const cycle = Math.sin(2 * Math.PI * (time / 60_000) / RESTING_PULSE.periodMinutes + phase);
  return RESTING_PULSE.base + Math.round(RESTING_PULSE.amplitude * cycle);
}

/** Session pulse exists only while the owner's own session is live, from the same telemetry the Exercise view uses. */
export function sessionPulse(state: PreviewState, owner: CrewId, time: number): number | null {
  const view = exerciseSessionView(state, owner, time);
  return view.phase === 'live' ? view.current?.pulse_bpm ?? null : null;
}

/**
 * Index parts for the active owner. Sleep uses the latest RECEIVED night that has a score (the current night first; if it
 * has none, the last scored night before it), and reports its FD so the figure can label it. Exercise counts 100 once
 * today's session is completed by the cursor and is absent otherwise.
 */
export function wellbeingParts(state: PreviewState, owner: CrewId, time: number) {
  const viewer = { perspective: 'onboard' as const, owner };
  const records = sleepHistory(state, viewer, time, 'all')?.records ?? [];
  const exercise = exerciseSessionView(state, owner, time).phase === 'completed' ? 100 : null;
  for (const record of [...records].sort((a, b) => b.fd - a.fd)) {
    const night = scoreNight(record, time);
    if (night.score) return { sleep: night.score.display, sleepFd: record.fd, exercise };
  }
  return { sleep: null, sleepFd: null, exercise };
}

/**
 * The index needs the sleep part: without the current night's score it is absent, so an exercise-only value can never read
 * as wellbeing. When the exercise part also exists it is averaged in, rounded half up.
 */
export function wellbeingIndex(parts: { sleep: number | null; exercise: number | null }): number | null {
  if (parts.sleep === null) return null;
  const values = [parts.sleep, parts.exercise].filter((v): v is number => v !== null);
  return Math.floor(values.reduce((a, b) => a + b, 0) / values.length + 0.5);
}
