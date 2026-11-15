import { useState } from 'react';
import { useLocale } from '../../i18n/I18nProvider';
import { fmtTime } from '../../i18n/format';
import type { CrewId } from '../../demo/fd30';
import type { Checkin, OpsAction, OpsProfile, WellbeingTopic } from './opsState';
import { OPS_TEXT } from './opsText';
import './ops.css';

export function WellbeingView({ owner, draft, entries, onAction, onSkip }: { owner: CrewId; draft: OpsProfile['wellbeing']; entries: Checkin[]; onAction: (action: OpsAction) => void; onSkip: () => void }) {
  const locale = useLocale(), t = OPS_TEXT[locale];
  const [saved, setSaved] = useState(false);
  return <div className="ops ops-wellbeing"><header className="ops-intro"><p className="fd-eyebrow">{t.wellbeing}</p><h1 id="fd-view-h" tabIndex={-1}>{t.privateTitle}</h1><p>{t.privateIntro}</p></header>
    <form className="ops-form" onSubmit={e => { e.preventDefault(); onAction({ type: 'wellbeing/save', owner, lang: locale }); setSaved(true); }}>
      <label>{t.topic}<select value={draft.topic} onChange={e => { setSaved(false); onAction({ type: 'wellbeing/draft', owner, topic: e.target.value as WellbeingTopic, text: draft.text }); }}><option value="day">{t.day}</option><option value="leisure">{t.leisure}</option></select></label>
      <label>{t.note}<textarea rows={5} lang={locale} value={draft.text} onChange={e => { setSaved(false); onAction({ type: 'wellbeing/draft', owner, topic: draft.topic, text: e.target.value }); }} aria-describedby="ops-private-hint" /></label>
      <p id="ops-private-hint" className="ops-boundary">{t.privateHint}</p><div className="ops-actions"><button type="submit" disabled={!draft.text.trim()}>{t.save}</button><button type="button" onClick={() => { onAction({ type: 'wellbeing/cancel', owner }); setSaved(false); }}>{t.cancel}</button><button type="button" onClick={onSkip}>{t.skip}</button></div>
      {saved && <p role="status">{t.saved}</p>}
    </form>
    <section className="ops-section"><h2>{t.ownHistory}</h2>{!entries.some(e => e.owner === owner) ? <p>{t.emptyHistory}</p> : <ul className="ops-messages">{entries.filter(e => e.owner === owner).reverse().map(e => <li key={e.id}><p className="ops-label">{t[e.topic]} · {fmtTime(e.at, locale)}</p><p className="ops-user-text" lang={e.lang}>{e.text}</p><small>{t.privateHint}</small></li>)}</ul>}</section>
  </div>;
}
