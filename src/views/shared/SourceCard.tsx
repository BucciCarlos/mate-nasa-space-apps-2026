import { useEffect, useRef } from 'react';
import sources from '../../data/sources.json';
import type { Source } from '../../state/types';
import { useLocale, useT } from '../../i18n/I18nProvider';

export const SOURCES = sources as Source[];

export function findSource(id: string): Source | null {
  return SOURCES.find((s) => s.id === id) ?? null;
}

/** Source popover: title, publisher, URL, access date, what it supports (03 §5). */
export function SourceCard({ sourceId, onClose, autoFocus = false }: { sourceId: string; onClose?: () => void; autoFocus?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const ref = useRef<HTMLElement>(null);
  const s = findSource(sourceId);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus, sourceId]);
  if (!s) return null;
  const badgeLabel = s.kind === 'nasa_resource' ? t.provenance.nasaResource : t.provenance.partnerResource;
  return (
    <aside className="source-card" ref={ref} tabIndex={-1} aria-label={t.a11y.sourcePopover}>
      <div className="source-head">
        <span className={`badge badge-${s.kind === 'nasa_resource' ? 'nasaResource' : 'partnerResource'}`}><span aria-hidden="true">◆</span> {badgeLabel}</span>
        {s.challengeResource && <span className="tag">{t.provenance.challengeResource}</span>}
        <span className={`tag tag-${s.status}`}>{t.provenance.status[s.status]}</span>
        {onClose && <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{t.common.close}</button>}
      </div>
      <h3 className="source-title" lang="en">{s.title}</h3>
      <dl className="source-meta">
        <dt>{t.provenance.publisher}</dt><dd lang="en">{s.publisher}</dd>
        <dt>{t.provenance.url}</dt>
        <dd>
          <a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a>
          <span className="muted"> ({t.provenance.openExternal}; {t.provenance.accessedAt({ date: s.accessedAt })})</span>
        </dd>
        <dt>{t.provenance.supports}</dt><dd>{s.supports[locale]}</dd>
        <dt>{t.provenance.reuse}</dt><dd>{s.reuse[locale]}</dd>
      </dl>
    </aside>
  );
}
