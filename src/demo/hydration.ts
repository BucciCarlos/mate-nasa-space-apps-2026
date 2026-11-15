import { dataOwner } from './fd30';
import type { CrewId, ProfileId } from './fd30';

/**
 * MATE-HYD02: simulated water-intake detections. The demo SIMULATES cameras detecting an intake; no camera is read.
 * A record is one detected intake (a count of 1): no volume, no target, no hydration state. Like the SpO2 cycle, these are
 * scenario data kept outside DAY_EVENTS, so "Next event", Ground and the stored preview state are untouched, and every value
 * is a pure function of the mission cursor (it follows a drag or a rewind by construction).
 */
export const HYDRATION_VERSION = 'mate-hydration.1';
export const HYDRATION_SOURCE = 'demo-camera-sim';
/** Drawing scale only: this many intakes would fill the glass. It is never shown, never a target; a test keeps every day below it. */
export const VISUAL_CAPACITY = 10;
export interface HydrationEvent {
  id: string; missionId: 'iss'; scenarioSequence: number; kind: 'hydration.intake_detected'; sourceId: typeof HYDRATION_SOURCE; origin: 'simulated';
  occurredAt: string; receivedAt: string; association: { status: 'confirmed'; crewId: CrewId }; intakeId: string; measurement: null;
}
let sequence = 100;
const intakes = (crewId: CrewId, tag: string, times: readonly string[]): HydrationEvent[] => times.map((time, i) => {
  const intakeId = `iss:hyd-${tag}-${i + 1}`;
  return { id: `${intakeId}:hydration.intake_detected`, missionId: 'iss', scenarioSequence: sequence++, kind: 'hydration.intake_detected', sourceId: HYDRATION_SOURCE,
    origin: 'simulated', occurredAt: `2027-03-10T${time}:00Z`, receivedAt: `2027-03-10T${time}:00Z`, association: { status: 'confirmed', crewId }, intakeId, measurement: null };
});
// Times sit inside awake, unscheduled-for-sleep parts of each agenda. Tomás: four intakes, the last at 14:20; the fifth (17:25) closes the scene.
export const HYDRATION_EVENTS: readonly HydrationEvent[] = [
  ...intakes('iss:crew-lf', 'lf', ['06:50', '09:40', '11:40', '14:35', '16:30', '19:30']),
  ...intakes('iss:crew-ti', 'ti', ['06:45', '09:25', '12:20', '14:20', '17:25', '19:40']),
  ...intakes('iss:crew-mo', 'mo', ['06:55', '09:45', '12:30', '14:15', '17:40', '19:35']),
];
/** The only profile with the reminder → confirmation scene. A scenario rule (3 h without a detected intake), not a clinical threshold. */
export const HYDRATION_SCENE = { profile: 'iss:crew-ti' as ProfileId, priorIntakeId: 'iss:hyd-ti-4', gapMs: 3 * 3_600_000 } as const;

export const hydrationTime = (e: HydrationEvent) => Math.max(Date.parse(e.occurredAt), Date.parse(e.receivedAt));
/** Intakes of this profile's records detected at or before the cursor. John Doe reads Lucía's. */
export function hydrationCount(profile: ProfileId, time: number, events: readonly HydrationEvent[] = HYDRATION_EVENTS): number {
  const owner = dataOwner(profile);
  return events.filter(e => e.association.status === 'confirmed' && e.association.crewId === owner && hydrationTime(e) <= time).length;
}
/** Glass fill, 0–1, on the fixed drawing scale. */
export const hydrationLevel = (count: number) => Math.max(0, Math.min(VISUAL_CAPACITY, count)) / VISUAL_CAPACITY;
