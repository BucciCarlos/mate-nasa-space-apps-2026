// "Available now": derived from the single registry (catalogModules.ts), never copied from it.
// A capability is listed only if it is available AND has a route for the perspective being shown.
// The permissions of the host views do not change: the list is the same for both Ground roles.
import type { Capability, CatalogModule, ModuleId, Surface, Text } from './catalogTypes';
import { CATALOG_MODULES } from './catalogModules';

export interface AvailableEntry {
  key: string;
  label: Text;
  note: Text;
  href: string;
  module?: { id: ModuleId; title: Text };
}

/** Where "Sources & evidence" opens in each perspective (same routes as the menus). */
export const EVIDENCE_HREF: Record<Surface, string> = { onboard: '#/onboard/personal/evidence', ground: '#/demo/fd30/ground/evidence' };

const opens = (c: Capability, surface: Surface): string | undefined => (c.status === 'available' ? c.href?.[surface] : undefined);

export function moduleAvailable(surface: Surface): AvailableEntry[] {
  return CATALOG_MODULES.filter(m => m.surfaces.includes(surface)).flatMap(m =>
    m.capabilities.flatMap(c => { const href = opens(c, surface); return href ? [{ key: c.id, label: c.label, note: c.note, href, module: { id: m.id, title: m.title } }] : []; }));
}

/** What stays in a module card: everything that is not already listed under "Available now". */
export function remainingCapabilities(module: CatalogModule, surface: Surface): { shown: Capability[]; moved: Capability[] } {
  const moved = module.capabilities.filter(c => opens(c, surface));
  return { shown: module.capabilities.filter(c => !opens(c, surface)), moved };
}

/** Status levels of a card after the available part moved up: concept always, plus what is still in it. */
export function levelsOfCapabilities(caps: Capability[]): ('available' | 'evidence' | 'concept')[] {
  const present = new Set(caps.map(c => c.status));
  return (['available', 'evidence', 'concept'] as const).filter(s => s === 'concept' || present.has(s));
}
export type { Text };
