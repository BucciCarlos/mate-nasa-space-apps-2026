import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { CREW, OWNER, freshPreview, previewReduce } from '../../demo/fd30';
import type { CrewId } from '../../demo/fd30';
import { exerciseHistory } from '../../demo/history/exercise';
import { buildModal } from './catalogModalData';
import type { ModalContent } from './catalogModalData';
import { CatalogModal } from './CatalogModal';
import { CATALOG_MODULES } from './catalogModules';
import type { CatalogProps } from './catalogTypes';

const TI = 'iss:crew-ti' as const, MO = 'iss:crew-mo' as const;
const at = (hhmm: string) => Date.parse(`2027-03-10T${hhmm}:00Z`);
const stateFor = (hhmm: string, crew: CrewId) => previewReduce(previewReduce(freshPreview(1000, 1), { type: 'seek', target: at(hhmm), now: 1000 }), { type: 'select', crewId: crew });
const onboard = (crew: CrewId, hhmm: string): CatalogProps => ({ perspective: 'onboard', data: { state: stateFor(hhmm, crew), owner: crew, time: at(hhmm) } });
const ground = (role: 'mission_operator' | 'medical_professional', hhmm = '12:00'): CatalogProps => ({ perspective: 'ground', role, data: { state: stateFor(hhmm, OWNER), owner: OWNER, time: at(hhmm) } });
const mod = (id: string) => CATALOG_MODULES.find(m => m.id === id)!;
const build = (id: string, props: CatalogProps, locale: 'en' | 'es' = 'en') => buildModal(mod(id), props, locale);
const text = (c: ModalContent) => JSON.stringify(c);
const all: [string, CatalogProps][] = [['Lucía', onboard(OWNER, '12:00')], ['Tomás', onboard(TI, '12:00')], ['Mei', onboard(MO, '12:00')], ['Operations', ground('mission_operator')], ['Medicine', ground('medical_professional')], ['no data', { perspective: 'onboard' }]];

describe('CAT08 catalog dialogs: content', () => {
  it('has a real dialog for each of the 14 cards, in every perspective and language, never empty', () => {
    expect(CATALOG_MODULES).toHaveLength(14);
    for (const [name, props] of all) for (const locale of ['en', 'es'] as const) for (const m of CATALOG_MODULES) {
      const c = buildModal(m, props, locale);
      expect(c.title, `${name} ${m.id}`).toBe(m.title[locale]);
      expect(c.first.length).toBeGreaterThan(20); expect(c.why.length).toBeGreaterThan(40);
      expect(c.missing.length).toBeGreaterThan(0);
      expect(c.sections.some(s => s.cls === 'context')).toBe(true); // every dialog says what is context
      expect(c.source.url).toMatch(/^https:\/\//);
      // No clinical judgement, threshold or alert language in any dialog.
      // (Registry context may say what is NOT done, e.g. "no derived alerts"; the dialog's own text and data never use this language.)
      const own = [c.first, c.why, c.scope, ...c.sections.filter(x => x.cls !== 'context').flatMap(x => [...x.lines, ...x.items])].join(' ');
      expect(own, `${name} ${m.id}`).not.toMatch(/\bnormal\b|\bapto\b|\balert|alarm|threshold|umbral|healthy|saludable/i);
    }
  });
  it('reads the active profile on board: Lucía, Tomás and Mei see their own exercise, samples and plan', () => {
    for (const [crew, hhmm] of [[OWNER, '12:00'], [TI, '12:00'], [MO, '12:00']] as const) {
      const props = onboard(crew, hhmm), view = exerciseHistory(props.perspective === 'onboard' ? props.data!.state : freshPreview(0, 1), { perspective: 'onboard', owner: crew }, at(hhmm), 'last7')!;
      const msk = build('MOD-MSK', props);
      expect(msk.sections[0].lines[0]).toBe(`${view.records.length} sessions in 7 days`);
      expect(msk.sections[0].chart).toMatchObject({ kind: 'bars' });
      expect(msk.action?.href).toBe('#/onboard/personal/exercise');
      expect(build('MOD-NUTR', props).sections[0].items.every(i => /UTC/.test(i))).toBe(true);
    }
    const sleepers = (crew: CrewId) => build('MOD-NUTR', onboard(crew, '12:00')).sections[0].items.join('|');
    expect(sleepers(OWNER)).toContain('Midday meal');
  });
  it('separates your own samples from evidence of another crew, per profile and state', () => {
    const items = (crew: CrewId, hhmm: string) => build('MOD-IMMUNE', onboard(crew, hhmm)).sections.find(s => s.cls === 'fd30')!.items;
    expect(items(TI, '13:14')).toEqual(['Collection planned · Blood sample · 13:15 UTC']);
    expect(items(TI, '15:45')).toEqual(['Blood sample · Result availability reported']);
    expect(items(MO, '16:20')).toEqual(['Urine sample · Analysis started']);
    expect(items(MO, '16:14')).toEqual(['Collection planned · Urine sample · 16:15 UTC']);
    expect(items(OWNER, '12:00').join('|')).toContain('Blood sample · Result availability reported');
    expect(items(TI, '15:45').join('|')).not.toMatch(/Urine/); expect(items(MO, '23:59').join('|')).not.toMatch(/Blood/);
    const c = build('MOD-IMMUNE', onboard(OWNER, '12:00'));
    const evidence = c.sections.find(s => s.cls === 'evidence')!;
    expect(evidence.title).toContain('Another crew (Inspiration4)');
    expect(evidence.lines[0]).toContain('Not your values and not this crew’s.');
    expect(evidence.chart).toMatchObject({ kind: 'strip' });
    expect(text(c)).not.toMatch(/iss:sample/);
  });
  it('gives no personal data when the host passes another owner or no data (only context)', () => {
    const foreign: CatalogProps = { perspective: 'onboard', data: { state: stateFor('12:00', OWNER), owner: TI, time: at('12:00') } };
    for (const props of [foreign, { perspective: 'onboard' } as CatalogProps]) {
      expect(build('MOD-MSK', props).sections.filter(s => s.cls === 'fd30')).toEqual([]);
      expect(build('MOD-IMMUNE', props).sections.filter(s => s.cls === 'fd30')).toEqual([]);
      expect(build('MOD-NUTR', props).sections.filter(s => s.cls === 'fd30')).toEqual([]);
    }
  });
  it('shows Pulse only from the simulated Exercise session, and nothing for profiles without one', () => {
    const lucia = build('MOD-CARDIO', onboard(OWNER, '12:00')).sections[0].lines.join('|');
    expect(lucia).toContain('Mean pulse over the received readings'); expect(lucia).toContain('Simulated for FD30; not a measurement.');
    expect(build('MOD-CARDIO', onboard(OWNER, '10:41')).sections[0].lines[0]).toMatch(/Current pulse: \d+ bpm/);
    for (const crew of [TI, MO]) expect(build('MOD-CARDIO', onboard(crew, '12:00')).sections[0].lines[0]).toContain('no pulse reading in FD30');
  });

  it('Ground reads only the allowlisted operational projection; Medicine adds the explicit absence of summaries', () => {
    for (const id of ['MOD-MSK', 'MOD-NUTR', 'MOD-CREW', 'MOD-AUTONOMY', 'MOD-MED', 'MOD-CARDIO', 'MOD-IMMUNE']) {
      const operator = build(id, ground('mission_operator')), medicine = build(id, ground('medical_professional'));
      // The scope line is honest: it names the role only when the dialog really reads the plan; otherwise it says it is public/context content.
      for (const [c, label] of [[operator, 'Operational view'], [medicine, 'Medical view']] as const) expect(c.scope, id).toContain(c.sections.some(x => x.cls === 'fd30') ? label : 'No personal data is read here');
      expect(JSON.stringify(operator.sections.map(s => s.lines))).not.toContain('No medical summaries have been received');
      if (id !== 'MOD-CREW') expect(JSON.stringify(medicine.sections.map(s => s.lines))).toContain('No medical summaries have been received');
      // Never a personal record: no samples, sessions, minutes of sessions, pulse or sleep on Ground.
      for (const c of [operator, medicine]) expect(text(c), id).not.toMatch(/iss:sample|iss:session|Blood sample|Urine sample|Result availability|Mean pulse|bpm|sessions in 7 days/);
    }
    const msk = build('MOD-MSK', ground('mission_operator')).sections[0];
    expect(msk.table!.rows.map(r => r[0])).toEqual(expect.arrayContaining(['Lucía Ferraro', 'Tomás Ibarra', 'Mei Okada']));
    expect(msk.lines[0]).toContain('does not confirm attendance');
    expect(build('MOD-NUTR', ground('medical_professional')).sections[0].lines[0]).toContain('do not record intake');
    expect(build('MOD-AUTONOMY', ground('mission_operator')).sections[0].items[0]).toBe('Plan in force: fd30-plan.2 · demo-plan');
    expect(build('MOD-AUTONOMY', ground('mission_operator')).sections[0].lines[0]).toContain('automatic edit');
  });
  it('Ground Crew dynamics covers the three people from the plan only; on board only the active one', () => {
    expect(build('MOD-CREW', ground('mission_operator')).sections[0].table!.rows).toHaveLength(CREW.length);
    expect(build('MOD-CREW', onboard(TI, '12:00')).sections[0].table!.rows.map(r => r[0])).toEqual(['Tomás Ibarra']);
    expect(build('MOD-CREW', onboard(TI, '12:00')).action?.href).toBe('#/onboard/personal/m/crew');
    expect(build('MOD-CREW', ground('mission_operator')).action?.href).toBe('#/demo/fd30/ground/m/crew');
  });
  it('the cards with no FD30 data say what would be followed and why, without FD30 values', () => {
    for (const id of ['MOD-SANS', 'MOD-SENSORI', 'MOD-COG', 'MOD-LOADS']) {
      const c = build(id, onboard(OWNER, '12:00'));
      expect(c.sections.map(s => s.cls)).toEqual(['context']);
      expect(c.why).toMatch(/would/i); expect(c.action).toBeNull();
    }
    expect(build('MOD-MED', ground('medical_professional')).sections.map(s => s.cls)).toEqual(['fd30', 'fd30', 'context']);
  });
});

describe('CAT08 radiation dialog', () => {
  it('reuses the TEPC series: UTC period, unit, readings, an unfilled gap and a compact chart, as historical evidence', () => {
    for (const props of [onboard(OWNER, '12:00'), ground('mission_operator'), ground('medical_professional')]) {
      const c = build('MOD-RAD', props), s = c.sections.find(x => x.cls === 'evidence')!;
      expect(s.items[0]).toBe('Period (UTC): 2014-03-01 00:00 → 2014-03-08 00:00');
      expect(s.items[1]).toBe('Unit: µGy/min, absorbed dose rate');
      expect(s.items.join('|')).toMatch(/Readings: 9,998/);
      expect(s.items.find(i => i.startsWith('Gap, not filled'))).toMatch(/84 min without a reading, 2014-03-04 22:53 → 2014-03-05 00:16 UTC/);
      expect(s.lines[0]).toContain('not a personal dose'); expect(s.lines[0]).toContain('not a live reading'); expect(s.lines[0]).toContain('not FD30 data');
      expect(s.chart).toMatchObject({ kind: 'radiation' });
      const chart = (s.chart as { kind: 'radiation'; chart: { runs: unknown[]; gaps: unknown[]; w: number } }).chart;
      expect(chart.w).toBe(360); expect(chart.gaps.length).toBeGreaterThan(0); expect(chart.runs.length).toBeGreaterThan(1); // the line breaks at the gap
      expect(text(c)).not.toMatch(/\d+ mSv|career dose limit/);
    }
  });
  it('opens the Radiation tab directly from On board and from Ground, whatever the role', () => {
    expect(build('MOD-RAD', onboard(OWNER, '12:00')).action).toEqual({ href: '#/onboard/personal/evidence/radiation', label: 'View full series' });
    for (const role of ['mission_operator', 'medical_professional'] as const) expect(build('MOD-RAD', ground(role), 'es').action).toEqual({ href: '#/demo/fd30/ground/evidence/radiation', label: 'Ver serie completa' });
    expect(build('MOD-RAD', { perspective: 'onboard' }).action?.href).toBe('#/onboard/personal/evidence/radiation');
    expect(build('MOD-RAD', onboard(OWNER, '12:00')).source.extras.map(e => e.url).join('|')).toContain('cdaweb.gsfc.nasa.gov');
  });
  it('renders the dialog structure with class tags, a source link in a new tab and the single action', () => {
    for (const locale of ['en', 'es'] as const) {
      const html = renderToStaticMarkup(createElement(I18nProvider, { locale, children: createElement(CatalogModal, { module: mod('MOD-RAD'), props: onboard(OWNER, '12:00'), locale, onClose: () => {} }) }));
      expect(html).toContain('<dialog'); expect(html).toContain('aria-labelledby="mcat-modal-MOD-RAD-h"');
      expect(html).toContain(locale === 'es' ? 'Evidencia histórica' : 'Historical evidence');
      expect(html).toContain(locale === 'es' ? 'Contexto' : 'Context');
      expect(html).toContain('data-chart="radiation-mini"'); expect(html).toContain('target="_blank" rel="noopener noreferrer"');
      expect(html.match(/href="#\//g)).toHaveLength(1); // one action only
      expect(html).toContain('href="#/onboard/personal/evidence/radiation"');
    }
  });
});
