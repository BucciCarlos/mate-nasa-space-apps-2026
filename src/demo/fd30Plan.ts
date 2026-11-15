import iss from '../data/scenario/iss.json';
import type { Bilingual, ScheduleBlock } from '../state/types';
import type { CrewId } from './fd30';

export const PLAN_VERSION = 'fd30-plan.2';
export const PLAN_SOURCE = 'demo-plan';
export const EQUIPMENT: Record<string, Bilingual> = {
  'demo-ergometer': { en: 'Ergometer', es: 'Ergómetro' },
  'demo-treadmill': { en: 'Treadmill', es: 'Cinta' },
};
export interface Fd30Block extends ScheduleBlock { equipmentId?: string; continuesAfterDay?: boolean }
const slot = (id: string, crewId: CrewId, kind: ScheduleBlock['kind'], start: string, end: string, title: Bilingual, equipmentId?: string): Fd30Block => ({
  id: `iss:fd30:${id}`, missionId: 'iss', crewIds: [crewId], kind,
  start: `2027-03-10T${start}:00Z`, end: end === '24:00' ? '2027-03-11T00:00:00Z' : `2027-03-10T${end}:00Z`, title, movable: false, equipmentId,
});
// Copy only plan data; never mutate the M1 fixture or infer attendance from a reservation.
const evening: Fd30Block[] = (['iss:crew-lf', 'iss:crew-ti', 'iss:crew-mo'] as const).flatMap(owner => [
  slot(`${owner.slice(-2)}:dinner`, owner, 'meal', '18:00', '19:00', { en: 'Evening meal', es: 'Cena' }),
  slot(`${owner.slice(-2)}:personal`, owner, 'personal', '19:00', '21:00', { en: 'Personal time', es: 'Tiempo personal' }),
  slot(`${owner.slice(-2)}:bedtime`, owner, 'pre_sleep', '21:00', '21:30', { en: 'Sleep preparation', es: 'Preparación para dormir' }),
  { ...slot(`${owner.slice(-2)}:rest`, owner, 'sleep', '21:30', '24:00', { en: 'Planned rest', es: 'Descanso planificado' }), continuesAfterDay: true },
]);
export const PLAN_FD30: Fd30Block[] = [
  ...iss.blocks.filter(b => Date.parse(b.end) > Date.parse('2027-03-10T05:55:00Z'))
    .map(b => ({ ...b, crewIds: [...b.crewIds], title: { ...b.title }, movable: false }) as Fd30Block),
  slot('lf:planned-blood', 'iss:crew-lf', 'task', '09:15', '09:20', { en: 'Blood collection planned', es: 'Toma de sangre prevista' }),
  slot('lf:planned-urine', 'iss:crew-lf', 'task', '09:25', '09:30', { en: 'Secondary urine collection planned', es: 'Toma secundaria de orina prevista' }),
  slot('lf:planned-exercise', 'iss:crew-lf', 'exercise', '10:30', '11:30', { en: 'Ergometer reservation', es: 'Reserva de ergómetro' }, 'demo-ergometer'),
  slot('ti:planned-exercise', 'iss:crew-ti', 'exercise', '10:30', '11:30', { en: 'Treadmill reservation', es: 'Reserva de cinta' }, 'demo-treadmill'),
  slot('ti:systems', 'iss:crew-ti', 'task', '09:00', '10:00', { en: 'Commander systems review', es: 'Revisión de sistemas del Comandante' }),
  slot('mo:payload', 'iss:crew-mo', 'task', '10:30', '12:00', { en: 'Payload operations', es: 'Operaciones de carga útil' }),
  { ...slot('shared:maintenance', 'iss:crew-lf', 'task', '14:00', '16:00', { en: 'Station maintenance', es: 'Mantenimiento de la estación' }), crewIds: ['iss:crew-lf', 'iss:crew-ti'] },
  slot('lf:payload', 'iss:crew-lf', 'task', '16:00', '17:30', { en: 'Payload operations follow-up', es: 'Operaciones de carga útil (seguimiento)' }),
  slot('ti:planning', 'iss:crew-ti', 'task', '16:00', '17:00', { en: 'Operational planning review', es: 'Revisión de planificación operativa' }),
  ...evening,
  slot('mo:planned-exercise', 'iss:crew-mo', 'exercise', '13:00', '14:00', { en: 'Ergometer reservation', es: 'Reserva de ergómetro' }, 'demo-ergometer'),
].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

export function planFor(crewId: CrewId): Fd30Block[] {
  return PLAN_FD30.filter(b => b.crewIds.includes(crewId));
}
export function plannedExercise(crewId: CrewId) {
  return planFor(crewId).find(b => b.kind === 'exercise');
}
/** Half-open intervals: adjacent reservations are valid; one machine has capacity one. */
export function validatePlan(blocks: readonly Fd30Block[]): boolean {
  return new Set(blocks.map(b => b.id)).size === blocks.length && blocks.every((b, i) => {
    const start = Date.parse(b.start), end = Date.parse(b.end);
    return Number.isFinite(start) && Number.isFinite(end) && end > start
      && (!b.equipmentId || (Object.hasOwn(EQUIPMENT, b.equipmentId) && b.crewIds.length === 1))
      && blocks.slice(i + 1).every(other => !(start < Date.parse(other.end) && Date.parse(other.start) < end)
        || (!b.crewIds.some(id => other.crewIds.includes(id)) && (!b.equipmentId || b.equipmentId !== other.equipmentId)));
  });
}
