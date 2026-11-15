// CORE-CATALOG (01 §5.2): concept cards for On board and Ground. Perspective and Ground role come from the host.
// The catalog reads no mission, profile or person data and grants no access.
import { useLocale } from '../../i18n/I18nProvider';
import type { Locale } from '../../state/types';
import { CATALOG_MODULES } from './catalogModules';
import { CATALOG_SUMMARIES } from './catalogSummaries';
import { CATALOG_SOURCES } from './catalogSources';
import { CATALOG_TEXT } from './catalogText';
import type { CatalogMessages } from './catalogText';
import type { CatalogModule, CatalogProps } from './catalogTypes';
import './catalog.css';

function Backing({ module, t, locale }: { module: CatalogModule; t: CatalogMessages; locale: Locale }) {
  const b = module.backing;
  const source = CATALOG_SOURCES[b.sourceId];
  return (
    <section className="mcat-block">
      <h4>{t.backing}</h4>
      {b.kind === 'risk' ? <>
        <p>{t.riskIntro}</p>
        <ul>{b.risks.map(r => <li key={r.en}>{r[locale]}</li>)}</ul>
        {b.statement && <p className="mcat-quote" lang="en">{b.statement[locale]}</p>}
        {b.sourceId === 'nasa-hrp-risks' && <p className="mcat-muted">{t.riskPageNote}</p>}
      </> : <>
        <p>{t.contextIntro} <span lang="en">{b.topic[locale]}</span></p>
      </>}
      <p className="mcat-source">
        {t.source}: <a href={source.url} target="_blank" rel="noopener noreferrer" lang="en">{source.title} · {source.publisher}</a>
        <span className="sr-only"> {t.newTab}</span> · {t.sourceStatus[source.status]}
      </p>
    </section>
  );
}

function DataNeeds({ module, t, locale }: { module: CatalogModule; t: CatalogMessages; locale: Locale }) {
  return (
    <section className="mcat-block">
      <h4>{t.dataNeeds}</h4>
      <ul>{module.dataNeeds.map(d => <li key={d.en}>{d[locale]}</li>)}</ul>
    </section>
  );
}

function Card({ module, props, t, locale }: { module: CatalogModule; props: CatalogProps; t: CatalogMessages; locale: Locale }) {
  const headingId = `mcat-${module.id}-h`;
  const links = module.capabilities.filter(c => c.status === 'available' && c.href?.[props.perspective]);
  return <article className="mcat-card" data-module={module.id} aria-labelledby={headingId}>
    <header className="mcat-card-head"><h3 id={headingId}>{module.title[locale]}</h3></header>
    <p className="mcat-lead">{CATALOG_SUMMARIES[module.id][locale]}</p>
    {links.length > 0 && <ul className="mcat-caps">{links.map(c => <li key={c.id} data-capability={c.id}>
      <a className="mcat-open" href={c.href![props.perspective]}>{t.open}: {c.label[locale]}</a>
      <span className="mcat-note">{c.note[locale]}</span>
    </li>)}</ul>}
    <details className="mcat-details"><summary>{t.more}</summary>
      {props.perspective === 'ground' && <p data-use={props.role === 'mission_operator' ? 'operational' : 'medical'}>{props.role === 'mission_operator' ? t.groundOperator : t.groundMedical}</p>}
      <p className="mcat-muted"><strong>{t.notBuilt}:</strong> {module.notBuilt[locale]}</p>
      <DataNeeds module={module} t={t} locale={locale} />
      <Backing module={module} t={t} locale={locale} />
    </details>
  </article>;
}

export function ModuleCatalog(props: CatalogProps) {
  const locale = useLocale(), t = CATALOG_TEXT[locale];
  return <section className="mcat" data-perspective={props.perspective} data-role={props.perspective === 'ground' ? props.role : undefined} aria-labelledby="mcat-h">
    <header className="mcat-head"><h2 id="mcat-h" tabIndex={-1}>{t.title}</h2><p>{t.subtitle}</p></header>
    <div className="mcat-grid">{CATALOG_MODULES.map(module => <Card key={module.id} module={module} props={props} t={t} locale={locale} />)}</div>
  </section>;
}
