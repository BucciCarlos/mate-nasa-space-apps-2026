import { dataOwner } from './fd30';
import type { ProfileId } from './fd30';
import { planFor } from './fd30Plan';
import { CREW_LAB_EVENTS, LAB_EVENTS } from './laboratory';
import type { SampleType } from './laboratory';
import { SLEEP_RECORDS, medianMinutes } from './history/sleep';
import { HYDRATION_EVENTS, HYDRATION_SCENE, hydrationTime } from './hydration';
import type { HydrationEvent } from './hydration';

/** MATE-ALR01: automatic companion notices, derived from the existing FD30 plan, lab events and sleep records. No new data. */
export type NoticeKind = 'lab-ready' | 'lab-received' | 'exercise' | 'sleep' | 'hydration-reminder' | 'hydration-confirm';
export interface CompanionNotice { id: string; kind: NoticeKind; at: number; sampleType?: SampleType }
export const BELOW_MARGIN = 0.05;
export const EXERCISE_LEAD_MS = 15 * 60_000;
const ms = (iso: string) => Date.parse(iso);

/**
 * MATE-HYD02: one scripted scene, for Tomás only. The reminder is the scenario gap after his prior detected intake; the confirmation
 * is the NEXT detected intake itself (its own event time), so it never depends on a timer started by the reminder or on the reminder
 * having been seen. Without a prior intake, an intake after the gap, or a profile outside the scene, there is nothing to say.
 */
export function hydrationNotices(profile: ProfileId, events: readonly HydrationEvent[] = HYDRATION_EVENTS): CompanionNotice[] {
  if (profile !== HYDRATION_SCENE.profile) return [];
  const own = events.filter(e => e.association.status === 'confirmed' && e.association.crewId === profile).sort((a, b) => hydrationTime(a) - hydrationTime(b));
  const prior = own.find(e => e.intakeId === HYDRATION_SCENE.priorIntakeId);
  if (!prior) return [];
  const at = hydrationTime(prior) + HYDRATION_SCENE.gapMs;
  if (own.some(e => hydrationTime(e) > hydrationTime(prior) && hydrationTime(e) <= at)) return [];
  const next = own.find(e => hydrationTime(e) > at);
  return [{ id: `${profile}:${prior.id}:gap-3h`, kind: 'hydration-reminder', at },
    ...(next ? [{ id: `${profile}:${next.id}:confirm`, kind: 'hydration-confirm' as const, at: hydrationTime(next) }] : [])];
}

/** Notices for a profile in time order. Ids include the profile, so John Doe (who mirrors Lucía's records) and Lucía never share one. */
export function companionNotices(profile: ProfileId): CompanionNotice[] {
  const owner = dataOwner(profile);
  const notices: CompanionNotice[] = [];
  // Laboratory: the result-availability event when the sample has one; otherwise only the sample collection (`lab.sample_taken`; never a result).
  const events = [...LAB_EVENTS, ...CREW_LAB_EVENTS].filter(e => e.association.status === 'confirmed' && e.association.crewId === owner);
  for (const sampleId of new Set(events.map(e => e.sampleId))) {
    const own = events.filter(e => e.sampleId === sampleId);
    const result = own.find(e => e.kind === 'lab.result_available'), taken = own.find(e => e.kind === 'lab.sample_taken');
    const event = result ?? taken;
    if (event) notices.push({ id: `${profile}:${event.id}`, kind: result ? 'lab-ready' : 'lab-received', at: Math.max(ms(event.occurredAt), ms(event.receivedAt)), sampleType: event.sampleType });
  }
  // Exercise: 15 minutes before each exercise block of the current plan.
  for (const block of planFor(owner).filter(b => b.kind === 'exercise')) {
    notices.push({ id: `${profile}:${block.id}:lead-15`, kind: 'exercise', at: ms(block.start) - EXERCISE_LEAD_MS });
  }
  // Rest: the third consecutive nightly record below the profile's own reference. Reference = median of its nights before the streak;
  // "below" = more than 5 % shorter. Scenario rule for the demo, not a clinical threshold or a diagnosis.
  const records = SLEEP_RECORDS.filter(r => r.owner === owner).sort((a, b) => a.fd - b.fd);
  const at = (fd: number) => records.find(r => r.fd === fd);
  for (const record of records) {
    const reference = medianMinutes(records.filter(r => r.fd <= record.fd - 3));
    if (reference === null) continue;
    const below = (fd: number) => { const r = at(fd); return !!r && r.durationMinutes < reference * (1 - BELOW_MARGIN); };
    if (below(record.fd) && below(record.fd - 1) && below(record.fd - 2) && !below(record.fd - 3)) {
      notices.push({ id: `${profile}:${record.id}:streak-3`, kind: 'sleep', at: Math.max(ms(record.occurredAt), ms(record.receivedAt)) });
    }
  }
  notices.push(...hydrationNotices(profile));
  return notices.sort((a, b) => a.at - b.at);
}
