import type { CrewId } from './fd30';

export const TELEMETRY_VERSION = 'fd30-tel.2';
export const TELEMETRY_SOURCE = 'demo-exercise-telemetry';
export const TELEMETRY_START = Date.parse('2027-03-10T10:30:00Z');
export const TELEMETRY_END = Date.parse('2027-03-10T11:30:00Z');
export interface TelemetryPoint {
  readonly occurredAt: string; readonly receivedAt: string;
  readonly crewId: CrewId; readonly sessionId: string; readonly origin: 'simulated';
  readonly sourceId: typeof TELEMETRY_SOURCE;
  readonly workload_w: number | null; readonly cadence_rpm: number | null;
  readonly pulse_bpm: number | null;
}
// Original illustrative fixture, NOT measured telemetry or a physiological model.
// IMP06 authorizes only this owner's explicitly simulated pulse in addition to W/rpm.
// Keep missing timestamps as null slots so neither the SVG nor the table bridges the gap.
export const TELEMETRY: readonly TelemetryPoint[] = Object.freeze(Array.from({ length: 61 }, (_, minute) => {
  const time = new Date(TELEMETRY_START + minute * 60_000).toISOString();
  const missing = minute >= 22 && minute <= 24;
  return Object.freeze({ occurredAt: time, receivedAt: time, crewId: 'iss:crew-lf' as const,
    sessionId: 'iss:session-lf-1', origin: 'simulated' as const, sourceId: TELEMETRY_SOURCE,
    workload_w: missing ? null : 85 + (minute % 12) * 5,
    cadence_rpm: missing ? null : 62 + (minute % 8) * 2,
    pulse_bpm: missing ? null : 108 + (minute % 10) * 2,
  });
}));
export function visibleTelemetry(missionTime: number, crewId: CrewId): TelemetryPoint[] {
  return TELEMETRY.filter(p => p.crewId === crewId && Date.parse(p.receivedAt) <= missionTime && Date.parse(p.occurredAt) <= missionTime);
}

/** A current minute slot, never a last-known value carried through a missing slot. */
export function currentTelemetry(points: readonly TelemetryPoint[], missionTime: number): TelemetryPoint | null {
  return points.find(p => Date.parse(p.occurredAt) <= missionTime && missionTime < Date.parse(p.occurredAt) + 60_000
    && Date.parse(p.receivedAt) <= missionTime) ?? null;
}
