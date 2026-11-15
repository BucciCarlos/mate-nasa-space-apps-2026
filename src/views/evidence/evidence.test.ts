import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Locale } from '../../state/types';
import { I18nProvider } from '../../i18n/I18nProvider';
import { EvidenceSuite } from './EvidenceSuite';
import { LabsView } from './LabsView';
import { RadiationView } from './RadiationView';
import { SleepView } from './SleepView';
import { Co2View } from './Co2View';
import { SourcesView } from './SourcesView';
import { EVIDENCE_DATA } from './evidenceData';
import { EVIDENCE_SOURCES } from './evidenceSources';
import { EVIDENCE_TEXT } from './evidenceText';
import type { EvidenceTab } from './evidenceTypes';
import { EVIDENCE_TABS, I4_ANALYTE_IDS, I4_EXPECTED, I4_SUBJECTS, I4_TIMEPOINTS } from './evidenceTypes';
import { buildLabsChart } from './labsChart';
import { buildRadChart } from './radiationChart';
import { fmtFixed } from './parts';
import { labNulls, load, tepcSummary, validateI4Labs, validateSleep, validateTepc } from './validate';
import { labsFixture, sleepFixture, tepcFixture } from './evidence.fixtures';

const html = (el: ReturnType<typeof createElement>, locale: Locale = 'en') => renderToStaticMarkup(createElement(I18nProvider, { locale, children: el }));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const sources = [...EVIDENCE_SOURCES];
const suite = (tab: EvidenceTab, perspective: 'onboard' | 'ground', data = {}, locale: Locale = 'en', profileName?: string) =>
  html(createElement(EvidenceSuite, { perspective, tab, data, profileName }), locale);

describe('Inspiration4 validation (04 §4.6)', () => {
  it('accepts a complete 4 x 5 x 7 input', () => {
    const f = labsFixture();
    expect(f.analytes.reduce((n, a) => n + a.values.length, 0)).toBe(140);
    expect(validateI4Labs(f).ok).toBe(true);
  });
  it('rejects a missing combination, a duplicate, a wrong unit, a non-numeric value and a bad timepoint list', () => {
    const missing = clone(labsFixture()); missing.analytes[0].values.pop();
    expect(validateI4Labs(missing)).toMatchObject({ ok: false, code: 'incomplete' });
    const dup = clone(labsFixture()); dup.analytes[1].values.push({ ...dup.analytes[1].values[0] });
    expect(validateI4Labs(dup)).toMatchObject({ ok: false, code: 'duplicate' });
    const unit = clone(labsFixture()); unit.analytes[2].unit = 'g/L';
    expect(validateI4Labs(unit)).toMatchObject({ ok: false, code: 'unit' });
    const text = clone(labsFixture()); (text.analytes[3].values[0] as { value: unknown }).value = '5.1';
    expect(validateI4Labs(text)).toMatchObject({ ok: false, code: 'value' });
    const tps = clone(labsFixture()); tps.timepoints = ['L-92', 'R+1'];
    expect(validateI4Labs(tps)).toMatchObject({ ok: false, code: 'shape' });
    expect(validateI4Labs({})).toMatchObject({ ok: false });
  });
  it('refuses sex and reference ranges even if the file carries them', () => {
    const sex = clone(labsFixture()); (sex.analytes[0].values[0] as unknown as Record<string, unknown>).sex = 'F';
    expect(validateI4Labs(sex)).toMatchObject({ ok: false, code: 'unexpected' });
    const range = clone(labsFixture()); (range.analytes[0] as unknown as Record<string, unknown>).rangeMin = 65;
    expect(validateI4Labs(range)).toMatchObject({ ok: false, code: 'unexpected' });
  });
  it('keeps nulls as nulls and lists them', () => {
    const f = clone(labsFixture()); f.analytes[0].values[3].value = null;
    expect(validateI4Labs(f).ok).toBe(true);
    expect(labNulls(f)).toEqual([{ analyte: 'glucose', subject: 'C001', timepoint: 'R+1' }]);
  });
});

describe('Inspiration4 chart geometry', () => {
  const f = labsFixture();
  it('never joins before-flight and after-flight samples, and puts nothing inside the flight band', () => {
    for (const id of I4_ANALYTE_IDS) {
      const c = buildLabsChart(f, id, 'all');
      expect(c.series.map(s => s.subject)).toEqual([...I4_SUBJECTS]);
      for (const s of c.series) {
        expect(s.runs).toHaveLength(2);
        for (const run of s.runs) {
          const tps = run.points.map(p => p.timepoint);
          const pre = tps.every(tp => ['L-92', 'L-44', 'L-3'].includes(tp)), post = tps.every(tp => ['R+1', 'R+45', 'R+82', 'R+194'].includes(tp));
          expect(run.part === 'pre' ? pre : post).toBe(true);
          for (const p of run.points) expect(p.x < c.band.x0 || p.x > c.band.x1).toBe(true);
        }
      }
    }
  });
  it('keeps every original timepoint label in order and leaves the band between L-3 and R+1', () => {
    const c = buildLabsChart(f, 'glucose', 'all');
    expect(c.xTicks.map(k => k.timepoint)).toEqual([...I4_TIMEPOINTS]);
    const l3 = c.xTicks.find(k => k.timepoint === 'L-3')!.x, r1 = c.xTicks.find(k => k.timepoint === 'R+1')!.x;
    expect(c.band.x0).toBeGreaterThan(l3);
    expect(c.band.x1).toBeLessThan(r1);
  });
  it('selects one code and breaks the line at a null instead of filling it', () => {
    const one = buildLabsChart(f, 'calcium', 'C003');
    expect(one.series.map(s => s.subject)).toEqual(['C003']);
    const g = clone(f); g.analytes[1].values.find(v => v.subject === 'C002' && v.timepoint === 'L-44')!.value = null;
    const runs = buildLabsChart(g, 'calcium', 'C002').series[0].runs;
    expect(runs).toHaveLength(3);
    expect(runs.flatMap(r => r.points).some(p => p.timepoint === 'L-44')).toBe(false);
  });
  it('spreads direct labels so they do not overlap', () => {
    const labels = buildLabsChart(f, 'wbc', 'all').series.map(s => s.label!.y).sort((a, b) => a - b);
    labels.slice(1).forEach((y, i) => expect(y - labels[i]).toBeGreaterThanOrEqual(14));
  });
});

describe('Inspiration4 view', () => {
  it('shows the chart with the flight band, markers, direct labels and a table alternative', () => {
    const out = html(createElement(LabsView, { raw: labsFixture(), sources }));
    expect(out).toContain('data-chart="labs"');
    expect(out).toContain('data-flight-band="true"');
    expect(out).toContain(EVIDENCE_TEXT.en.labs.flightBand.split(' ')[0]);
    for (const tp of I4_TIMEPOINTS) expect(out).toContain(`>${tp}<`);
    for (const s of I4_SUBJECTS) expect(out).toContain(`data-series="${s}"`);
    expect(out).toContain(EVIDENCE_TEXT.en.labs.glucoseNote);
    expect(out).toContain(EVIDENCE_TEXT.en.labs.disclaimer);
    expect(out).not.toMatch(/<polyline[^>]*data-part="(?!pre|post)/);
    const table = html(createElement(LabsView, { raw: labsFixture(), sources, initialView: 'table', initialAnalyte: 'hemoglobin', initialCode: 'C002' }));
    expect(table).toContain('<table');
    expect(table).toContain(EVIDENCE_TEXT.en.labs.inFlightCell);
    expect(table).toContain('>R+194<');
    expect((table.match(/<th scope="row">/g) ?? []).length).toBe(1);
    expect(table).not.toContain('data-chart="labs"');
  });
  it('has no reference ranges, flags, cross-participant mean, sex column or anonymity claim', () => {
    for (const locale of ['en', 'es'] as const) {
      const whole = html(createElement(LabsView, { raw: labsFixture(), sources, initialView: 'table' }), locale);
      const out = whole.replace(/<details[\s\S]*?<\/details>/, ''); // the provenance popover says what was dropped
      expect(whole).toContain('<details');
      expect(out).not.toMatch(/SEX|RANGE_|reference range|rango de referencia|abnormal|anormal|normal range|mean of|media de/i);
      expect(out).not.toMatch(/anonymi[sz]ed|anonimizad/i);
    }
    expect(EVIDENCE_TEXT.en.labs.disclaimer).toMatch(/does not make them anonymous/);
    expect(EVIDENCE_TEXT.es.labs.disclaimer).toMatch(/no los vuelve anónimos/);
  });
  it('uses the source decimals and the locale number format', () => {
    expect(fmtFixed(9.6, 1, 'en')).toBe('9.6');
    expect(fmtFixed(9.6, 1, 'es')).toBe('9,6');
    const g = clone(labsFixture()); g.analytes[1].values[0].value = 9.6;
    const es = html(createElement(LabsView, { raw: g, sources, initialView: 'table', initialAnalyte: 'calcium' }), 'es');
    expect(es).toContain('9,60'.slice(0, 3));
    expect(I4_EXPECTED.rbc.decimals).toBe(2);
  });
  it('shows provenance with file checksums and transformations', () => {
    const out = html(createElement(LabsView, { raw: labsFixture(), sources }));
    expect(out).toContain('sha256 ' + '0'.repeat(64));
    for (const k of labsFixture().transformations) expect(out).toContain(EVIDENCE_TEXT.en.labs.transform[k].slice(0, 20));
    expect(out).toContain('Data are courtesy of the NASA Open Science Data Repository');
  });
  it('shows only its state, sources and expected files when absent or invalid: no curves, no values', () => {
    for (const raw of [undefined, null, clone(labsFixture()).analytes.slice(1), { ...labsFixture(), subjects: ['C001'] }]) {
      const out = html(createElement(LabsView, { raw, sources }));
      expect(out).toContain('data-state="' + (raw === undefined || raw === null ? 'absent' : 'failed') + '"');
      expect(out).toContain('LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv');
      expect(out).toContain('OSD-575');
      expect(out).toContain(EVIDENCE_TEXT.en.labs.disclaimer);
      expect(out).not.toMatch(/<svg class="evd-chart"|<table|<polyline|<select/);
    }
    expect(html(createElement(LabsView, { raw: undefined, sources }))).toContain('Not loaded');
    expect(html(createElement(LabsView, { raw: {}, sources }))).toContain('Failed validation');
    expect(html(createElement(LabsView, { raw: undefined, sources }), 'es')).toContain('No cargado');
  });
});

describe('Ambient radiation (TEPC DOSE)', () => {
  it('validates a window and rejects unsorted, duplicate, out-of-window, wrong-unit and fill values', () => {
    expect(validateTepc(tepcFixture()).ok).toBe(true);
    const unsorted = clone(tepcFixture()); [unsorted.points[0], unsorted.points[1]] = [unsorted.points[1], unsorted.points[0]];
    expect(validateTepc(unsorted)).toMatchObject({ ok: false, code: 'order' });
    const dup = clone(tepcFixture()); dup.points[1].t = dup.points[0].t;
    expect(validateTepc(dup)).toMatchObject({ ok: false, code: 'duplicate' });
    const outside = clone(tepcFixture()); outside.points.push({ t: '2000-03-02T00:00:00Z', dose: 0.1 });
    expect(validateTepc(outside)).toMatchObject({ ok: false, code: 'window' });
    const unit = clone(tepcFixture()); (unit as { unit: string }).unit = 'uSv/min';
    expect(validateTepc(unit)).toMatchObject({ ok: false, code: 'unit' });
    const fill = clone(tepcFixture()); fill.points[2].dose = -1e31;
    expect(validateTepc(fill)).toMatchObject({ ok: false, code: 'value' });
    expect(validateTepc({ ...tepcFixture(), points: [] })).toMatchObject({ ok: false, code: 'incomplete' });
  });
  it('lists the gap and the row without a value, and counts rows without filling any', () => {
    const s = tepcSummary(tepcFixture());
    expect(s.rows).toBe(110);
    expect(s.withValue).toBe(109);
    expect(s.expected).toBe(120);
    expect(s.gaps.map(g => [g.kind, g.minutes])).toEqual([['missing', 11], ['null', 1]]);
  });
  it('breaks the line at the gap and at the null value, and shades each gap', () => {
    const c = buildRadChart(tepcFixture());
    expect(c.runs.length).toBe(3);
    expect(c.gaps).toHaveLength(2);
    for (const run of c.runs) for (const p of run.points) for (const g of c.gaps.filter(x => x.kind === 'missing')) expect(p.x <= g.x0 || p.x >= g.x1).toBe(true);
  });
  it('shows the measurement card, the window in UTC and visible gaps, and no personal dose', () => {
    const out = html(createElement(RadiationView, { raw: tepcFixture(), sources, initialRows: 5 }));
    expect(out).toContain('data-chart="radiation"');
    expect(out).toContain('data-gap="missing"');
    expect(out).toContain('data-gap="null"');
    expect(out).toContain('2000-03-01 00:00 → 2000-03-01 02:00 UTC');
    expect(out).toContain('serial number 1003');
    expect(out).toContain('location code not decoded');
    expect(out).toContain('µGy/min');
    expect(out).toContain('Any person’s dose');
    expect(out).toContain('5 of 110 rows shown');
    expect(out).not.toMatch(/% of (the )?(career )?limit|dosis personal de|personal dose of/i);
  });
  it('shows the card and its state, without a chart, when the file is absent', () => {
    const out = html(createElement(RadiationView, { raw: undefined, sources }));
    expect(out).toContain('No data loaded');
    expect(out).toContain('serial number 1003');
    expect(out).not.toMatch(/data-chart|<table|<polyline/);
  });
});

describe('Sleep and schedules', () => {
  it('validates the aggregate and rejects out-of-range hours, duplicates and extra fields', () => {
    expect(validateSleep(sleepFixture()).ok).toBe(true);
    const hours = clone(sleepFixture()); hours.groups[0].hoursObtained = 30;
    expect(validateSleep(hours)).toMatchObject({ ok: false, code: 'value' });
    const dup = clone(sleepFixture()); dup.groups.push({ ...dup.groups[0] });
    expect(validateSleep(dup)).toMatchObject({ ok: false, code: 'duplicate' });
    const person = clone(sleepFixture()); (person.groups[0] as unknown as Record<string, unknown>).perPerson = [1, 2];
    expect(validateSleep(person)).toMatchObject({ ok: false, code: 'unexpected' });
  });
  it('shows a published aggregate with its badge and the NASA context, with no series and no figure', () => {
    const out = html(createElement(SleepView, { raw: sleepFixture(), sources, profileName: 'Test Name' }));
    expect(out).toContain('Published result · other crews');
    expect(out).toContain('data-group="inflight"');
    expect(out).toContain('5.50');
    expect(out).toContain('such as work overload, irregular light-dark cycles, and sleep-pattern disruptions');
    expect(out).toContain('No sleep records for Test Name in this prototype');
    expect(out).not.toMatch(/<svg|<table|<img|<polyline/);
    expect(html(createElement(SleepView, { raw: sleepFixture(), sources }), 'es')).toContain('5,50');
    expect(html(createElement(SleepView, { raw: sleepFixture(), sources }))).toContain('No sleep records for any profile in this prototype');
  });
  it('shows its state and no numbers when the aggregate is absent', () => {
    const out = html(createElement(SleepView, { raw: undefined, sources }));
    expect(out).toContain('No published aggregate loaded');
    expect(out).not.toContain('data-group=');
    expect(out).toContain('NASA context');
  });
});

describe('Cabin CO₂', () => {
  it('shows the context card and "Pending verification", with no readings and no numeric chart', () => {
    const en = html(createElement(Co2View, { sources }));
    expect(en).toContain('Pending verification');
    expect(en).toContain('Not documented by source');
    expect(en).toContain('[V2 6004]');
    expect(en).not.toMatch(/<svg|<table|<polyline|data-chart/);
    expect(html(createElement(Co2View, { sources }), 'es')).toContain('Pendiente de verificación');
    expect(html(createElement(Co2View, { sources, status: { status: 'pending', reason: { en: 'Unit unconfirmed', es: 'Unidad sin confirmar' } } }), 'es')).toContain('Unidad sin confirmar');
  });
});

describe('Sources', () => {
  it('lists every 04 §3 source once, with both languages and a valid status', () => {
    const ids = EVIDENCE_SOURCES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ['nasa-hrp-risks', 'nasa-hrp-risk-sleep', 'nasa-hrp-risk-ops-support', 'nasa-hrp-hazards', 'nasa-hrp-ongoing', 'csa-radiation', 'csa-why-science', 'osdr-osd-575', 'osdr-osd-569', 'osdr-eda', 'cdaweb-iss-tepc', 'nasa-std-3001-v1', 'nasa-std-3001-v2', 'osdr-radlab', 'nasa-donki', 'barger-2014']) expect(ids).toContain(id);
    for (const s of EVIDENCE_SOURCES) {
      expect(['verified', 'partial', 'pending']).toContain(s.status);
      expect(s.url).toMatch(/^https:\/\//);
      for (const text of [s.coverage, s.supports, s.reuse]) { expect(text.en.length).toBeGreaterThan(5); expect(text.es.length).toBeGreaterThan(5); }
    }
    expect(EVIDENCE_SOURCES.find(s => s.id === 'cdaweb-iss-tepc')!.status).toBe('partial');
    expect(EVIDENCE_SOURCES.find(s => s.id === 'osdr-radlab')!.status).toBe('pending');
  });
  it('shows title, publisher, DOI or link, coverage, status, attribution and reuse for each source, in both languages', () => {
    for (const locale of ['en', 'es'] as const) {
      const out = html(createElement(SourcesView, { sources }), locale);
      for (const s of EVIDENCE_SOURCES) expect(out).toContain(`data-source="${s.id}"`);
      expect(out).toContain('https://doi.org/10.26030/mc5d-p710');
      expect(out).toContain(EVIDENCE_TEXT[locale].status.partial);
      expect(out).toContain(EVIDENCE_TEXT[locale].sources.reuse);
      expect(out).toContain(EVIDENCE_TEXT[locale].sources.coverage);
    }
    expect(html(createElement(SourcesView, { sources: [] }))).toContain('No sources registered');
  });
});

describe('Suite', () => {
  it('has the five sections and loads the validated DATA03 subsets', () => {
    expect([...EVIDENCE_TABS]).toEqual(['labs', 'radiation', 'sleep', 'co2', 'sources']);
    expect(validateI4Labs(EVIDENCE_DATA.labs).ok).toBe(true);
    expect(validateTepc(EVIDENCE_DATA.radiation).ok).toBe(true);
    expect(validateSleep(EVIDENCE_DATA.sleep).ok).toBe(true);
    const out = suite('labs', 'ground');
    expect((out.match(/role="tab"/g) ?? []).length).toBe(5);
    expect(out).toContain('role="tablist"');
  });
  it('tells historical evidence from FD30 telemetry in every section, both perspectives and both languages', () => {
    for (const locale of ['en', 'es'] as const) for (const perspective of ['onboard', 'ground'] as const) for (const tab of EVIDENCE_TABS) {
      const out = suite(tab, perspective, {}, locale);
      expect(out).toContain(EVIDENCE_TEXT[locale].historical);
      expect(out).toContain(EVIDENCE_TEXT[locale].historicalBody[perspective]);
      expect(out).toContain(`data-perspective="${perspective}"`);
    }
  });
  it('renders each section from the data it receives and reflects the language', () => {
    const data = { labs: labsFixture(), radiation: tepcFixture(), sleep: sleepFixture() };
    expect(suite('labs', 'onboard', data)).toContain('data-chart="labs"');
    expect(suite('radiation', 'ground', data)).toContain('data-chart="radiation"');
    expect(suite('sleep', 'onboard', data, 'en', 'Test Name')).toContain('data-group="inflight"');
    expect(suite('co2', 'ground', data)).toContain('Pending verification');
    expect(suite('sources', 'ground', data, 'es')).toContain('Fuentes');
    expect(suite('labs', 'onboard', {}, 'es')).toContain('No cargado');
  });
  it('is not a source of access: same content for both perspectives', () => {
    const data = { labs: labsFixture() };
    const strip = (s: string) => s.replace(/data-perspective="[a-z]+"/g, '').replace(new RegExp(EVIDENCE_TEXT.en.historicalBody.onboard + '|' + EVIDENCE_TEXT.en.historicalBody.ground, 'g'), '').replace(/useid-[^"]*|:r[0-9a-z]+:/g, '');
    expect(strip(suite('labs', 'onboard', data))).toBe(strip(suite('labs', 'ground', data)));
  });
});

describe('Inputs and isolation', () => {
  it('load() treats undefined and null as absent and anything else as something to validate', () => {
    expect(load(undefined, validateSleep).state).toBe('absent');
    expect(load(null, validateSleep).state).toBe('absent');
    expect(load(5, validateSleep).state).toBe('failed');
    expect(load(sleepFixture(), validateSleep).state).toBe('ok');
  });
  it('has the same EN/ES text structure', () => {
    const shape = (v: unknown): unknown => (Array.isArray(v) ? v.map(shape) : typeof v === 'function' ? 'fn' : typeof v === 'object' && v ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : 'str');
    expect(shape(EVIDENCE_TEXT.es)).toEqual(shape(EVIDENCE_TEXT.en));
  });
  it('keeps fixtures out of the app and reads no mission, profile or FD30 state', () => {
    const all = import.meta.glob('./*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const files = Object.entries(all).filter(([f]) => !f.endsWith('.test.ts') && !f.endsWith('evidence.fixtures.ts'));
    expect(files.length).toBeGreaterThan(10);
    for (const [f, src] of files) {
      expect(src, f).not.toMatch(/evidence\.fixtures/);
      expect(src, f).not.toMatch(/from '\.\.\/(\.\.\/)?(demo|ground|onboard|catalog|shared)\b|AppProvider|useApp\b|selectors|fd30/);
    }
  });
  it('never reaches into the repo data folder except through the glob loader', () => {
    const src = (import.meta.glob('./evidenceData.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)['./evidenceData.ts'];
    expect(src).toContain("import.meta.glob('../../data/evidence/*.json'");
    expect(Object.keys(import.meta.glob('../../data/evidence/*.json')).sort()).toEqual(['i4-labs', 'sleep-aggregate', 'tepc-dose'].map(name => `../../data/evidence/${name}.json`));
  });
});
