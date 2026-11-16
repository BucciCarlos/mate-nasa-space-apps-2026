// MATE-MSK03: MOD-MSK shows the profile's own planned muscle assessment, never as done or as a result.
import { describe, expect, it } from 'vitest';
import { CREW, OWNER, freshPreview, previewReduce } from '../../demo/fd30';
import type { CrewId } from '../../demo/fd30';
import { planFor } from '../../demo/fd30Plan';
import { buildModal } from './catalogModalData';
import { CATALOG_MODULES } from './catalogModules';
import type { CatalogProps } from './catalogTypes';

const at = (hhmm: string) => Date.parse(`2027-03-10T${hhmm}:00Z`);
const st = (hhmm: string, crew: CrewId) => previewReduce(previewReduce(freshPreview(1000, 1), { type: 'seek', target: at(hhmm), now: 1000 }), { type: 'select', crewId: crew });
const onboard = (crew: CrewId, hhmm: string): CatalogProps => ({ perspective: 'onboard', data: { state: st(hhmm, crew), owner: crew, time: at(hhmm) } });
const ground = (role: 'mission_operator' | 'medical_professional'): CatalogProps => ({ perspective: 'ground', role, data: { state: st('12:00', OWNER), owner: OWNER, time: at('12:00') } });
const msk = CATALOG_MODULES.find(m => m.id === 'MOD-MSK')!;
const WIN: Record<string, string> = { 'iss:crew-lf': '13:15', 'iss:crew-ti': '11:30', 'iss:crew-mo': '17:00' };

describe('MSK03 catalog muscle assessment', () => {
  for (const locale of ['en', 'es'] as const) for (const c of CREW) for (const hhmm of ['08:00', '12:00', '23:00']) {
    it(`${c.id} ${locale} ${hhmm}: only own window, agenda link, never done`, () => {
      const m = buildModal(msk, onboard(c.id, hhmm), locale), json = JSON.stringify(m);
      const b = planFor(c.id).filter(x => x.kind === 'muscle-assessment');
      expect(b).toHaveLength(1);
      expect(json).toContain(b[0].title[locale]);
      expect(json).toContain(WIN[c.id]);
      for (const o of CREW) if (o.id !== c.id) expect(json).not.toContain(WIN[o.id] + ' ');
      expect(m.secondary?.href).toBe('#/onboard/personal/agenda');
      expect(m.action?.href).toBe('#/onboard/personal/exercise');
      expect(json).not.toMatch(/completed|realizada el|result:|N\/m|Hz/i);
    });
  }
  it('Ground keeps the current projection: no assessment, no agenda link', () => {
    for (const role of ['mission_operator', 'medical_professional'] as const) for (const locale of ['en', 'es'] as const) {
      const m = buildModal(msk, ground(role), locale), json = JSON.stringify(m);
      expect(json).not.toContain('Muscle assessment scheduled'); expect(json).not.toContain('Evaluación muscular programada');
      expect(m.secondary ?? null).toBeNull();
    }
  });
});
