import { useEffect, useRef } from 'react';
import type { Source } from '../../state/types';
import { useSourcesQuery } from '../../state/api';
import { useLocale, useT } from '../../i18n/I18nProvider';

export function findSource(id: string, sources: Source[] | null | undefined): Source | null {
  return sources?.find((s) => s.id === id) ?? null;
}

export function useSources(): Source[] | null {
  const { data } = useSourcesQuery();
  return data ?? null;
}

const TAG_CLS: Record<string, string> = {
  verified: 'text-green border-green',
  partial: 'text-amber border-amber',
  pending: 'text-amber border-amber',
};

/** Source popover: title, publisher, URL, access date, what it supports (03 §5). */
export function SourceCard({ sourceId, onClose, autoFocus = false }: { sourceId: string; onClose?: () => void; autoFocus?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const ref = useRef<HTMLElement>(null);
  const sources = useSources();
  const s = findSource(sourceId, sources);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus, sourceId]);
  if (!s) return null;
  const isNasa = s.kind === 'nasa_resource';
  const badgeLabel = isNasa ? t.provenance.nasaResource : t.provenance.partnerResource;
  return (
    <aside className="border border-accent rounded-md px-3 py-3 my-2 bg-bg2 focus:outline-none" ref={ref} tabIndex={-1} aria-label={t.a11y.sourcePopover}>
      <div className="flex gap-2 items-center flex-wrap">
        <span className={`inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.04em] px-2 py-px rounded-full border ${isNasa ? 'border-accent text-accent' : 'border-accent text-accent'}`}><span aria-hidden="true">◆</span> {badgeLabel}</span>
        {s.challengeResource && <span className="text-[11px] px-2 py-px rounded-full border border-line text-fg2">{t.provenance.challengeResource}</span>}
        <span className={`text-[11px] px-2 py-px rounded-full border border-line text-fg2 ${TAG_CLS[s.status] ?? ''}`}>{t.provenance.status[s.status]}</span>
        {onClose && <button type="button" className="inline-flex items-center gap-1 px-2 py-1 text-fs0 rounded text-accent bg-transparent hover:underline" onClick={onClose}>{t.common.close}</button>}
      </div>
      <h3 className="my-2" lang="en">{s.title}</h3>
      <dl>
        <dt className="text-fs0 text-fg2 mt-2">{t.provenance.publisher}</dt><dd lang="en">{s.publisher}</dd>
        <dt className="text-fs0 text-fg2 mt-2">{t.provenance.url}</dt>
        <dd>
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-all text-accent">{s.url}</a>
          <span className="text-fg2"> ({t.provenance.openExternal}; {t.provenance.accessedAt({ date: s.accessedAt })})</span>
        </dd>
        <dt className="text-fs0 text-fg2 mt-2">{t.provenance.supports}</dt><dd>{s.supports[locale]}</dd>
        <dt className="text-fs0 text-fg2 mt-2">{t.provenance.reuse}</dt><dd>{s.reuse[locale]}</dd>
      </dl>
    </aside>
  );
}
