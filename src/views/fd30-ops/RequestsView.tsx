import { useState } from 'react';
import { useLocale } from '../../i18n/I18nProvider';
import { fmtInterval, fmtTime } from '../../i18n/format';
import { CREW } from '../../demo/fd30';
import type { CrewId } from '../../demo/fd30';
import { planFor } from '../../demo/fd30Plan';
import { COMMANDER } from './opsState';
import type { OpsAction, OpsProfile, RequestKind, RequestPreview, SharedRequest } from './opsState';
import { OPS_TEXT } from './opsText';
import './ops.css';

export function RequestsView({ owner, draft, preview: suppliedPreview, requests, onAction }: { owner: CrewId; draft: OpsProfile['request']; preview: RequestPreview | null; requests: SharedRequest[]; onAction: (action: OpsAction) => void }) {
  const locale = useLocale(), t = OPS_TEXT[locale];
  const [sent, setSent] = useState(false);
  const preview = suppliedPreview?.owner === owner ? suppliedPreview : null;
  const sender = CREW.find(c => c.id === owner)!, recipient = CREW.find(c => c.id === COMMANDER)!;
  const edit = (patch: Partial<OpsProfile['request']>) => { setSent(false); onAction({ type: 'request/draft', owner, ...draft, ...patch }); };
  return <div className="ops ops-requests"><header className="ops-intro"><p className="fd-eyebrow">{t.requests}</p><h1 id="fd-view-h" tabIndex={-1}>{t.requestTitle}</h1><p>{t.requestIntro}</p></header>
    {owner === COMMANDER ? <p>{t.commanderSelf}</p> : <>
      {preview ? <section className="ops-preview" aria-labelledby="ops-preview-h"><h2 id="ops-preview-h">{t.previewTitle}</h2><dl><dt>{t.sender}</dt><dd>{sender.name}</dd><dt>{t.recipient}</dt><dd>{recipient.name} · {t.commanderRole}</dd><dt>{t.kind}</dt><dd>{t[preview.kind]}</dd><dt>{t.block}</dt><dd>{preview.title[locale]} · {fmtInterval(preview, locale)}</dd></dl><blockquote lang={preview.lang}>{preview.text}</blockquote><p className="ops-boundary">{t.visibility}</p><div className="ops-actions"><button type="button" onClick={() => { onAction({ type: 'request/send', owner, previewId: preview.id }); setSent(true); }}>{t.send}</button><button type="button" onClick={() => onAction({ type: 'request/cancel', owner })}>{t.edit}</button></div></section>
        : <form className="ops-form" onSubmit={e => { e.preventDefault(); onAction({ type: 'request/preview', owner, lang: locale }); }}>
          <label>{t.kind}<select value={draft.kind} onChange={e => edit({ kind: e.target.value as RequestKind })}><option value="support">{t.support}</option><option value="replanning">{t.replanning}</option></select></label>
          <label>{t.block}<select value={draft.blockId ?? ''} onChange={e => edit({ blockId: e.target.value || null })}><option value="">{t.chooseBlock}</option>{planFor(owner).map(b => <option key={b.id} value={b.id}>{b.title[locale]} · {fmtInterval(b, locale)}</option>)}</select></label>
          <label>{t.message}<textarea rows={4} lang={locale} value={draft.text} onChange={e => edit({ text: e.target.value })} aria-describedby="ops-request-hint" /></label><p id="ops-request-hint">{t.messageHint}</p><button type="submit" disabled={!draft.blockId || !draft.text.trim()}>{t.preview}</button>
        </form>}
      {sent && <p role="status">{t.sent}</p>}
      <section className="ops-section"><h2>{t.ownRequests}</h2>{!requests.length ? <p>{t.noOwnRequests}</p> : <ul className="ops-messages">{requests.filter(r => r.owner === owner).map(r => <li key={r.id}><p>{t[r.kind]} · {r.title[locale]} · {fmtInterval(r, locale)}</p><blockquote lang={r.lang}>{r.text}</blockquote><small>{t.recipient}: {recipient.name} · {t.sentAt} {fmtTime(r.sentAt, locale)}</small></li>)}</ul>}</section>
    </>}
  </div>;
}
