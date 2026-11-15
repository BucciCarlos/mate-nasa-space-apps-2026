// CORE-CATALOG (01 §5.2): concept cards for On board and Ground. Perspective and Ground role come from the host.
// CAT08: each card opens a detail dialog. Without `data` the catalog reads nothing; with it, dialogs read the active profile (On board)
// or the allowlisted operational projection of the active role (Ground) through the existing selectors. It grants no access.
import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../../i18n/I18nProvider';
import type { Locale } from '../../state/types';
import { CATALOG_MODULES } from './catalogModules';
import { CATALOG_SUMMARIES } from './catalogSummaries';
import { CATALOG_TEXT } from './catalogText';
import type { CatalogMessages } from './catalogText';
import type { CatalogModule, CatalogProps } from './catalogTypes';
import { CatalogModal } from './CatalogModal';
import { MODAL_UI } from './catalogModalText';
import './catalog.css';
import './catalogModal.css';

function Card({ module, props, t, locale }: { module: CatalogModule; props: CatalogProps; t: CatalogMessages; locale: Locale }) {
  const headingId = `mcat-${module.id}-h`;
  const links = module.capabilities.filter(c => c.status === 'available' && c.href?.[props.perspective]);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const reopened = useRef(false);
  // Focus returns to this card's button when the dialog closes (Escape, close button, backdrop or an exit link).
  useEffect(() => { if (!open && reopened.current) trigger.current?.focus(); }, [open]);
  const ui = MODAL_UI[locale];
  return <article className="mcat-card" data-module={module.id} aria-labelledby={headingId}>
    <header className="mcat-card-head"><h3 id={headingId}>{module.title[locale]}</h3></header>
    <p className="mcat-lead">{CATALOG_SUMMARIES[module.id][locale]}</p>
    {links.length > 0 && <ul className="mcat-caps">{links.map(c => <li key={c.id} data-capability={c.id}>
      <a className="mcat-open" href={c.href![props.perspective]}>{t.open}: {c.label[locale]}</a>
      <span className="mcat-note">{c.note[locale]}</span>
    </li>)}</ul>}
    <button type="button" ref={trigger} className="mcat-detail-btn" aria-haspopup="dialog" aria-label={`${ui.viewDetail}: ${module.title[locale]}`} onClick={() => { reopened.current = true; setOpen(true); }}>{ui.viewDetail}</button>
    {open && <CatalogModal module={module} props={props} locale={locale} onClose={() => setOpen(false)} />}
  </article>;
}

export function ModuleCatalog(props: CatalogProps) {
  const locale = useLocale(), t = CATALOG_TEXT[locale];
  const page = props.headingLevel === 1, hid = page ? 'fd-view-h' : 'mcat-h';
  return <section className="mcat" data-perspective={props.perspective} data-role={props.perspective === 'ground' ? props.role : undefined} aria-labelledby={hid}>
    <header className="mcat-head">{page ? <h1 id={hid} tabIndex={-1}>{t.title}</h1> : <h2 id={hid} tabIndex={-1}>{t.title}</h2>}<p>{t.subtitle}</p></header>
    <div className="mcat-grid">{CATALOG_MODULES.map(module => <Card key={module.id} module={module} props={props} t={t} locale={locale} />)}</div>
  </section>;
}
