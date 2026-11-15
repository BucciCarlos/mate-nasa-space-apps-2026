import type { ReactNode } from 'react';
import type { Locale } from '../../state/types';
import { LOCALE_TAG } from '../../i18n/format';
import type { EvidenceSource } from './evidenceTypes';
import type { EvidenceMessages } from './evidenceText';
import type { Loaded } from './validate';

/** Fixed-decimal number in the locale (`9.6` / `9,6`). Decimals are the source precision, never more. */
export const fmtFixed = (n: number, digits: number, locale: Locale) =>
  new Intl.NumberFormat(LOCALE_TAG[locale], { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

export function Ext({ href, t, children }: { href: string; t: EvidenceMessages; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> {t.newTab}</span></a>;
}

const STATUS_ICON = { verified: '●', partial: '◐', pending: '○' } as const;
/** Status is shape plus text, never color alone. */
export function StatusBadge({ status, t }: { status: EvidenceSource['status']; t: EvidenceMessages }) {
  return <span className={`evd-status evd-status-${status}`}><span aria-hidden="true">{STATUS_ICON[status]}</span> {t.status[status]}</span>;
}

/** Shown in every view: this is published evidence, not FD30 telemetry. */
export function HistoricalNote({ perspective, t }: { perspective: 'onboard' | 'ground'; t: EvidenceMessages }) {
  return (
    <aside className="evd-historical" role="note" aria-label={t.historical}>
      <strong>{t.historical}</strong>
      <p>{t.historicalBody[perspective]}</p>
    </aside>
  );
}

export function MeasurementCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section className="evd-card" aria-label={title}>
      <h4>{title}</h4>
      <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </section>
  );
}

export function SourceList({ sources, t, locale }: { sources: EvidenceSource[]; t: EvidenceMessages; locale: Locale }) {
  return (
    <section className="evd-block" aria-label={t.sourcesOfView}>
      <h4>{t.sourcesOfView}</h4>
      <ul className="evd-source-mini">
        {sources.map(s => (
          <li key={s.id}>
            <Ext href={s.doi ? `https://doi.org/${s.doi}` : s.url} t={t}><span lang="en">{s.title}</span></Ext> · {s.publisher}
            {' '}<StatusBadge status={s.status} t={t} />
            <span className="evd-muted"> · {t.accessed} {s.accessedAt}</span>
            <span className="evd-muted"> · {s.reuse[locale]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A source that is absent or invalid shows its state and sources, never placeholder values. */
export function NoData({ load, t, locale, expected, sources, label }: { load: Exclude<Loaded<unknown>, { state: 'ok' }>; t: EvidenceMessages; locale: Locale; expected: readonly string[]; sources: EvidenceSource[]; label: string }) {
  return (
    <section className="evd-nodata" aria-label={label}>
      <p className="evd-nodata-state" role="status">
        <strong>{label}</strong> · {t.pendingBecause}: {load.state === 'absent' ? t.notLoaded : t.failed(`${t.failure[load.code]}${load.detail ? ` (${load.detail})` : ''}`)}
      </p>
      <p>{t.noDataNote}</p>
      <h4>{t.expectedFiles}</h4>
      <ul>{expected.map(f => <li key={f}><code>{f}</code></li>)}</ul>
      <SourceList sources={sources} t={t} locale={locale} />
    </section>
  );
}
