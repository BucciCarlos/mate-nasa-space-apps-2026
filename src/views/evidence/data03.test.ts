import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { EVIDENCE_DATA } from './evidenceData';
import { EvidenceSuite } from './EvidenceSuite';
import { EVIDENCE_SOURCES } from './evidenceSources';
import { buildLabsChart } from './labsChart';
import { buildRadChart } from './radiationChart';
import { tepcSummary, validateI4Labs, validateSleep, validateTepc } from './validate';
import type { EvidenceTab } from './evidenceTypes';

const originals = import.meta.glob('../../data/evidence/*.json', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const expected = {
  'i4-labs.json': 'ce46fbec7621ecfee217d4dfcdf94f2bd175ef46c811d4196f6237c0d92705dc',
  'tepc-dose.json': 'caae7e6f2470b3402d437bc8a48c06dd834c3ba94dd91150543da284fa8d5a68',
  'sleep-aggregate.json': '95b860c712336e2d2c6987aba31bad8b97ebebec6f43660c7a4d0a172c0c232c',
};
function render(tab: EvidenceTab, perspective: 'onboard' | 'ground', locale: 'en' | 'es') {
  return renderToStaticMarkup(createElement(I18nProvider, { locale, children: createElement(EvidenceSuite, { tab, perspective }) }));
}

describe('DATA03 actual local subsets, through the production entry point', () => {
  it('pins exactly three byte-identical DATA02 derivatives and their displayed hashes', async () => {
    expect(Object.keys(originals)).toHaveLength(3);
    for (const [file, hash] of Object.entries(expected)) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(originals[`../../data/evidence/${file}`]));
      expect(Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('')).toBe(hash);
      expect(EVIDENCE_SOURCES.find(s => s.subset?.file === file)?.subset?.sha256).toBe(hash);
    }
    expect(EVIDENCE_DATA.co2).toBeUndefined();
  });
  it('contains all 140 lab records and breaks every code at the unobserved flight', () => {
    const result = validateI4Labs(EVIDENCE_DATA.labs);
    expect(result.ok).toBe(true); if (!result.ok) throw new Error(result.detail);
    const d = result.data;
    expect([d.subjects.length, d.analytes.length, d.timepoints.length]).toEqual([4, 5, 7]);
    expect(d.analytes.flatMap(a => a.values)).toHaveLength(140);
    for (const a of d.analytes) {
      for (const value of a.values) expect(Object.keys(value).sort()).toEqual(['subject', 'timepoint', 'value']);
      const chart = buildLabsChart(d, a.id, 'all');
      expect(chart.series.flatMap(s => s.runs.flatMap(r => r.points))).toHaveLength(28);
      for (const series of chart.series) {
        expect(series.runs.map(r => r.part)).toEqual(['pre', 'post']);
        for (const run of series.runs) for (const p of run.points) expect(p.x < chart.band.x0 || p.x > chart.band.x1).toBe(true);
      }
    }
  });
  it('uses DATA02’s 9998 sorted points in the half-open UTC window without bridging the gap', () => {
    const result = validateTepc(EVIDENCE_DATA.radiation);
    expect(result.ok).toBe(true); if (!result.ok) throw new Error(result.detail);
    const d = result.data;
    expect(d.points).toHaveLength(9998);
    expect(d.unit).toBe('uGy/min');
    d.points.forEach((p, i) => {
      expect(Date.parse(p.t)).toBeGreaterThanOrEqual(Date.parse(d.window.start));
      expect(Date.parse(p.t)).toBeLessThan(Date.parse(d.window.end));
      if (i) expect(Date.parse(p.t)).toBeGreaterThan(Date.parse(d.points[i - 1].t));
    });
    const chart = buildRadChart(d);
    expect(chart.runs.flatMap(r => r.points)).toHaveLength(9998);
    expect(chart.runs).toHaveLength(2);
    const summary = tepcSummary(d);
    expect(summary.withValue).toBe(9998);
    expect(summary.gaps).toHaveLength(1);
    expect((summary.gaps[0].endMs - summary.gaps[0].startMs) / 60000).toBeCloseTo(83.8);
    expect(summary.gaps[0].minutes).toBe(84); // Existing UI rounds the duration to whole minutes.
    for (const run of chart.runs) expect(run.points.some(p => p.x < chart.gaps[0].x0) && run.points.some(p => p.x > chart.gaps[0].x1)).toBe(false);
  });
  it('keeps the four published sleep means/SD, population and method separate from the fictional crew', () => {
    const result = validateSleep(EVIDENCE_DATA.sleep);
    expect(result.ok).toBe(true); if (!result.ok) throw new Error(result.detail);
    expect(result.data.groups.map(g => [g.hoursObtained, g.sd])).toEqual([[6.41, .65], [5.86, .94], [6.09, .67], [6.95, 1.04]]);
    expect(result.data.counts).toEqual({ astronauts: 21, missions: 13, inflightDays: 3248 });
    expect(result.data.method.en).toContain('wrist actigraphy');
  });
  it('renders identical loaded content for both perspectives in EN/ES, with CO₂ still pending', () => {
    for (const locale of ['en', 'es'] as const) for (const tab of ['labs', 'radiation', 'sleep', 'co2', 'sources'] as const) {
      const panels = (['onboard', 'ground'] as const).map(p => render(tab, p, locale).split('role="tabpanel"')[1]);
      expect(panels[0]).toBe(panels[1]);
      if (['labs', 'radiation', 'sleep'].includes(tab)) expect(panels[0]).toContain('data-state="ok"');
      if (tab === 'co2') {
        expect(panels[0]).toContain(locale === 'en' ? 'Pending verification' : 'Pendiente de verificación');
        expect(panels[0]).not.toContain('<svg');
      }
      if (tab === 'sources') {
        for (const hash of Object.values(expected)) expect(panels[0]).toContain(hash);
        expect(panels[0]).toContain(locale === 'en' ? 'Reconstructed from DataCite' : 'Reconstruida desde DataCite');
      }
    }
  });
});
