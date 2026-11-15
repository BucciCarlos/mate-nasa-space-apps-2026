import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n/I18nProvider';
import { GroundCards } from '../views/ground/GroundCards';
import { CATALOG_MODULES } from '../views/catalog/catalogModules';
import { ModuleCatalog } from '../views/catalog/ModuleCatalog';
import { groundAgendaLanes } from './Fd30GroundAgenda';
import { planFor } from './fd30Plan';
import { SCHEDULE_END, SCHEDULE_START } from './fd30Schedule';

const range = { start: new Date(SCHEDULE_START).toISOString(), end: new Date(SCHEDULE_END).toISOString() };
describe('Public Ground agenda operational boundary', () => {
  it('projects all three existing agendas, with equipment and no editing or private collection labels', () => {
    const lanes = groundAgendaLanes();
    expect(lanes.map(l => l.crew.name)).toEqual(['Lucía Ferraro', 'Tomás Ibarra', 'Mei Okada']);
    for (const lane of lanes) {
      expect(lane.blocks.map(b => b.id)).toEqual(planFor(lane.crew.id).map(b => b.id));
      expect(lane.blocks.every(b => !b.movable)).toBe(true);
      expect(JSON.stringify(lane.blocks)).not.toMatch(/Blood collection|Toma de sangre|urine collection|Toma secundaria de orina|pulse|heartRate/);
    }
    expect(lanes[0].blocks.find(b => b.equipment)?.equipment?.en).toBe('Fictional ergometer');
    expect(lanes[1].blocks.find(b => b.equipment)?.equipment?.en).toBe('Fictional treadmill');
  });
  it('reuses cards with inspection controls, keeping legacy movable-task behavior intact', () => {
    for (const locale of ['en', 'es'] as const) {
      const render = (selectAll?: { label: string; ariaLabel: (s: string) => string }) => renderToStaticMarkup(createElement(I18nProvider, { locale,
        children: createElement(GroundCards, { range, lanes: groundAgendaLanes(), selectedId: null, onSelect: () => {}, selectAll }) }));
      expect(render()).not.toContain('<button'); // default unmovable cards remain unchanged for internal M1
      const publicCards = render({ label: 'Detail', ariaLabel: title => title });
      for (const lane of groundAgendaLanes()) expect(publicCards).toContain(lane.crew.name);
      expect(publicCards).toContain('<button');
      expect(publicCards).not.toMatch(/advance it|adelantarla|sendUpdate|queued|medical_summary/);
    }
  });
  it('keeps Autonomy conceptual and exposes no legacy links from either Catalog perspective', () => {
    const autonomy = CATALOG_MODULES.find(m => m.id === 'MOD-AUTONOMY')!;
    expect(autonomy.capabilities.every(c => c.status === 'concept' && !c.href)).toBe(true);
    for (const locale of ['en', 'es'] as const) for (const perspective of ['onboard', 'ground'] as const) {
      const props = perspective === 'onboard' ? { perspective } : { perspective, role: 'mission_operator' as const };
      const html = renderToStaticMarkup(createElement(I18nProvider, { locale, children: createElement(ModuleCatalog, props) }));
      expect(html).not.toMatch(/href="#\/(ground|onboard\/(agenda|today|observations))|\(M1\)/);
      expect(html).toContain(perspective === 'ground' ? '#/demo/fd30/ground/evidence' : '#/onboard/personal/evidence');
    }
  });
});
