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

export type ReservationPhase = 'current' | 'upcoming';
const phaseOf = (block: OperationalBlock, time: number): ReservationPhase => Date.parse(block.start) <= time ? 'current' : 'upcoming';
/** Summary shared by the card and the person detail. Everything is plan: no attendance, execution or equipment use is inferred. */
export function crewHeadline(person: OperationalCrew, time: number) {
  const reservation = person.blocks.find(b => b.equipment && Date.parse(b.end) > time) ?? null;
  return { current: person.current, progress: person.progress, next: nextOperationalBlock(person, time),
    reservation: reservation ? { block: reservation, phase: phaseOf(reservation, time) } : null };
}

/** One row per resource named in the projected plan; a resource with no remaining reservation keeps its row. */
export function resourceReservations(crew: readonly OperationalCrew[], time: number) {
  const rows = new Map<string, { name: OperationalBlock['equipment'] & {}; entries: { person: string; block: OperationalBlock; phase: ReservationPhase }[] }>();
  for (const person of crew) for (const block of person.blocks) {
    if (!block.equipment) continue;
    const row = rows.get(block.equipment.en) ?? { name: block.equipment, entries: [] };
    if (Date.parse(block.end) > time) row.entries.push({ person: person.name, block, phase: phaseOf(block, time) });
    rows.set(block.equipment.en, row);
  }
  return [...rows.values()].map(row => ({ ...row, entries: row.entries.sort((a, b) => Date.parse(a.block.start) - Date.parse(b.block.start)) }));
}

/** Shared by canonical block identity (the same projected block id in two or more people), never by coincident times. */
export function sharedBlocks(crew: readonly OperationalCrew[], time: number) {
  const byId = new Map<string, { block: OperationalBlock; people: string[] }>();
  for (const person of crew) for (const block of person.blocks) {
    const entry = byId.get(block.id) ?? { block, people: [] };
    entry.people.push(person.name); byId.set(block.id, entry);
  }
  return [...byId.values()].filter(e => e.people.length > 1 && Date.parse(e.block.end) > time)
    .map(e => ({ ...e, phase: phaseOf(e.block, time) })).sort((a, b) => Date.parse(a.block.start) - Date.parse(b.block.start));
}
