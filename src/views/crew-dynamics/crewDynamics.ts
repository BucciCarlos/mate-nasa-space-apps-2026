import { CREW, DAY_START, DAY_END, dataOwner } from '../../demo/fd30';
import type { CrewId, PreviewState } from '../../demo/fd30';
import type { GroundRole } from '../../state/types';
import { groundView, operationalPlan } from '../fd30-ops/opsSelectors';

export type CrewViewer = { perspective: 'onboard'; owner: CrewId } | { perspective: 'ground'; role: GroundRole };
export type CrewRange = 7 | 30;
/** Only schedule identity, membership, intervals and the planned-rest flag cross this boundary. */
export interface CrewSlot { id: string; owner: CrewId; start: number; end: number; rest: boolean }
export interface CrewInterval {
  owner: CrewId; start: number; end: number; rest: boolean;
  sharedWith: CrewId[]; simultaneousWith: CrewId[];
}
export function crewSlots(): CrewSlot[] {
  return CREW.flatMap(c => operationalPlan(c.id).map(b => ({
    id: b.id, owner: c.id, start: Math.max(DAY_START, Date.parse(b.start)),
    end: Math.min(DAY_END, Date.parse(b.end)), rest: b.kind === 'sleep',
  }))).filter(b => b.start < b.end);
}
/** Sweep half-open intervals. Each person's covered minute is counted once, including triple overlaps.
 * Shared membership comes ONLY from the same canonical block id in multiple operational lanes.
 * Distinct blocks at the same time never imply a shared activity. Gaps are not solitary activity.
 */
export function crewIntervals(slots: readonly CrewSlot[]): CrewInterval[] {
  const valid = slots.filter(b => Number.isFinite(b.start) && Number.isFinite(b.end) && b.start < b.end);
  const points = [...new Set(valid.flatMap(b => [b.start, b.end]))].sort((a, b) => a - b);
  return CREW.flatMap(({ id: owner }) => {
    const rows: CrewInterval[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i], end = points[i + 1];
      const active = valid.filter(b => b.start <= start && b.end >= end);
      const own = active.filter(b => b.owner === owner);
      if (!own.length) continue;
      const peers = CREW.map(c => c.id).filter(id => id !== owner && active.some(b => b.owner === id));
      const sharedWith = peers.filter(id => active.some(b => b.owner === id && own.some(o => o.id === b.id)));
      const simultaneousWith = peers.filter(id => !sharedWith.includes(id));
      const rest = own.some(b => b.rest);
      const previous = rows.at(-1);
      if (previous && previous.end === start && previous.rest === rest
        && previous.sharedWith.join() === sharedWith.join() && previous.simultaneousWith.join() === simultaneousWith.join()) previous.end = end;
      else rows.push({ owner, start, end, rest, sharedWith, simultaneousWith });
    }
    return rows;
  });
}
export function crewTotals(rows: readonly CrewInterval[], owner: CrewId) {
  return rows.filter(r => r.owner === owner).reduce((total, r) => {
    const minutes = (r.end - r.start) / 60_000;
    total.planned += minutes;
    if (r.sharedWith.length) total.shared += minutes;
    if (r.sharedWith.length || r.simultaneousWith.length) total.overlap += minutes;
    else total.withoutOverlap += minutes;
    if (r.rest) total.rest += minutes;
    return total;
  }, { planned: 0, shared: 0, overlap: 0, withoutOverlap: 0, rest: 0 });
}
export function crewDynamics(state: PreviewState, viewer: CrewViewer, range: CrewRange) {
  if (viewer.perspective === 'onboard') {
    if (viewer.owner !== dataOwner(state.activeCrewId) || !CREW.some(c => c.id === viewer.owner)) return null;
  } else if (viewer.perspective !== 'ground' || !groundView(state, viewer.role, DAY_START)) return null;
  return { firstFd: range === 7 ? 24 : 1, lastFd: 30, coveredFd: 30, rows: crewIntervals(crewSlots()) };
}
