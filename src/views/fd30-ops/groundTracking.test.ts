import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { freshPreview, previewReduce } from '../../demo/fd30';
import { groundView, operationalCrew } from './opsSelectors';
import { groundPlanReferences, nextOperationalBlock, crewHeadline, resourceReservations, sharedBlocks } from './groundTracking';
import { GroundHeadline, GroundResources } from './GroundOpsPanels';
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
      const baseline = freshPreview(1000, 1);
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

describe('OPS02 operational summary, resources and shared blocks', () => {
  const at = (hhmm: string) => Date.parse(`2027-03-10T${hhmm}:00Z`);
  it('summarises the planned block, next block and current or upcoming reservation at 11:00', () => {
    const [lf, ti, mo] = operationalCrew(time).map(c => crewHeadline(c, time));
    expect([lf, ti, mo].map(h => h.current?.title.en)).toEqual(['Ergometer reservation', 'Treadmill reservation', 'Payload operations']);
    expect([lf, ti, mo].map(h => h.reservation && [h.reservation.block.equipment?.en, h.reservation.phase])).toEqual([['Ergometer', 'current'], ['Treadmill', 'current'], ['Ergometer', 'upcoming']]);
    expect([lf, ti, mo].map(h => h.next?.title.en)).toEqual(['Midday meal', 'Midday meal', 'Midday meal']);
  });
  it('reports the 11:30–12:00 gap without inventing a block or a reservation', () => {
    const [lf, ti] = operationalCrew(at('11:45')).map(c => crewHeadline(c, at('11:45')));
    for (const h of [lf, ti]) { expect(h.current).toBeNull(); expect(h.progress).toBeNull(); expect(h.reservation).toBeNull(); expect(h.next?.title.en).toBe('Midday meal'); }
  });
  it('groups reservations by resource and keeps resources with none remaining', () => {
    const rows = resourceReservations(operationalCrew(at('11:45')), at('11:45'));
    expect(rows.map(r => [r.name.en, r.entries.map(e => [e.person, e.phase])])).toEqual([['Ergometer', [['Mei Okada', 'upcoming']]], ['Treadmill', []]]);
  });
  it('derives shared blocks from the common block id, not from coincident times', () => {
    const shared = sharedBlocks(operationalCrew(time), time);
    expect(shared.map(s => [s.block.title.en, s.people.length, s.phase])).toEqual([['Midday meal', 3, 'upcoming'], ['Station maintenance', 2, 'upcoming']]);
    // Mei's Sample processing overlaps the maintenance block in time but is a different block.
    expect(shared.some(s => s.block.id === 'iss:blk-20')).toBe(false);
  });
  it('renders elapsed time with its own label, reservation phases and no-reservation text in both languages', () => {
    const crew = operationalCrew(time);
    for (const [locale, texts] of [['en', ['Current reservation', 'Upcoming reservation', 'elapsed time of the planned block', 'Reservations by resource']], ['es', ['Reserva vigente', 'Próxima reserva', 'tiempo transcurrido del bloque previsto', 'Reservas por recurso']]] as const) {
      const html = renderToStaticMarkup(createElement(I18nProvider, { locale, children: createElement('div', null,
        ...crew.map(c => createElement(GroundHeadline, { key: c.id, person: c, time })), createElement(GroundResources, { crew, time, onInspect: () => undefined })) }));
      for (const text of texts) expect(html).toContain(text);
      expect(html).not.toMatch(/progreso de la actividad|activity progress|conflict|conflicto/i);
    }
    const late = at('16:30'), html = renderToStaticMarkup(createElement(I18nProvider, { locale: 'es', children: createElement(GroundResources, { crew: operationalCrew(late), time: late, onInspect: () => undefined }) }));
    expect(html).toContain('Sin reserva en el plan');
  });
});
