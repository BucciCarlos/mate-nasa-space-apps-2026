import type { CrewId, PreviewState } from '../fd30';
import type { GroundRole } from '../../state/types';
import { exerciseSessionView } from '../exerciseSession';
import { plannedExercise } from '../fd30Plan';
import { fdDate, FLIGHT_DAY_ONE } from './sleep';
import { EXERCISE_SOURCE } from './exerciseSource';

export type ExerciseRange = 'last7' | 'all';
export type ExerciseViewer = { perspective: 'onboard'; owner: CrewId } | { perspective: 'ground'; role: GroundRole };
export interface ExerciseRecord {
  id: string; owner: CrewId; fd: number; type: 'aerobic'; equipmentId: string; protocolId: string;
  start: string; end: string; receivedAt: string; confirmed: boolean;
  plannedMinutes: number; durationMinutes: number; powerW: number | null; cadenceRpm: number | null;
  powerMinutes: number; source: typeof EXERCISE_SOURCE;
}
export interface ExercisePlanDay {
  fd: number; owner: CrewId; equipmentId: string | null; start: string | null; end: string | null;
}
// Original fictional exercise-only historical coverage, NOT a reconstructed full agenda.
// Explicit rest days allow “No activity”; a reservation with no receipt is “No record”.
const scheduled: Record<CrewId, readonly number[]> = {
  'iss:crew-lf': [1,2,3,5,6,8,9,10,12,13,15,16,17,19,20,22,23,24,26,27,29],
  'iss:crew-ti': [5,7,9,11,13,15,17,19,21,23,25,27,29],
  'iss:crew-mo': [2,4,5,7,9,11,12,14,16,18,19,21,23,25,26,28,29],
};
const owners = Object.keys(scheduled) as CrewId[];
export const EXERCISE_PLAN: readonly ExercisePlanDay[] = owners.flatMap(owner => Array.from({ length: 29 }, (_, index) => {
  const fd = index + 1, reserved = scheduled[owner].includes(fd);
  const hour = owner === 'iss:crew-ti' ? '08' : owner === 'iss:crew-mo' ? '13' : '10';
  const minute = owner === 'iss:crew-lf' ? '30' : '00';
  const equipmentId = owner === 'iss:crew-lf' && fd === 24 ? 'demo-treadmill' : 'demo-ergometer';
  return { owner, fd, equipmentId: reserved ? equipmentId : null,
    start: reserved ? `${fdDate(fd)}T${hour}:${minute}:00Z` : null,
    end: reserved ? `${fdDate(fd)}T${String(Number(hour) + 1).padStart(2, '0')}:${minute}:00Z` : null };
}));
const LF_HISTORY = 'iss:history:lf:exercise-fd29';
/** Immutable historical summaries. LF FD29 retains the old workflow ID and is gated by its original receipts. */
export const EXERCISE_RECORDS: readonly ExerciseRecord[] = EXERCISE_PLAN.flatMap(day => {
  if (!day.start || !day.end || !day.equipmentId || (day.owner === 'iss:crew-mo' && day.fd === 26)) return [];
  const powerW = day.equipmentId === 'demo-treadmill' || (day.owner === 'iss:crew-lf' && day.fd === 17) ? null
    : day.owner === 'iss:crew-ti' ? (day.fd >= 23 ? 180 + (day.fd % 3 - 1) * 2 : 200 + (day.fd % 3 - 1) * 2)
    : day.owner === 'iss:crew-mo' ? 135 + (day.fd % 3 - 1) * 2 : 110 + (day.fd % 3 - 1) * 2;
  return [{ id: day.owner === 'iss:crew-lf' && day.fd === 29 ? LF_HISTORY : `iss:history:${day.owner.slice(-2)}:exercise-fd${day.fd}`,
    owner: day.owner, fd: day.fd, type: 'aerobic', equipmentId: day.equipmentId, protocolId: 'demo-steady-60.1',
    start: day.start, end: day.end, receivedAt: day.end, confirmed: true,
    plannedMinutes: 60, durationMinutes: 60, powerW, cadenceRpm: day.equipmentId === 'demo-treadmill' ? null : 70 + day.fd % 3,
    powerMinutes: powerW === null ? 0 : 60, source: EXERCISE_SOURCE }];
});
export type ComparisonReason = 'equipment' | 'protocol' | 'confirmation' | 'order' | 'duration' | 'power' | 'coverage';
export function comparableReason(r: ExerciseRecord): ComparisonReason | null {
  if (r.equipmentId !== 'demo-ergometer') return 'equipment';
  if (!r.protocolId) return 'protocol';
  if (!r.confirmed) return 'confirmation';
  if (!Number.isFinite(Date.parse(r.start)) || !Number.isFinite(Date.parse(r.end)) || Date.parse(r.end) <= Date.parse(r.start)
    || !Number.isFinite(Date.parse(r.receivedAt)) || Date.parse(r.receivedAt) < Date.parse(r.end)) return 'order';
  if (!Number.isFinite(r.plannedMinutes) || !Number.isFinite(r.durationMinutes) || r.plannedMinutes <= 0
    || Math.abs(r.durationMinutes - r.plannedMinutes) > r.plannedMinutes * .1
    || Math.abs((Date.parse(r.end) - Date.parse(r.start)) / 60_000 - r.durationMinutes) > .001) return 'duration';
  if (r.powerW === null || !Number.isFinite(r.powerW)) return 'power';
  if (!Number.isFinite(r.powerMinutes) || r.powerMinutes / r.durationMinutes < .8 || r.powerMinutes > r.durationMinutes) return 'coverage';
  return null;
}
const median = (values: number[]) => {
  const sorted = values.slice().sort((a, b) => a - b), m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
};
/** Cohorts precede view-window filtering (AUD04 A04-5). Equipment/protocol/owner never mix. */
export function exerciseComparisons(records: readonly ExerciseRecord[]) {
  const groups = new Map<string, ExerciseRecord[]>();
  records.filter(r => comparableReason(r) === null).forEach(r => {
    const key = `${r.owner}:${r.equipmentId}:${r.protocolId}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  return [...groups.values()].map(rows => {
    rows.sort((a, b) => Date.parse(a.end) - Date.parse(b.end));
    const recent = rows.slice(-4), baseline = rows.slice(0, -4);
    const referenceW = baseline.length >= 8 && recent.length === 4 ? median(baseline.map(r => r.powerW!)) : null;
    const recentW = referenceW === null ? null : median(recent.map(r => r.powerW!));
    const differenceW = recentW === null ? null : recentW - referenceW!;
    return { protocolId: rows[0].protocolId, rows, recent, baseline, referenceW, recentW, differenceW,
      differencePercent: differenceW === null || referenceW === 0 ? null : differenceW / referenceW! * 100 };
  });
}
/** Permission -> occurrence AND reception -> comparison -> window. No writes or new events. */
export function exerciseHistory(state: PreviewState, viewer: ExerciseViewer, cursor: number, range: ExerciseRange,
  records: readonly ExerciseRecord[] = EXERCISE_RECORDS, coverage: readonly ExercisePlanDay[] = EXERCISE_PLAN) {
  if (viewer.perspective !== 'onboard' || viewer.owner !== state.activeCrewId || !Number.isFinite(cursor)) return null;
  const currentFd = Math.floor((cursor - FLIGHT_DAY_ONE) / 86_400_000) + 1;
  if (currentFd < 1 || currentFd > 30) return null;
  const due = (iso: string) => Date.parse(iso) <= cursor;
  const available = records.filter(r => r.owner === viewer.owner && due(r.start) && due(r.end) && due(r.receivedAt)
    && (r.id !== LF_HISTORY || state.exercise.some(s => s.id === r.id && s.crewId === r.owner && s.start && s.finish
      && s.start.association.status === 'confirmed' && s.finish.association.status === 'confirmed'
      && s.start.association.crewId === r.owner && s.finish.association.crewId === r.owner
      && due(s.start.occurredAt) && due(s.start.receivedAt) && due(s.finish.occurredAt) && due(s.finish.receivedAt))));
  const live = exerciseSessionView(state, viewer.owner, cursor);
  const plan = plannedExercise(viewer.owner);
  if (live.phase === 'completed') {
    const session = live.session!, durationMinutes = live.elapsedSeconds! / 60;
    // Minute intervals, excluding the inclusive endpoint (61 timestamps != 61 min).
    const minutes = live.points.filter(p => Date.parse(p.occurredAt) < Date.parse(session.finish!.occurredAt));
    const mean = (key: 'workload_w' | 'cadence_rpm') => {
      const values = minutes.flatMap(p => p[key] === null ? [] : [p[key]!]);
      return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
    };
    available.push({ id: session.id, owner: viewer.owner, fd: 30, type: 'aerobic', equipmentId: plan!.equipmentId!, protocolId: 'demo-live-60.1',
      start: session.start!.occurredAt, end: session.finish!.occurredAt, receivedAt: session.finish!.receivedAt, confirmed: true,
      durationMinutes, plannedMinutes: (Date.parse(plan!.end) - Date.parse(plan!.start)) / 60_000,
      powerW: mean('workload_w'), cadenceRpm: mean('cadence_rpm'), powerMinutes: minutes.filter(p => p.workload_w !== null).length,
      source: EXERCISE_SOURCE });
  }
  const unique = [...new Map(available.map(r => [r.id, r])).values()].sort((a, b) => Date.parse(a.end) - Date.parse(b.end));
  const firstFd = range === 'last7' ? Math.max(1, currentFd - 6) : 1;
  const visible = unique.filter(r => r.fd >= firstFd && r.fd <= currentFd);
  const days = Array.from({ length: currentFd - firstFd + 1 }, (_, i) => {
    const fd = firstFd + i, sessions = visible.filter(r => r.fd === fd);
    const historical = coverage.find(d => d.owner === viewer.owner && d.fd === fd);
    const reservation = fd === 30 && plan ? { start: plan.start, end: plan.end, equipmentId: plan.equipmentId! } : historical?.start ? historical : null;
    const status = sessions.length ? 'recorded' : fd === 30 && live.phase === 'live' ? 'live'
      : reservation && !due(reservation.start!) ? 'pending' : reservation ? 'no_record' : historical ? 'no_activity' : 'no_record';
    return { fd, sessions, reservation, status };
  });
  return { owner: viewer.owner, firstFd, currentFd, records: visible, latest: visible.at(-1) ?? null, days,
    comparisons: exerciseComparisons(unique) };
}
