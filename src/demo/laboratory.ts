import type { CrewId, PreviewState } from './fd30';

export const LAB_VERSION = 'fd30-imp04.1';
export const BLOOD_SAMPLE = 'iss:sample-lf-b1';
export const URINE_SAMPLE = 'iss:sample-lf-u1';
export const HISTORICAL_BLOOD_SAMPLE = 'iss:history:lf:blood-fd29';
export type SampleType = 'blood' | 'urine';
export type LabKind = 'lab.sample_taken' | 'lab.analysis_started' | 'lab.result_available';
export interface LabEvent {
  id: string; missionId: string; scenarioSequence: number; kind: LabKind;
  sourceId: string; origin: 'simulated'; occurredAt: string; receivedAt: string;
  association: { status: 'confirmed' | 'unconfirmed'; crewId?: string };
  sampleId: string; sampleType: SampleType; measurement: null;
  sourceReview?: 'flagged' | 'not_flagged' | 'not_reported';
  handlingStatus?: 'stored_awaiting_analysis' | 'not_reported';
}
function event(kind: LabKind, sampleType: SampleType, time: string, sequence: number, sampleId = sampleType === 'blood' ? BLOOD_SAMPLE : URINE_SAMPLE, crewId: CrewId = 'iss:crew-lf'): LabEvent {
  return { id: `${sampleId}:${kind}`, missionId: 'iss', scenarioSequence: sequence, kind,
    sourceId: kind === 'lab.sample_taken' ? 'demo-collection' : 'demo-analyzer', origin: 'simulated',
    occurredAt: `2027-03-10T${time}:00Z`, receivedAt: `2027-03-10T${time}:00Z`,
    association: { status: 'confirmed', crewId }, sampleId, sampleType, measurement: null };
}
export const LAB_EVENTS: readonly LabEvent[] = [
  event('lab.sample_taken', 'blood', '09:15', 2),
  event('lab.analysis_started', 'blood', '09:20', 3),
  event('lab.sample_taken', 'urine', '09:25', 4),
  event('lab.analysis_started', 'urine', '09:30', 5),
  event('lab.result_available', 'blood', '11:45', 8),
  event('lab.result_available', 'urine', '11:50', 9),
];
/**
 * LAB04: own fictional scenario records for Tomás and Mei. They are separate samples with their own IDs, owners, plans and
 * times; nothing is copied from Lucía's samples and no value is ever produced.
 * Tomás: one blood sample (planned 13:15, taken 13:15, analysis 13:20, result AVAILABILITY reported 15:45, no values).
 * Mei: one urine sample (planned 16:15, taken 16:15, analysis 16:20, no result in the scripted day).
 * Times sit in free windows of their agendas (Tomás 13:00–14:00 after the midday meal; Mei 16:00–18:00 after sample processing).
 */
export const TI_BLOOD_SAMPLE = 'iss:sample-ti-b1';
export const MO_URINE_SAMPLE = 'iss:sample-mo-u1';
export const CREW_LAB_EVENTS: readonly LabEvent[] = [
  event('lab.sample_taken', 'blood', '13:15', 10, TI_BLOOD_SAMPLE, 'iss:crew-ti'),
  event('lab.analysis_started', 'blood', '13:20', 11, TI_BLOOD_SAMPLE, 'iss:crew-ti'),
  event('lab.result_available', 'blood', '15:45', 12, TI_BLOOD_SAMPLE, 'iss:crew-ti'),
  event('lab.sample_taken', 'urine', '16:15', 13, MO_URINE_SAMPLE, 'iss:crew-mo'),
  event('lab.analysis_started', 'urine', '16:20', 14, MO_URINE_SAMPLE, 'iss:crew-mo'),
];
export const LAB_HISTORY: LabEvent = {
  id: `${HISTORICAL_BLOOD_SAMPLE}:lab.sample_taken`, missionId: 'iss', scenarioSequence: 1,
  kind: 'lab.sample_taken', sourceId: 'demo-history', origin: 'simulated',
  occurredAt: '2027-03-09T09:15:00Z', receivedAt: '2027-03-09T09:15:00Z',
  association: { status: 'confirmed', crewId: 'iss:crew-lf' },
  sampleId: HISTORICAL_BLOOD_SAMPLE, sampleType: 'blood', measurement: null, handlingStatus: 'stored_awaiting_analysis',
};
export const LAB_PLAN = {
  blood: { id: 'iss:fd30:lf:planned-blood', start: '2027-03-10T09:15:00Z', end: '2027-03-10T09:20:00Z' },
  urine: { id: 'iss:fd30:lf:planned-urine', start: '2027-03-10T09:25:00Z', end: '2027-03-10T09:30:00Z' },
} as const;
export interface LabPlanSlot { id: string; start: string; end: string; sampleId: string }
/** Planned FD30 collection per owner and sample type. A plan is not a collection and never implies a state. */
export const LAB_PLANS: Record<CrewId, Partial<Record<SampleType, LabPlanSlot>>> = {
  'iss:crew-lf': { blood: { ...LAB_PLAN.blood, sampleId: BLOOD_SAMPLE }, urine: { ...LAB_PLAN.urine, sampleId: URINE_SAMPLE } },
  'iss:crew-ti': { blood: { id: 'iss:fd30:ti:planned-lab', start: '2027-03-10T13:15:00Z', end: '2027-03-10T13:20:00Z', sampleId: TI_BLOOD_SAMPLE } },
  'iss:crew-mo': { urine: { id: 'iss:fd30:mo:planned-lab', start: '2027-03-10T16:15:00Z', end: '2027-03-10T16:20:00Z', sampleId: MO_URINE_SAMPLE } },
};
export const labPlanSlots = (owner: CrewId): (LabPlanSlot & { sampleType: SampleType })[] =>
  (['blood', 'urine'] as const).flatMap(sampleType => { const slot = LAB_PLANS[owner]?.[sampleType]; return slot ? [{ ...slot, sampleType }] : []; });
export const LAB_PLAN_IDS: readonly string[] = (Object.keys(LAB_PLANS) as CrewId[]).flatMap(owner => labPlanSlots(owner).map(slot => slot.id));
export interface LabSample {
  id: string; crewId: CrewId; sampleType: SampleType;
  collection: LabEvent | null; analysis: LabEvent | null; result: LabEvent | null;
}
export function initialLab(): LabSample[] {
  return [{ id: HISTORICAL_BLOOD_SAMPLE, crewId: 'iss:crew-lf', sampleType: 'blood', collection: LAB_HISTORY, analysis: null, result: null }];
}
export function labSamples(state: PreviewState, crewId: CrewId): LabSample[] {
  return state.laboratory.filter(s => s.crewId === crewId);
}
export function labEvents(sample: LabSample): LabEvent[] {
  return [sample.collection, sample.analysis, sample.result].filter((e): e is LabEvent => e !== null);
}
export function labIncomplete(sample: LabSample): boolean {
  return (!!sample.analysis && !sample.collection) || (!!sample.result && (!sample.collection || !sample.analysis));
}
export function labStatus(sample: LabSample | undefined) {
  return sample?.result ? 'result' : sample?.analysis ? 'analysis' : sample?.collection ? 'collection' : 'planned';
}
const stageFor = { 'lab.sample_taken': 0, 'lab.analysis_started': 1, 'lab.result_available': 2 } as const;
const fieldFor = { 'lab.sample_taken': 'collection', 'lab.analysis_started': 'analysis', 'lab.result_available': 'result' } as const;
const ownerIds = ['iss:crew-lf', 'iss:crew-ti', 'iss:crew-mo'];
function validEnvelope(e: LabEvent, historical = false): boolean {
  return typeof e.id === 'string' && e.id.startsWith('iss:') && e.missionId === 'iss'
    && typeof e.sampleId === 'string' && e.sampleId.startsWith('iss:')
    && ['blood', 'urine'].includes(e.sampleType) && Object.hasOwn(fieldFor, e.kind)
    && e.sourceId === (historical ? 'demo-history' : e.kind === 'lab.sample_taken' ? 'demo-collection' : 'demo-analyzer')
    && e.origin === 'simulated' && e.measurement === null && Number.isInteger(e.scenarioSequence)
    && Number.isFinite(Date.parse(e.occurredAt)) && Number.isFinite(Date.parse(e.receivedAt))
    && Date.parse(e.receivedAt) >= Date.parse(e.occurredAt)
    && (e.sourceReview === undefined || ['flagged', 'not_flagged', 'not_reported'].includes(e.sourceReview))
    && (e.handlingStatus === undefined || ['stored_awaiting_analysis', 'not_reported'].includes(e.handlingStatus));
}
/** Local workflow ingestion never fabricates predecessors, measurements, review flags or a recipient. */
export function ingestLab(state: PreviewState, events: readonly LabEvent[], missionTime: number): PreviewState {
  let result = state;
  const ordered = [...events].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.scenarioSequence - b.scenarioSequence);
  for (const e of ordered) {
    if (result.processedIds.includes(e.id) || Date.parse(e.occurredAt) > missionTime || Date.parse(e.receivedAt) > missionTime) continue;
    const unassigned = e.association?.status !== 'confirmed' || !ownerIds.includes(e.association.crewId ?? '');
    const existing = result.laboratory.find(s => s.id === e.sampleId);
    const field = fieldFor[e.kind];
    const predecessors = existing ? labEvents(existing) : [];
    const backwards = existing && (existing.id === HISTORICAL_BLOOD_SAMPLE || existing.crewId !== e.association?.crewId || existing.sampleType !== e.sampleType || existing[field]
      || predecessors.some(p => stageFor[p.kind] >= stageFor[e.kind] || p.scenarioSequence >= e.scenarioSequence || Date.parse(p.occurredAt) > Date.parse(e.occurredAt)));
    result = { ...result, processedIds: [...result.processedIds, e.id] };
    if (!validEnvelope(e) || unassigned || backwards) {
      result = { ...result, diagnostics: [...result.diagnostics, { eventId: e.id, sourceId: e.sourceId, status: unassigned ? 'unassigned' : 'rejected' }] };
      continue;
    }
    const sample: LabSample = { ...(existing ?? { id: e.sampleId, crewId: e.association.crewId as CrewId, sampleType: e.sampleType, collection: null, analysis: null, result: null }), [field]: e };
    result = { ...result, laboratory: [...result.laboratory.filter(s => s.id !== sample.id), sample] };
  }
  return result;
}
export function validLab(samples: LabSample[]): boolean {
  return samples.every(s => s && (s.id !== HISTORICAL_BLOOD_SAMPLE || (s.crewId === LAB_HISTORY.association.crewId
      && JSON.stringify(s.collection) === JSON.stringify(LAB_HISTORY) && s.analysis === null && s.result === null))
    && ownerIds.includes(s.crewId) && ['blood', 'urine'].includes(s.sampleType)
    && labEvents(s).length > 0 && [s.collection, s.analysis, s.result].every((e, i) => e === null
      || (validEnvelope(e, s.id === HISTORICAL_BLOOD_SAMPLE) && fieldFor[e.kind] === ['collection', 'analysis', 'result'][i]
        && e.association?.status === 'confirmed' && e.association.crewId === s.crewId && e.sampleId === s.id && e.sampleType === s.sampleType)));
}
