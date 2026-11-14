import type { MissionId } from '../state/types';

export const MISSION_PREFIX: Record<MissionId, string> = { iss: 'iss', cislunar: 'cis' };

export function makeId(missionId: MissionId, kind: string, n: number): string {
  return `${MISSION_PREFIX[missionId]}:${kind}-${n}`;
}

export function belongsTo(id: string, missionId: MissionId): boolean {
  return id.startsWith(`${MISSION_PREFIX[missionId]}:`);
}
