import type { CrewId } from '../fd30';
import { EXERCISE_EVENTS, EXERCISE_SESSION } from '../fd30';
import { plannedExercise } from '../fd30Plan';
import { EXERCISE_RECORDS, exerciseComparisons } from './exercise';
import type { ExerciseRecord } from './exercise';

/**
 * EXERCISE-VOICE02: the three approved Exercise dialogue cases, derived ONLY from existing records and selectors at a cursor
 * (occurrence and receipt <= cursor). No fixed hours, no new data. A case is returned only when its numbers match the approved
 * script exactly; anything else is null (text only, and the question is not played).
 *   Lucía: the FD30 ergometer session `iss:session-lf-1` completed, 60 min.
 *   Tomás: his own cohort `demo-steady-60.1` — latest four median 181 W vs earlier nine-session reference median 200 W (−19 W, −9.5 %).
 *   Mei:   her latest recorded session is FD29 `iss:history:mo:exercise-fd29`: 60 min, ergometer, mean power 137 W.
 */
export type ExerciseFacts =
  | { profile: 'lucia'; sessionId: string; fd: 30; minutes: number }
  | { profile: 'tomas'; fd: 29; recentW: number; referenceW: number; differenceW: number; differencePercent: number; recentCount: number; referenceCount: number; protocolId: string; latestId: string }
  | { profile: 'mei'; sessionId: string; fd: 29; minutes: number; powerW: number };

const at1 = (v: number) => Math.round(v * 10) / 10;
const due = (iso: string, at: number) => Date.parse(iso) <= at;
export function dueRecords(owner: CrewId, at: number): ExerciseRecord[] {
  return EXERCISE_RECORDS.filter(r => r.owner === owner && due(r.start, at) && due(r.end, at) && due(r.receivedAt, at));
}

export function exerciseFactsAt(owner: CrewId, at: number): ExerciseFacts | null {
  if (!Number.isFinite(at)) return null;
  if (owner === 'iss:crew-lf') {
    const [start, finish] = EXERCISE_EVENTS;
    const received = (e: typeof start) => e.sessionId === EXERCISE_SESSION && e.association.status === 'confirmed' && e.association.crewId === owner && due(e.occurredAt, at) && due(e.receivedAt, at);
    const minutes = (Date.parse(finish.occurredAt) - Date.parse(start.occurredAt)) / 60_000;
    return received(start) && received(finish) && minutes === 60 && plannedExercise(owner)?.equipmentId === 'demo-ergometer'
      ? { profile: 'lucia', sessionId: EXERCISE_SESSION, fd: 30, minutes } : null;
  }
  if (owner === 'iss:crew-ti') {
    const cohort = exerciseComparisons(dueRecords(owner, at)).find(c => c.protocolId === 'demo-steady-60.1');
    const latest = cohort?.rows.at(-1);
    if (!cohort || !latest || cohort.differenceW === null || cohort.differencePercent === null || cohort.recentW === null || cohort.referenceW === null) return null;
    const ok = latest.id === 'iss:history:ti:exercise-fd29' && latest.fd === 29 && cohort.recent.length === 4 && cohort.baseline.length === 9
      && cohort.recentW === 181 && cohort.referenceW === 200 && cohort.differenceW === -19 && at1(cohort.differencePercent) === -9.5;
    return ok ? { profile: 'tomas', fd: 29, recentW: cohort.recentW, referenceW: cohort.referenceW, differenceW: cohort.differenceW, differencePercent: at1(cohort.differencePercent),
      recentCount: cohort.recent.length, referenceCount: cohort.baseline.length, protocolId: cohort.protocolId, latestId: latest.id } : null;
  }
  if (owner === 'iss:crew-mo') {
    const latest = dueRecords(owner, at).reduce<ExerciseRecord | null>((best, r) => !best || Date.parse(r.end) > Date.parse(best.end) ? r : best, null);
    return latest && latest.id === 'iss:history:mo:exercise-fd29' && latest.fd === 29 && latest.durationMinutes === 60 && latest.equipmentId === 'demo-ergometer'
      && latest.powerW !== null && Math.round(latest.powerW) === 137 ? { profile: 'mei', sessionId: latest.id, fd: 29, minutes: latest.durationMinutes, powerW: Math.round(latest.powerW) } : null;
  }
  return null;
}
