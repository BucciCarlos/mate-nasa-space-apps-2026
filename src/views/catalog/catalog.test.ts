import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { CATALOG_MODULES } from './catalogModules';
import { CATALOG_SUMMARIES } from './catalogSummaries';
import { CATALOG_SOURCES } from './catalogSources';
import { ModuleCatalog } from './ModuleCatalog';
import type { CatalogProps } from './catalogTypes';
const views: CatalogProps[] = [{ perspective: 'onboard' }, { perspective: 'ground', role: 'mission_operator' }, { perspective: 'ground', role: 'medical_professional' }];
const render = (props: CatalogProps, locale: 'en' | 'es') => renderToStaticMarkup(createElement(I18nProvider, { locale, children: createElement(ModuleCatalog, props) }));
describe('CAT05 unified catalog', () => {
  for (const locale of ['en', 'es'] as const) for (const props of views) {
    it(`${locale} ${JSON.stringify(props)}: thirteen visible cards, scoped unique destinations and content`, () => {
      const html = render(props, locale);
      expect(html.match(/<article /g)).toHaveLength(13);
      expect(html.match(/class="mcat-grid"/g)).toHaveLength(1);
      expect(html.match(/<h2 /g)).toHaveLength(1);
      expect(html).toContain(locale === 'es' ? 'Explorá las áreas de seguimiento de la misión' : 'Explore the mission’s monitoring areas');
      expect(html).not.toMatch(/mcat-future|available-now|future-capabilities|data-moved/);
      // Every card precedes its own optional technical details, never a collapsed parent grid.
      expect(html.indexOf('class="mcat-grid"')).toBeLessThan(html.indexOf('<details'));
      const internal = [...html.matchAll(/href="(#[^"]+)"/g)].map(m => m[1]);
      expect(new Set(internal).size).toBe(internal.length);
      if (props.perspective === 'ground') expect(internal.every(h => h.startsWith('#/demo/fd30/ground/'))).toBe(true);
      for (const module of CATALOG_MODULES) {
        expect(html).toContain(`data-module="${module.id}"`);
        expect(html).toContain(CATALOG_SUMMARIES[module.id][locale]);
        expect(CATALOG_SOURCES[module.backing.sourceId]).toBeDefined();
        const card = html.split(`data-module="${module.id}"`)[1].split('</article>')[0];
        expect(card).toContain(module.notBuilt[locale]);
        for (const cap of module.capabilities) {
          const href = cap.status === 'available' ? cap.href?.[props.perspective] : undefined;
          if (href) expect(card).toContain(`href="${href}"`);
        }
      }
    });
  }
  it('contains no duplicate registry entries or missing bilingual summaries', () => {
    expect(new Set(CATALOG_MODULES.map(m => m.id)).size).toBe(13);
    for (const m of CATALOG_MODULES) {
      expect(CATALOG_SUMMARIES[m.id].en).toBeTruthy(); expect(CATALOG_SUMMARIES[m.id].es).toBeTruthy();
    }
  });
  it('keeps public evidence separate from private samples and pending cytokines', () => {
    const immune = CATALOG_MODULES.find(m => m.id === 'MOD-IMMUNE')!;
    expect(immune.capabilities.find(c => c.id === 'my-samples')?.href?.ground).toBeUndefined();
    expect(immune.capabilities.find(c => c.id === 'osd-575-cytokines')?.href).toBeUndefined();
    expect(immune.capabilities.find(c => c.id === 'i4-public-evidence')?.note.en).toContain('another crew');
  });
});
