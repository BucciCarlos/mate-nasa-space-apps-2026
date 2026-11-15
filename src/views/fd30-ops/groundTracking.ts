import type { OperationalBlock, OperationalCrew } from './opsSelectors';

export type GroundQuery = 'equipment' | 'maintenance';
export interface PlanReference { block: OperationalBlock; people: string[] }

/** Only projected operational data enter these queries; no Onboard session, identity or journal. */
export function groundPlanReferences(crew: readonly OperationalCrew[], query: GroundQuery, selected: string | null, time: number): PlanReference[] {
  if (query === 'equipment') return crew.filter(c => !selected || c.id === selected).flatMap(c =>
    c.blocks.filter(b => b.equipment && Date.parse(b.end) > time).map(block => ({ block, people: [c.name] })),
  ).sort((a, b) => Date.parse(a.block.start) - Date.parse(b.block.start));

  // Identify the canonical maintenance block, not coincident intervals or private event attendance.
  const entries = crew.flatMap(c => c.blocks.filter(b => b.id === 'iss:fd30:shared:maintenance').map(block => ({ person: c, block })));
  if (new Set(entries.map(e => e.person.id)).size < 2 || (selected && !entries.some(e => e.person.id === selected))) return [];
  return [{ block: entries[0].block, people: entries.map(e => e.person.name) }];
}

export function nextOperationalBlock(person: OperationalCrew, time: number) {
  return person.blocks.filter(b => Date.parse(b.start) > time).sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0] ?? null;
}
