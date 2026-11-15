import { dataOwner } from '../fd30';
import type { CrewId, PreviewState } from '../fd30';
import type { GroundRole } from '../../state/types';
import { labEvents, labPlanSlots, labStatus } from '../laboratory';
import type { LabSample, LabEvent } from '../laboratory';
import { fdDate, FLIGHT_DAY_ONE } from './sleep';

export type LaboratoryRange = 'last7' | 'all';
export type LaboratoryViewer = { perspective: 'onboard'; owner: CrewId } | { perspective: 'ground'; role: GroundRole };
/** Query over existing canonical workflow receipts. No fixture arrivals, values or stored copies. */
export function laboratoryHistory(state: PreviewState, viewer: LaboratoryViewer, cursor: number, range: LaboratoryRange) {
  if (viewer.perspective !== 'onboard' || viewer.owner !== dataOwner(state.activeCrewId) || !Number.isFinite(cursor)) return null;
  const currentFd = Math.floor((cursor - FLIGHT_DAY_ONE) / 86400000) + 1;
  if (currentFd < 1 || currentFd > 30) return null;
  const firstFd = range === 'all' ? 1 : Math.max(1, currentFd - 6);
  const rows = state.laboratory.filter(s => s.crewId === viewer.owner).flatMap(sample => {
    const visible = (e: LabEvent | null) => e && e.association.status === 'confirmed' && e.association.crewId === viewer.owner
      && e.sampleId === sample.id && e.sampleType === sample.sampleType && state.processedIds.includes(e.id)
      && Date.parse(e.occurredAt) <= cursor && Date.parse(e.receivedAt) <= cursor ? e : null;
    const projected: LabSample = { ...sample, collection: visible(sample.collection), analysis: visible(sample.analysis), result: visible(sample.result) };
    const events = labEvents(projected).sort((a,b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
    if (!events.length) return [];
    const first = events[0], latest = events.at(-1)!;
    const fd = Math.floor((Date.parse(first.occurredAt) - FLIGHT_DAY_ONE) / 86400000) + 1;
    // Include a sample when any received milestone falls in the window, retaining visible antecedents in detail.
    if (!events.some(e => e.occurredAt.slice(0,10) >= fdDate(firstFd) && e.occurredAt.slice(0,10) <= fdDate(currentFd))) return [];
    return [{ sample: projected, fd, date: first.occurredAt.slice(0,10), latest, stage: labStatus(projected) }];
  }).sort((a,b) => Date.parse(a.latest.occurredAt) - Date.parse(b.latest.occurredAt));
  const records = [...new Map(rows.map(row => [row.sample.id, row])).values()];
  const days = Array.from({ length: currentFd - firstFd + 1 }, (_, i) => {
    const fd = firstFd + i;
    const samples = records.filter(row => labEvents(row.sample).some(e => e.occurredAt.slice(0,10) === fdDate(fd)));
    // Only FD30 has current plan coverage (each owner's own planned collections). Earlier empty days have unknown coverage.
    const plans = fd === 30 ? labPlanSlots(viewer.owner) : [];
    return { fd, samples, plans, status: samples.length ? 'recorded' : fd === 30 && !plans.length ? 'no_activity' : 'no_record' };
  });
  return { owner: viewer.owner, firstFd, currentFd, records, days };
}
