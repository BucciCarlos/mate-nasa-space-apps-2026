// CORE-CATALOG (01 §5.2): concept cards for On board and Ground. Perspective and Ground role come from the host.
// The catalog reads no mission, profile or person data and grants no access.
import { useLocale } from '../../i18n/I18nProvider';
import type { Locale } from '../../state/types';
import { CATALOG_MODULES, modulesFor } from './catalogModules';
import { EVIDENCE_HREF, levelsOfCapabilities, moduleAvailable, remainingCapabilities } from './catalogAvailable';
import { CATALOG_SOURCES } from './catalogSources';
import { CATALOG_TEXT } from './catalogText';
import type { CatalogMessages } from './catalogText';
import type { Capability, CatalogModule, CatalogProps, CapabilityStatus, Surface } from './catalogTypes';
import './catalog.css';

const LEVEL_ICON: Record<CapabilityStatus, string> = { available: '●', evidence: '◆', concept: '○' };

function Level({ status, t }: { status: CapabilityStatus; t: CatalogMessages }) {
  return <span className={`mcat-level mcat-level-${status}`}><span aria-hidden="true">{LEVEL_ICON[status]}</span> {t.level[status]}</span>;
}

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

function Prototype({ module, caps, moved, t, locale, surface }: { module: CatalogModule; caps: Capability[]; moved: Capability[]; t: CatalogMessages; locale: Locale; surface: Surface }) {
  return (
    <section className="mcat-block">
      <h4>{t.prototype}</h4>
      <ul className="mcat-caps">
        {caps.map(c => {
          const href = c.status === 'available' ? c.href?.[surface] : undefined;
          return (
            <li key={c.id} data-capability={c.id} data-status={c.status}>
              <Level status={c.status} t={t} /> <strong>{c.label[locale]}</strong>
              {!c.verified && <span className="mcat-pending">{t.pendingVerification}</span>}
              <span className="mcat-note">{c.note[locale]}</span>
              {href && <a className="mcat-open" href={href}>{t.open}: {c.label[locale]}</a>}
            </li>
          );
        })}
      </ul>
      {moved.length > 0 && <p className="mcat-muted" data-moved="true">{t.partOpenAbove}: {moved.map(c => c.label[locale]).join(', ')}</p>}
      <p className="mcat-muted"><strong>{t.notBuilt}:</strong> {module.notBuilt[locale]}</p>
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
  const ground = props.perspective === 'ground' ? module.ground : undefined;
  const surface: Surface = props.perspective;
  const { shown, moved } = remainingCapabilities(module, surface);
  return (
    <article className="mcat-card" data-module={module.id} aria-labelledby={headingId}>
      <header className="mcat-card-head">
        <h3 id={headingId}>{module.title[locale]}</h3>
        <span className="mcat-id">{module.id}</span>
      </header>
      <p className="mcat-levels">{levelsOfCapabilities(shown).map(l => <Level key={l} status={l} t={t} />)}</p>
      <p className="mcat-surfaces">{t.contributes}: {module.surfaces.map(s => t.surface[s]).join(' · ')}</p>
      {props.perspective === 'onboard' ? <>
        <p className="mcat-lead"><strong>{t.forYou}:</strong> {module.onboard[locale]}</p>
        <details className="mcat-details">
          <summary>{t.more}</summary>
          <p><strong>{t.solves}:</strong> {module.solves[locale]}</p>
          <Prototype module={module} caps={shown} moved={moved} t={t} locale={locale} surface="onboard" />
          <DataNeeds module={module} t={t} locale={locale} />
          <Backing module={module} t={t} locale={locale} />
        </details>
      </> : <>
        <p><strong>{t.solves}:</strong> {module.solves[locale]}</p>
        {ground && (props.role === 'mission_operator'
          ? <p className="mcat-lead" data-use="operational"><strong>{t.operational}:</strong> {ground.operational[locale]}</p>
          : <p className="mcat-lead" data-use="medical"><strong>{t.medical}:</strong> {ground.medical[locale]}</p>)}
        <Prototype module={module} caps={shown} moved={moved} t={t} locale={locale} surface="ground" />
        <DataNeeds module={module} t={t} locale={locale} />
        <Backing module={module} t={t} locale={locale} />
      </>}
    </article>
  );
}

/**
 * Mount On board:  <ModuleCatalog perspective="onboard" />
 * Mount on Ground: <ModuleCatalog perspective="ground" role={role} />   (role: GroundRole from the Ground view)
 */
export function ModuleCatalog(props: CatalogProps) {
  const locale = useLocale();
  const t = CATALOG_TEXT[locale];
  const surface: Surface = props.perspective;
  const modules = modulesFor(surface);
  const excluded = CATALOG_MODULES.filter(m => !m.surfaces.includes(surface));
  const available = moduleAvailable(surface);
  const intro = props.perspective === 'onboard' ? t.introOnboard : props.role === 'mission_operator' ? t.introOperator : t.introMedical;
  return (
    <section className="mcat" data-perspective={props.perspective} data-role={props.perspective === 'ground' ? props.role : undefined} aria-labelledby="mcat-h">
      <header className="mcat-head">
        <h2 id="mcat-h">{t.title}</h2>
        <p>{intro}</p>
        <p className="mcat-permissions" role="note">{t.permissions}</p>
      </header>
      <section className="mcat-now" aria-labelledby="mcat-now-h" data-section="available-now">
        <h3 id="mcat-now-h">{t.availableNow}</h3>
        <p className="mcat-muted">{t.availableNowIntro}</p>
        <ul className="mcat-now-list">
          {available.map(e => (
            <li key={e.key} data-available={e.key}>
              <Level status="available" t={t} /> <strong>{e.label[locale]}</strong>
              {e.module && <span className="mcat-muted"> · {t.module}: {e.module.title[locale]} ({e.module.id})</span>}
              <span className="mcat-note">{e.note[locale]}</span>
              <a className="mcat-open" href={e.href}>{t.open}: {e.label[locale]}</a>
            </li>
          ))}
          <li data-available="sources-evidence">
            <Level status="evidence" t={t} /> <strong>{t.sourcesEvidence}</strong>
            <span className="mcat-note">{t.sourcesEvidenceNote}</span>
            <a className="mcat-open" href={EVIDENCE_HREF[surface]}>{t.open}: {t.sourcesEvidence}</a>
          </li>
        </ul>
      </section>
      <dl className="mcat-legend" aria-label={t.legendTitle}>
        {(['available', 'evidence', 'concept'] as const).map(s => <div key={s}><dt><Level status={s} t={t} /></dt><dd>{t.levelHelp[s]}</dd></div>)}
      </dl>
      <details className="mcat-future" data-section="future-capabilities">
        <summary>{t.futureSummary(modules.length)}</summary>
        <p className="mcat-muted">{t.futureIntro}</p>
        <div className="mcat-grid">
          {modules.map(m => <Card key={m.id} module={m} props={props} t={t} locale={locale} />)}
        </div>
        {excluded.length > 0 && <p className="mcat-muted mcat-excluded">{t.onboardOnly} {excluded.map(m => m.title[locale]).join(', ')}</p>}
      </details>
    </section>
  );
}
