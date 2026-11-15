import { useLocale } from '../../i18n/I18nProvider';
import { fmtInterval, fmtTime } from '../../i18n/format';
import { CREW } from '../../demo/fd30';
import type { commanderView } from './opsSelectors';
import { OPS_TEXT } from './opsText';
import './ops.css';

export function CommanderView({ data }: { data: ReturnType<typeof commanderView> }) {
  const locale = useLocale(), t = OPS_TEXT[locale];
  return <div className="ops ops-commander"><header className="ops-intro"><p className="fd-eyebrow">{t.commander}</p><h1 id="fd-view-h" tabIndex={-1}>{t.commanderTitle}</h1><p>{data ? t.commanderIntro : t.noAccess}</p></header>
    {data && <>
      <div className="ops-team-plans">{data.crew.map(c => <section key={c.id} data-commander-person={c.id}>
        <h2>{c.name}</h2><p className="ops-label">{t.activity}</p><strong>{c.current?.title[locale] ?? t.noActivity}</strong><p>{t.planned}</p>
        <details><summary>{t.agenda}</summary><ul className="ops-agenda-items">{c.blocks.map(b => <li key={b.id}><time>{fmtInterval(b, locale)}</time><strong>{b.title[locale]}</strong><span>{t.planned}</span></li>)}</ul></details>
      </section>)}</div>
      <section className="ops-section"><h2>{t.equipment}</h2><p>{t.equipmentLimit}</p><div className="ops-table"><table><thead><tr><th>{t.person}</th><th>{t.device}</th><th>{t.interval}</th></tr></thead><tbody>{data.crew.flatMap(c => c.blocks.filter(b => b.equipment).map(b => <tr key={b.id}><th scope="row">{c.name}</th><td>{b.equipment![locale]}</td><td>{fmtInterval(b, locale)} · {t.planned}</td></tr>))}</tbody></table></div></section>
      <section className="ops-section" data-commander-requests><h2>{t.receivedRequests}</h2>{!data.requests.length ? <p>{t.noRequests}</p> : <ul className="ops-messages">{data.requests.map(r => <li key={r.id}><h3>{CREW.find(c => c.id === r.owner)!.name} · {t[r.kind]}</h3><p>{r.title[locale]} · {fmtInterval(r, locale)}</p><blockquote lang={r.lang}>{r.text}</blockquote><small>{t.sentAt} {fmtTime(r.sentAt, locale)}</small></li>)}</ul>}</section>
      <p className="ops-boundary">{t.operationsLimit}</p>
    </>}
  </div>;
}
