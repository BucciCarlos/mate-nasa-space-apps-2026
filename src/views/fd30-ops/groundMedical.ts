import { CREW } from '../../demo/fd30';
import type { CrewId, PreviewState } from '../../demo/fd30';
import { EXERCISE_RECORDS } from '../../demo/history/exercise';
import { FLIGHT_DAY_ONE } from '../../demo/history/sleep';
import { exerciseSessionView } from '../../demo/exerciseSession';
import { TELEMETRY_SOURCE, TELEMETRY_VERSION } from '../../demo/exerciseTelemetry';
import { RESTING_PULSE, SPO2, restingPulse, spo2 } from '../../demo/wellbeing';
import { LAB_VERSION } from '../../demo/laboratory';
import type { LabEvent } from '../../demo/laboratory';
import { EQUIPMENT, plannedExercise } from '../../demo/fd30Plan';
import type { Bilingual, GroundRole } from '../../state/types';
import { groundSleepTrend } from './groundSleep';

export interface GroundExerciseRecord {
  id: string; fd: number; start: string; end: string; receivedAt: string; durationMinutes: number;
  powerW: number | null; cadenceRpm: number | null; sourceId: string; version: string;
}
export interface GroundMedicalPerson {
  id: CrewId; time: number;
  pulse: { value: number | null; kind: 'illustrative' | 'exercise'; sourceId: string; version: string; occurredAt: string; receivedAt: string | null };
  spo2: { value: number; kind: 'illustrative'; version: string };
  sleep: NonNullable<ReturnType<typeof groundSleepTrend>>;
  labs: { id: string; sampleType: 'blood' | 'urine'; stage: 'collection' | 'analysis' | 'result'; stored: boolean; incomplete: boolean;
    occurredAt: string; receivedAt: string; sourceId: string; version: string; values: null }[];
  exercise: {
    live: { id: string; start: string; receivedAt: string; elapsedMinutes: number; powerW: number | null; cadenceRpm: number | null } | null;
    latest: GroundExerciseRecord | null;
    reservation: { start: string; end: string; equipment: Bilingual | null } | null;
  };
}
const due = (iso: string, time: number) => Number.isFinite(Date.parse(iso)) && Date.parse(iso) <= time;

/** Explicit medical-only allowlist, authorized for the three operational crew. No impersonated Onboard viewer,
 * active-profile dependency, clinical values, chat, private notes, wellbeing index, or journal is projected. */
export function groundMedicalView(state: PreviewState, role: GroundRole, time: number): GroundMedicalPerson[] | null {
  if (role !== 'medical_professional' || !Number.isFinite(time)) return null;
  return CREW.map(person => {
    const owner = person.id, session = exerciseSessionView(state, owner, time);
    const live = session.phase === 'live';
    const pulse = live ? {
      value: session.current?.pulse_bpm ?? null, kind: 'exercise' as const, sourceId: TELEMETRY_SOURCE, version: TELEMETRY_VERSION,
      occurredAt: session.current?.occurredAt ?? new Date(time).toISOString(), receivedAt: session.current?.receivedAt ?? null,
    } : { value: restingPulse(owner, time), kind: 'illustrative' as const, sourceId: 'demo-clock-pattern', version: RESTING_PULSE.version,
      occurredAt: new Date(time).toISOString(), receivedAt: null };
    const historical = EXERCISE_RECORDS.filter(r => r.owner === owner && r.confirmed && due(r.start, time) && due(r.end, time) && due(r.receivedAt, time)
      && (r.id !== 'iss:history:lf:exercise-fd29' || state.exercise.some(s => s.id === r.id && s.crewId === owner
        && s.start?.association.status === 'confirmed' && s.finish?.association.status === 'confirmed'
        && s.start.association.crewId === owner && s.finish.association.crewId === owner
        && due(s.start.occurredAt, time) && due(s.start.receivedAt, time) && due(s.finish.occurredAt, time) && due(s.finish.receivedAt, time))))
      .map((r): GroundExerciseRecord => ({ id: r.id, fd: r.fd, start: r.start, end: r.end, receivedAt: r.receivedAt,
        durationMinutes: r.durationMinutes, powerW: r.powerW, cadenceRpm: r.cadenceRpm, sourceId: r.source.adapter, version: r.source.version }));
    if (session.phase === 'completed') {
      const s = session.session!, minutes = session.points.filter(p => Date.parse(p.occurredAt) < Date.parse(s.finish!.occurredAt));
      const mean = (key: 'workload_w' | 'cadence_rpm') => {
        const values = minutes.flatMap(p => p[key] === null ? [] : [p[key]!]);
        return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
      };
      historical.push({ id: s.id, fd: Math.floor((Date.parse(s.start!.occurredAt) - FLIGHT_DAY_ONE) / 86400000) + 1,
        start: s.start!.occurredAt, end: s.finish!.occurredAt, receivedAt: s.finish!.receivedAt, durationMinutes: session.elapsedSeconds! / 60,
        powerW: mean('workload_w'), cadenceRpm: mean('cadence_rpm'), sourceId: TELEMETRY_SOURCE, version: TELEMETRY_VERSION });
    }
    const labs = state.laboratory.filter(s => s.crewId === owner).flatMap(s => {
      const visible = (e: LabEvent | null) => e && e.association.status === 'confirmed' && e.association.crewId === owner
        && e.sampleId === s.id && e.sampleType === s.sampleType && state.processedIds.includes(e.id)
        && due(e.occurredAt, time) && due(e.receivedAt, time) ? e : null;
      const collection = visible(s.collection), analysis = visible(s.analysis), result = visible(s.result), last = result ?? analysis ?? collection;
      if (!last) return [];
      return [{ id: s.id, sampleType: s.sampleType, stage: result ? 'result' as const : analysis ? 'analysis' as const : 'collection' as const,
        stored: collection?.handlingStatus === 'stored_awaiting_analysis', incomplete: (!!analysis && !collection) || (!!result && (!collection || !analysis)),
        occurredAt: last.occurredAt, receivedAt: last.receivedAt, sourceId: last.sourceId, version: LAB_VERSION, values: null }];
    }).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).slice(0, 3);
    const plan = plannedExercise(owner);
    return { id: owner, time, pulse, spo2: { value: spo2(owner, time), kind: 'illustrative' as const, version: SPO2.version },
      sleep: groundSleepTrend(state, role, time, owner)!, labs, exercise: {
        live: live ? { id: session.session!.id, start: session.session!.start!.occurredAt, receivedAt: session.session!.start!.receivedAt,
          elapsedMinutes: session.elapsedSeconds! / 60, powerW: session.current?.workload_w ?? null, cadenceRpm: session.current?.cadence_rpm ?? null } : null,
        latest: historical.sort((a, b) => Date.parse(b.end) - Date.parse(a.end))[0] ?? null,
        reservation: plan ? { start: plan.start, end: plan.end, equipment: plan.equipmentId ? { ...EQUIPMENT[plan.equipmentId] } : null } : null,
      } };
  });
}
