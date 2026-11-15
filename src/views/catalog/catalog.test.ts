import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import registered from '../../data/sources.json';
import { I18nProvider } from '../../i18n/I18nProvider';
import type { GroundRole, Locale } from '../../state/types';
import { CATALOG_MODULES, moduleLevels, modulesFor } from './catalogModules';
import { CATALOG_SOURCES } from './catalogSources';
import { CATALOG_TEXT } from './catalogText';
import type { CatalogProps, Text } from './catalogTypes';
import { ModuleCatalog } from './ModuleCatalog';

const SPEC_IDS = ['MOD-CARDIO', 'MOD-MSK', 'MOD-NUTR', 'MOD-IMMUNE', 'MOD-SANS', 'MOD-SENSORI', 'MOD-COG',
  'MOD-CREW', 'MOD-EVA', 'MOD-MICRO', 'MOD-LOADS', 'MOD-AUTONOMY', 'MOD-MED'];

function texts(value: unknown): Text[] {
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.en === 'string' && typeof o.es === 'string') return [o as unknown as Text];
    return Object.values(o).flatMap(texts);
  }
  return [];
}
const render = (props: CatalogProps, locale: Locale) =>
  renderToStaticMarkup(createElement(I18nProvider, { locale, children: createElement(ModuleCatalog, props) }));
const cardHtml = (html: string, id: string) => html.split(`data-module="${id}"`)[1]?.split('<article')[0] ?? '';

describe('catalog registry', () => {
  it('has exactly the 13 spec concept cards, once each', () => {
    expect(CATALOG_MODULES.map(m => m.id)).toEqual(SPEC_IDS);
    expect(CATALOG_MODULES.every(m => m.specTier === 'concept')).toBe(true);
  });

  it('has non-empty EN and ES text everywhere', () => {
    for (const m of CATALOG_MODULES) {
      const all = texts(m);
      expect(all.length).toBeGreaterThan(8);
      for (const x of all) { expect(x.en.trim()).not.toBe(''); expect(x.es.trim()).not.toBe(''); }
      expect(m.solves.en).not.toBe(m.solves.es);
      expect(m.onboard.en).not.toBe(m.onboard.es);
      expect(m.dataNeeds.length).toBeGreaterThan(0);
    }
  });

  it('every Ground card separates operational and medical use', () => {
    for (const m of modulesFor('ground')) {
      expect(m.ground?.operational.en).toBeTruthy();
      expect(m.ground?.medical.es).toBeTruthy();
      expect(m.ground?.operational.en).not.toBe(m.ground?.medical.en);
    }
  });

  it('marks as available only what exists, and no card claims evidence yet', () => {
    const available = CATALOG_MODULES.filter(m => moduleLevels(m).includes('available')).map(m => m.id);
    expect(available).toEqual(['MOD-MSK', 'MOD-IMMUNE', 'MOD-CREW']);
    expect(CATALOG_MODULES.some(m => moduleLevels(m).includes('evidence'))).toBe(false);
    for (const c of CATALOG_MODULES.flatMap(m => m.capabilities)) {
      if (c.status === 'available') { expect(c.verified).toBe(true); expect(Object.values(c.href ?? {}).length).toBeGreaterThan(0); }
      else expect(c.href).toBeUndefined();
    }
  });

  it('musculoskeletal: exercise is available, bone monitoring is a concept', () => {
    const msk = CATALOG_MODULES.find(m => m.id === 'MOD-MSK')!;
    const exercise = msk.capabilities.find(c => c.status === 'available')!;
    expect(`${exercise.label.en} ${exercise.note.en}`).not.toMatch(/bone/i);
    expect(`${exercise.label.es} ${exercise.note.es}`).not.toMatch(/óse|hueso/i);
    expect(msk.capabilities.find(c => c.id === 'bone-monitoring')?.status).toBe('concept');
    expect(exercise.href).toEqual({ onboard: '#/onboard/personal/exercise' });
  });

  it('contains no measured values, thresholds or diagnoses', () => {
    const all = CATALOG_MODULES.flatMap(texts).flatMap(x => [x.en, x.es]).join('\n');
    expect(all).not.toMatch(/\d+(\.\d+)?\s*(mg|mmHg|mSv|bpm|ppm|%|kcal|W\b|rpm|h\b)/);
    expect(all).not.toMatch(/\b(normal|abnormal|anormal|threshold|umbral|diagnosed|fit|unfit|apto)\b/i);
    // "diagnosis" / "diagnóstico" may only appear negated.
    expect(all.match(/[^\n]*diagn[oó]s[^\n]*/gi)).toEqual(['Future environmental results from a verified source, never a personal diagnosis.',
      'Resultados ambientales futuros de una fuente verificada, nunca un diagnóstico personal.']);
  });

  it('only cites spec-registered sources; shared IDs match src/data/sources.json', () => {
    for (const m of CATALOG_MODULES) expect(CATALOG_SOURCES[m.backing.sourceId]).toBeDefined();
    for (const s of registered) {
      const local = CATALOG_SOURCES[s.id as keyof typeof CATALOG_SOURCES];
      if (local) { expect(local.url).toBe(s.url); expect(local.status).toBe(s.status); }
    }
    const contextOnly = CATALOG_MODULES.filter(m => m.backing.kind === 'context').map(m => m.id);
    expect(contextOnly).toEqual(['MOD-COG', 'MOD-MED']);
  });

  it('UI strings exist in both languages with the same keys', () => {
    expect(Object.keys(CATALOG_TEXT.es).sort()).toEqual(Object.keys(CATALOG_TEXT.en).sort());
  });
});

describe('ModuleCatalog rendering', () => {
  const roles: GroundRole[] = ['mission_operator', 'medical_professional'];

  it('renders every applicable card in EN and ES', () => {
    for (const locale of ['en', 'es'] as const) {
      const onboard = render({ perspective: 'onboard' }, locale);
      expect(onboard.match(/<article/g)?.length).toBe(13);
      for (const m of CATALOG_MODULES) expect(onboard).toContain(m.title[locale]);
      for (const role of roles) {
        const ground = render({ perspective: 'ground', role }, locale);
        expect(ground.match(/<article/g)?.length).toBe(modulesFor('ground').length);
        expect(ground).toContain(CATALOG_TEXT[locale].onboardOnly);
      }
    }
  });

  it('perspective and role change what is presented', () => {
    const onboard = render({ perspective: 'onboard' }, 'es');
    const operator = render({ perspective: 'ground', role: 'mission_operator' }, 'es');
    const medical = render({ perspective: 'ground', role: 'medical_professional' }, 'es');
    expect(new Set([onboard, operator, medical]).size).toBe(3);
    const cardio = CATALOG_MODULES[0];
    expect(onboard).toContain(cardio.onboard.es);
    expect(operator).not.toContain(cardio.onboard.es);
    expect(operator).toContain(cardio.ground!.operational.es);
    expect(operator).not.toContain(cardio.ground!.medical.es);
    expect(medical).toContain(cardio.ground!.medical.es);
    expect(medical).not.toContain(cardio.ground!.operational.es);
    expect(operator).not.toContain('data-module="MOD-COG"');
    expect(onboard).toContain('data-module="MOD-COG"');
  });

  it('future capabilities never render as available or as a link', () => {
    for (const props of [{ perspective: 'onboard' }, { perspective: 'ground', role: 'medical_professional' }] as CatalogProps[]) {
      const html = render(props, 'en');
      const msk = cardHtml(html, 'MOD-MSK');
      expect(msk).toMatch(/data-capability="bone-monitoring" data-status="concept"/);
      const bone = msk.split('data-capability="bone-monitoring"')[1].split('</li>')[0];
      expect(bone).not.toContain('href=');
      expect(bone).not.toContain('mcat-level-available');
      expect(bone).toContain(CATALOG_TEXT.en.pendingVerification);
    }
    // Personal exercise sessions are not opened from Ground.
    const ground = cardHtml(render({ perspective: 'ground', role: 'mission_operator' }, 'en'), 'MOD-MSK');
    expect(ground).not.toContain('#/onboard/personal/exercise');
    for (const id of SPEC_IDS.filter(id => !['MOD-MSK', 'MOD-AUTONOMY', 'MOD-IMMUNE', 'MOD-CREW'].includes(id))) {
      expect(cardHtml(render({ perspective: 'onboard' }, 'en'), id)).not.toContain('mcat-level-available');
    }
  });
});

describe('Available now and Future capabilities (MATE-UX01)', () => {
  const available = (html: string) => html.split('data-section="available-now"')[1]?.split('data-section="future-capabilities"')[0] ?? '';
  const future = (html: string) => html.split('data-section="future-capabilities"')[1] ?? '';

  it('lists "Available now" first, with only functions that open in that perspective', () => {
    for (const locale of ['en', 'es'] as const) {
      const t = CATALOG_TEXT[locale];
      const onboard = render({ perspective: 'onboard' }, locale);
      expect(onboard.indexOf('data-section="available-now"')).toBeLessThan(onboard.indexOf('data-section="future-capabilities"'));
      expect(onboard).toContain(t.availableNow);
      const now = available(onboard);
      expect(now).toContain('data-available="fd30-exercise"');
      expect(now).toContain('href="#/onboard/personal/exercise"');
      expect(now).not.toContain('data-available="m1-engine-link"');
      expect(now).toContain('href="#/onboard/personal/evidence"');
      expect(now).not.toContain('bone-monitoring');
      for (const role of ['mission_operator', 'medical_professional'] as const) {
        const ground = available(render({ perspective: 'ground', role }, locale));
        expect(ground).not.toContain('fd30-exercise');            // personal exercise does not open from Ground
        expect(ground).not.toContain('#/onboard/personal/exercise');
        expect(ground).not.toContain('href="#/ground/iss/link"');
        expect(ground).toContain('href="#/demo/fd30/ground/evidence"');
      }
    }
  });

  it('keeps the list and the links identical for both Ground roles (no permission change)', () => {
    const a = available(render({ perspective: 'ground', role: 'mission_operator' }, 'en'));
    const b = available(render({ perspective: 'ground', role: 'medical_professional' }, 'en'));
    expect(a).toBe(b);
  });

  it('folds the concept cards under "Future capabilities", closed by default', () => {
    for (const locale of ['en', 'es'] as const) {
      const html = render({ perspective: 'onboard' }, locale);
      expect(html).toMatch(/<details class="mcat-future" data-section="future-capabilities"><summary>/);
      expect(html).not.toMatch(/<details class="mcat-future"[^>]*\sopen/);
      expect(html).toContain(CATALOG_TEXT[locale].futureTitle);
      expect(future(html).match(/<article/g)?.length).toBe(13);
      expect(available(html)).not.toContain('<article');
    }
  });

  it('splits partial capabilities: exercise is available, bone monitoring stays future', () => {
    const html = render({ perspective: 'onboard' }, 'en');
    const msk = cardHtml(html, 'MOD-MSK');
    expect(msk).not.toContain('data-capability="fd30-exercise"');
    expect(msk).toContain('data-capability="bone-monitoring" data-status="concept"');
    expect(msk).toContain('data-moved="true"');
    expect(msk).not.toContain('mcat-level-available');
    expect(available(html)).not.toContain('Bone monitoring');
    // On Ground exercise does not open, so it stays where it is, without a link.
    const ground = cardHtml(render({ perspective: 'ground', role: 'mission_operator' }, 'en'), 'MOD-MSK');
    expect(ground).toContain('data-capability="fd30-exercise"');
  });

  it('does not duplicate the registry: every entry comes from catalogModules', () => {
    const ids = CATALOG_MODULES.flatMap(m => m.capabilities.filter(c => c.status === 'available').map(c => c.id));
    const html = available(render({ perspective: 'onboard' }, 'en'));
    const listed = [...html.matchAll(/data-available="([^"]+)"/g)].map(m => m[1]).filter(k => k !== 'sources-evidence');
    expect(listed.every(k => ids.includes(k))).toBe(true);
  });
});

describe('MOD-IMMUNE partial availability (MATE-CAT03)', () => {
  const immune = () => CATALOG_MODULES.find(m => m.id === 'MOD-IMMUNE')!;
  const card = (html: string) => cardHtml(html, 'MOD-IMMUNE');
  const available = (html: string) => html.split('data-section="available-now"')[1]?.split('data-section="future-capabilities"')[0] ?? '';

  it('is partially available: available parts plus future concepts', () => {
    expect(moduleLevels(immune())).toEqual(['available', 'concept']);
    expect(immune().capabilities.filter(c => c.status === 'available').map(c => c.id)).toEqual(['my-samples', 'i4-public-evidence']);
    expect(immune().capabilities.find(c => c.id === 'immune-monitoring')?.status).toBe('concept');
    expect(immune().capabilities.find(c => c.id === 'osd-575-cytokines')?.status).toBe('concept');
  });

  it('onboard: offers the active profile’s laboratory and public evidence, on both languages', () => {
    for (const locale of ['en', 'es'] as const) {
      const html = render({ perspective: 'onboard' }, locale);
      const now = available(html);
      expect(now).toContain('data-available="my-samples"');
      expect(now).toContain('href="#/onboard/personal/laboratory"');
      expect(now).toContain('data-available="i4-public-evidence"');
      expect(now).toContain('href="#/onboard/personal/evidence"');
      expect(card(html)).not.toContain('mcat-level-available');
      expect(card(html)).toContain('data-moved="true"');
      expect(card(html)).toContain('data-capability="immune-monitoring" data-status="concept"');
    }
  });

  it('ground: both roles see only the public evidence link, never the personal laboratory', () => {
    for (const locale of ['en', 'es'] as const) {
      for (const role of ['mission_operator', 'medical_professional'] as const) {
        const html = render({ perspective: 'ground', role }, locale);
        const now = available(html);
        expect(now).toContain('data-available="i4-public-evidence"');
        expect(now).toContain('href="#/demo/fd30/ground/evidence"');
        expect(now).not.toContain('data-available="my-samples"');
        expect(now).not.toContain('#/onboard/personal/laboratory');
        expect(card(html)).not.toContain('#/onboard/personal/');
      }
    }
  });

  it('keeps the immune available links identical for both Ground roles', () => {
    const a = available(render({ perspective: 'ground', role: 'mission_operator' }, 'en'));
    const b = available(render({ perspective: 'ground', role: 'medical_professional' }, 'en'));
    expect(a).toBe(b);
  });

  it('does not present Inspiration4 as FD30 records or personal immune data', () => {
    const i4 = immune().capabilities.find(c => c.id === 'i4-public-evidence')!;
    expect(`${i4.note.en} ${i4.label.en}`).toMatch(/another crew/i);
    expect(`${i4.note.en} ${i4.label.en}`).not.toMatch(/\bFD30 (record|data)s? of (this|your)|your (immune|cytokine)/i);
    expect(`${i4.note.es} ${i4.label.es}`).toMatch(/otra tripulación/i);
    const my = immune().capabilities.find(c => c.id === 'my-samples')!;
    expect(`${my.label.en} ${my.note.en}`).not.toMatch(/immune panel|cytokine|normal|\brange\b/i);
    expect(`${my.label.es} ${my.note.es}`).not.toMatch(/panel inmun|citoquina|normal|\brango\b/i);
  });
});
