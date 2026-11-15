import { CREW } from '../../demo/fd30';
import type { CrewId, PreviewState } from '../../demo/fd30';
import { EQUIPMENT, planFor } from '../../demo/fd30Plan';
import { LAB_PLAN } from '../../demo/laboratory';
import type { Bilingual, GroundRole, ScheduleBlock } from '../../state/types';
import { COMMANDER, visibleRequests } from './opsState';
import type { OpsState } from './opsState';

export interface OperationalBlock { id: string; kind: ScheduleBlock['kind']; title: Bilingual; start: string; end: string; equipment: Bilingual | null; continuesAfterDay?: boolean }
const personalTitle: Bilingual = { en: 'Planned personal activity', es: 'Actividad personal planificada' };
export function operationalPlan(owner: CrewId): OperationalBlock[] {
  return planFor(owner).map(b => ({ id: b.id, kind: b.kind, start: b.start, end: b.end,
    ...(b.continuesAfterDay ? { continuesAfterDay: true } : {}),
    title: { ...(b.id === LAB_PLAN.blood.id || b.id === LAB_PLAN.urine.id ? personalTitle : b.title) }, equipment: b.equipmentId ? { ...EQUIPMENT[b.equipmentId] } : null }));
}
export function operationalCrew(time: number) {
  return CREW.map(c => {
    const blocks = operationalPlan(c.id);
    const current = blocks.find(b => Date.parse(b.start) <= time && time < Date.parse(b.end)) ?? null;
    const reservation = blocks.find(b => b.equipment && Date.parse(b.end) > time) ?? null;
    const progress = current ? Math.max(0, Math.min(100, Math.floor((time - Date.parse(current.start)) / (Date.parse(current.end) - Date.parse(current.start)) * 100))) : null;
    return { id: c.id, name: c.name, blocks, current, reservation, progress };
  });
}
export type OperationalCrew = ReturnType<typeof operationalCrew>[number];
export function commanderView(ops: OpsState, viewer: CrewId, time: number) {
  if (viewer !== COMMANDER) return null;
  return { crew: operationalCrew(time), requests: visibleRequests(ops, viewer, time).map(r => ({ id: r.id, owner: r.owner, recipient: r.recipient,
    kind: r.kind, text: r.text, lang: r.lang, title: { ...r.title }, start: r.start, end: r.end, sentAt: r.sentAt })) };
}

/** Both roles get the operational plan only. There are no consented, delivered FD30 medical summaries. */
export function groundView(_state: PreviewState, role: GroundRole, time: number) {
  if (role !== 'mission_operator' && role !== 'medical_professional') return null;
  return { role, crew: operationalCrew(time), medicalSummaries: [] as readonly never[] };
}
