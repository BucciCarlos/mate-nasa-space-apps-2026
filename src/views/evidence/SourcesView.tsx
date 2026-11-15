import { useLocale } from '../../i18n/I18nProvider';
import type { EvidenceSource } from './evidenceTypes';
import { EVIDENCE_TEXT } from './evidenceText';
import { DATA03_TEXT } from './data03Text';
import { Ext, StatusBadge } from './parts';

export function SourcesView({ sources }: { sources: readonly EvidenceSource[] }) {
  const locale = useLocale();
  const t = EVIDENCE_TEXT[locale];
  const S = t.sources;
  const D = DATA03_TEXT[locale];
  return (
    <section className="evd-panel" aria-labelledby="evd-sources-h" data-evidence="sources">
      <h3 id="evd-sources-h">{S.title}</h3>
      <p>{S.intro}</p>
      <p className="evd-muted">{S.count(sources.length)} · {S.thirdParty}</p>
      {sources.length === 0 ? <p className="evd-empty">{S.empty}</p> : (
        <ul className="evd-sources">
          {sources.map(s => (
            <li key={s.id} className="evd-source" data-source={s.id}>
              <h4><Ext href={s.url} t={t}><span lang="en">{s.title}</span></Ext></h4>
              <p className="evd-meta">
                <StatusBadge status={s.status} t={t} /> · {S.kind[s.kind]}{s.challengeResource ? ` · ${S.challenge}` : ''} · {t.accessed} {s.accessedAt}
              </p>
              <dl>
                <div><dt>{S.publisher}</dt><dd>{s.publisher}</dd></div>
                <div><dt>{S.link}</dt><dd><Ext href={s.url} t={t}>{s.url}</Ext></dd></div>
                {s.doi && <div><dt>{S.doi}</dt><dd><Ext href={`https://doi.org/${s.doi}`} t={t}>{s.doi}</Ext></dd></div>}
                {s.version && <div><dt>{D.version}</dt><dd>{s.version[locale]}</dd></div>}
                {s.citation && <div><dt>{D.citation}</dt><dd>{s.citation[locale]}</dd></div>}
                {s.subset && <div><dt>{D.subset}</dt><dd><code>{s.subset.file}</code><br /><code className="evd-hash">SHA-256 {s.subset.sha256}</code></dd></div>}
                <div><dt>{S.coverage}</dt><dd>{s.coverage[locale]}</dd></div>
                <div><dt>{S.supports}</dt><dd>{s.supports[locale]}</dd></div>
                {s.attribution && <div><dt>{t.attributionLabel}</dt><dd>{s.attribution[locale]}</dd></div>}
                <div><dt>{S.reuse}</dt><dd>{s.reuse[locale]}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
