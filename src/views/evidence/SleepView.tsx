import { useLocale } from '../../i18n/I18nProvider';
import type { EvidenceSource } from './evidenceTypes';
import { SLEEP_GROUP_IDS } from './evidenceTypes';
import { EVIDENCE_TEXT } from './evidenceText';
import { load, validateSleep } from './validate';
import { Ext, NoData, SourceList, fmtFixed } from './parts';

/** A published aggregate and its NASA context. There is no individual series here and no figure of the study is reproduced. */
export function SleepView({ raw, sources, profileName }: { raw?: unknown; sources: EvidenceSource[]; profileName?: string }) {
  const locale = useLocale();
  const t = EVIDENCE_TEXT[locale];
  const S = t.sleep;
  const result = load(raw, validateSleep);
  const mine = sources.filter(s => s.id === 'barger-2014' || s.id === 'nasa-hrp-risk-sleep' || s.id === 'csa-sleeping');
  return (
    <section className="evd-panel" aria-labelledby="evd-sleep-h" data-evidence="sleep" data-state={result.state}>
      <h3 id="evd-sleep-h">{S.title}</h3>
      <section className="evd-block" aria-label={S.aggregate}>
        <h4>{S.aggregate} <span className="evd-badge">{S.badge}</span></h4>
        {result.state !== 'ok' ? (
          <NoData load={result} t={t} locale={locale} expected={[S.expectedFile]} sources={mine.filter(s => s.id === 'barger-2014')} label={S.noData} />
        ) : (
          <>
            <p>{S.limit}</p>
            <dl className="evd-stats">
              <div><dt>{S.population}</dt><dd>{result.data.population[locale]}</dd></div>
              <div><dt>{S.method}</dt><dd>{result.data.method[locale]}</dd></div>
              <div><dt>{S.counts(result.data.counts.astronauts, result.data.counts.missions)}</dt><dd>{result.data.counts.inflightDays !== null ? S.days(result.data.counts.inflightDays) : ''}</dd></div>
            </dl>
            <dl className="evd-groups">
              {SLEEP_GROUP_IDS.map(id => result.data.groups.find(g => g.id === id)).filter(g => !!g).map(g => (
                <div key={g.id} data-group={g.id}>
                  <dt>{S.groups[g.id]}</dt>
                  <dd><strong>{fmtFixed(g.hoursObtained, 2, locale)}</strong> {S.hours}{g.sd !== null && <span className="evd-muted"> · {S.sd} {fmtFixed(g.sd, 2, locale)}</span>}</dd>
                </div>
              ))}
            </dl>
            {result.data.hypnotics && <p>{S.hypnotics(result.data.hypnotics.users, result.data.hypnotics.of)}</p>}
            <p className="evd-attribution"><strong>{S.cite}:</strong> {result.data.citation.authors}. <span lang="en">{result.data.citation.title}</span>. {result.data.citation.journal} {result.data.citation.year};{result.data.citation.volume}:{result.data.citation.pages}. <Ext href={`https://doi.org/${result.data.citation.doi}`} t={t}>DOI {result.data.citation.doi}</Ext></p>
          </>
        )}
      </section>

      <section className="evd-block" aria-label={S.context}>
        <h4>{S.context}</h4>
        <p>{S.contextIntro}</p>
        <ul className="evd-quotes">{S.quotes.map(q => <li key={q} lang="en"><q>{q}</q></li>)}</ul>
        <p>{S.schedule}</p>
      </section>

      <section className="evd-block" aria-label={S.personal}>
        <h4>{S.personal}</h4>
        <p className="evd-empty">{profileName ? S.noRecords(profileName) : S.noRecordsGeneric}</p>
        <p className="evd-muted">{S.noRecordsWhy}</p>
      </section>
      <SourceList sources={mine} t={t} locale={locale} />
    </section>
  );
}
