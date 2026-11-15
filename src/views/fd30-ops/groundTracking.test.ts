import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { freshPreview, previewReduce } from '../../demo/fd30';
import { groundView, operationalCrew } from './opsSelectors';
import { groundPlanReferences, nextOperationalBlock } from './groundTracking';
import { GroundOrbit } from './GroundOrbit';
import { GroundOverview } from './GroundOverview';

const time = Date.parse('2027-03-10T11:00:00Z');
describe('GND02 projected-plan queries', () => {
  it('uses projected equipment blocks, keeps owner context and excludes expired reservations', () => {
    const crew = operationalCrew(time);
    const rows = groundPlanReferences(crew, 'equipment', null, time);
    expect(rows.map(r => [r.people, r.block.start, r.block.equipment?.en])).toEqual([
      [['Lucía Ferraro'], '2027-03-10T10:30:00Z', 'Ergometer'],
      [['Tomás Ibarra'], '2027-03-10T10:30:00Z', 'Treadmill'],
      [['Mei Okada'], '2027-03-10T13:00:00Z', 'Ergometer'],
    ]);
    expect(groundPlanReferences(crew, 'equipment', 'iss:crew-lf', time)).toEqual([rows[0]]);
    expect(groundPlanReferences(crew, 'equipment', null, Date.parse('2027-03-10T11:30:00Z'))).toEqual([rows[2]]);
    const changed = crew.map(c => ({ ...c, blocks: c.blocks.map(b => b.equipment ? { ...b, start: '2027-03-10T10:45:00Z' } : b) }));
    expect(groundPlanReferences(changed, 'equipment', 'iss:crew-lf', time)[0].block.start).toBe('2027-03-10T10:45:00Z');
  });
  it('answers shared maintenance from canonical membership, not simultaneous activity', () => {
    const crew = operationalCrew(time);
    const rows = groundPlanReferences(crew, 'maintenance', null, time);
    expect(rows).toHaveLength(1);
    expect(rows[0].people).toEqual(['Lucía Ferraro', 'Tomás Ibarra']);
    expect(rows[0].block).toMatchObject({ id: 'iss:fd30:shared:maintenance', start: '2027-03-10T14:00:00Z', end: '2027-03-10T16:00:00Z' });
    expect(groundPlanReferences(crew, 'maintenance', 'iss:crew-lf', time)).toEqual(rows);
    expect(groundPlanReferences(crew, 'maintenance', 'iss:crew-mo', time)).toEqual([]);
    expect(groundPlanReferences([crew[0]], 'maintenance', null, time)).toEqual([]);
    expect(groundPlanReferences(crew.map(c => ({ ...c, blocks: c.blocks.filter(b => b.id !== rows[0].block.id) })), 'maintenance', null, time)).toEqual([]);
  });
  it('finds the next operational block without exposing excluded assessments or changing the crew', () => {
    const crew = operationalCrew(time), snapshot = JSON.stringify(crew);
    expect(nextOperationalBlock(crew[0], time)).toMatchObject({ kind: 'meal', start: '2027-03-10T12:00:00Z' });
    expect(nextOperationalBlock(crew[1], time)?.kind).not.toBe('muscle-assessment');
    expect(nextOperationalBlock(crew[0], Date.parse('2027-03-10T23:59:00Z'))).toBeNull();
    groundPlanReferences(crew, 'equipment', null, time); groundPlanReferences(crew, 'maintenance', null, time);
    expect(JSON.stringify(crew)).toBe(snapshot);
  });
});

describe('GND02 bilingual medical boundary', () => {
  for (const locale of ['en', 'es'] as const) for (const role of ['mission_operator', 'medical_professional'] as const) {
    it(`${locale}/${role}: records and personal identity cannot change Ground or Orbit output`, () => {
      const baseline = freshPreview(1000);
      const privateState = previewReduce(baseline, { type: 'seek', now: 1000, target: Date.parse('2027-03-10T16:20:00Z') });
      privateState.activeCrewId = 'iss:crew-jd';
      for (const profile of Object.values(privateState.profiles)) { profile.draft = 'PRIVATE_SENTINEL'; profile.turns = [{ text: 'PRIVATE_SENTINEL', lang: 'en', reply: 'laboratory' }]; }
      const render = (state: typeof baseline) => {
        const data = groundView(state, role, time)!;
        return renderToStaticMarkup(createElement(I18nProvider, { locale, children: createElement('div', null,
          createElement(GroundOverview, { data, time, onRole: () => {} }),
          createElement(GroundOrbit, { crew: data.crew, role, time, selected: 'iss:crew-lf', onClose: () => {}, onReference: () => {} })) }));
      };
      const out = render(privateState);
      expect(out).toBe(render(baseline));
      expect(out).not.toMatch(/PRIVATE_SENTINEL|John Doe|pulse_bpm|sample-lf|analysis_started|wake-1|data-session|data-sample/);
      expect(out).toContain(locale === 'es' ? 'Consultas predefinidas' : 'Predefined queries');
      expect(out).not.toContain('data-ground-medical'); // Health appears only after opening a person.
    });
  }
});
