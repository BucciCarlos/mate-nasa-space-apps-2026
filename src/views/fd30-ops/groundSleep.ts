import { CREW, OWNER } from '../../demo/fd30';
import type { CrewId, PreviewState } from '../../demo/fd30';
import { SLEEP_RECORDS } from '../../demo/history/sleep';
import type { GroundRole } from '../../state/types';

/**
 * GND03 sleep projection; GND02 correction explicitly extends the same allowlist to all three operational crew:
 * simulated nightly durations FD24–FD30, with record id, person, mission day, occurrence and receipt time, and provenance.
 * An explicit allowlist over existing records (no copy of figures, no Onboard identity); Operations and Orbit never receive it.
 */
export const GROUND_SLEEP_FIRST_FD = 24, GROUND_SLEEP_LAST_FD = 30;
export interface GroundSleepPoint {
  id: string; person: { id: string; name: string }; fd: number; durationMinutes: number; occurredAt: string; receivedAt: string;
  provenance: { adapter: string; version: string; dataClass: string; origin: 'simulated' };
}
export interface GroundSleepTrend { person: { id: string; name: string }; firstFd: number; lastFd: number; expected: number; points: GroundSleepPoint[] }

export function groundSleepTrend(state: Pick<PreviewState, 'processedIds'>, role: GroundRole, time: number, owner: CrewId = OWNER): GroundSleepTrend | null {
  if (role !== 'medical_professional' || !Number.isFinite(time)) return null;
  const crew = CREW.find(c => c.id === owner);
  if (!crew) return null;
  const person = { id: crew.id, name: crew.name };
  // Same gate as the Onboard history: occurrence AND receipt have happened at the cursor (and the wake receipt for FD30).
  const points = SLEEP_RECORDS.filter(r => r.owner === owner && r.fd >= GROUND_SLEEP_FIRST_FD && r.fd <= GROUND_SLEEP_LAST_FD
    && Date.parse(r.occurredAt) <= time && Date.parse(r.receivedAt) <= time && (!r.eventId || state.processedIds.includes(r.eventId)))
    .sort((a, b) => a.fd - b.fd)
    .map((r): GroundSleepPoint => ({ id: r.id, person, fd: r.fd, durationMinutes: r.durationMinutes, occurredAt: r.occurredAt, receivedAt: r.receivedAt,
      provenance: { adapter: r.source.adapter, version: r.source.version, dataClass: r.source.dataClass, origin: 'simulated' } }));
  return { person, firstFd: GROUND_SLEEP_FIRST_FD, lastFd: GROUND_SLEEP_LAST_FD, expected: GROUND_SLEEP_LAST_FD - GROUND_SLEEP_FIRST_FD + 1, points };
}
