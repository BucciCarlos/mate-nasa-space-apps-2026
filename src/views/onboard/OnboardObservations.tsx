import { useEffect, useState } from 'react';
import type { ObservationTopic } from '../../state/types';
import { OBSERVATION_TOPICS, ONBOARD_MISSION_ID } from '../../state/types';
import { useApp } from '../../state/AppProvider';
import { selectOnboard, selectSummaryStatus } from '../../state/selectors';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { Badge, StatusBadge } from '../shared/Badge';
import { UserTextView } from '../shared/UserTextView';
import { LinkBanner } from './LinkBanner';
import { useMissionTime } from '../shared/useMissionTime';

export function OnboardObservations() {
  const { state, dispatch } = useApp();
  const t = useT();
  const locale = useLocale();
  const mt = useMissionTime(ONBOARD_MISSION_ID);
  const { mission, user, observations } = selectOnboard(state);
  const prefill = state.ui.observationPrefill;
  const [topics, setTopics] = useState<ObservationTopic[]>([]);
  const [note, setNote] = useState('');
  const [related, setRelated] = useState<string | null>(null);
  const [share, setShare] = useState(false);
  const [comment, setComment] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (prefill) {
      setTopics(prefill.topics);
      setRelated(prefill.relatedChangeId);
      dispatch({ type: 'ui/observation_prefill', prefill: null });
    }
  }, [prefill, dispatch]);

  const toggle = (tp: ObservationTopic) => setTopics((cur) => (cur.includes(tp) ? cur.filter((x) => x !== tp) : [...cur, tp]));
  const changeLabel = (id: string | null) => {
    const c = id ? mission.ground.changes.find((x) => x.id === id) : null;
    const task = c ? mission.onboard.plan.blocks.find((b) => b.id === c.taskId) : null;
    return c && task ? t.ground.changeRow({ task: task.title[locale], minutes: c.advanceMinutes, version: c.toVersion }) : t.observations.noRelatedChange;
  };
  const receivedChanges = mission.onboard.notices.map((n) => n.changeId);
  const canSave = topics.length > 0;

  const save = () => {
    if (!canSave) return;
    dispatch({
      type: 'observation/saved', missionId: ONBOARD_MISSION_ID, crewId: user.id, topics,
      privateNote: note.trim() ? { text: note.trim(), lang: locale } : null,
      relatedChangeId: related,
      share: share ? { comment: comment.trim() ? { text: comment.trim(), lang: locale } : null } : null,
      nowMs: Date.now(),
    });
    setTopics([]); setNote(''); setRelated(null); setShare(false); setComment('');
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2500);
  };

  const shareLabel = (summaryId: string | null) => {
    const s = selectSummaryStatus(state, summaryId);
    if (!s) return <StatusBadge kind="queued" label={t.observations.notShared} />;
    if (s === 'queued') return <StatusBadge kind="queued" label={t.observations.waitingForLink} />;
    if (s === 'in_transit') return <StatusBadge kind="in_transit" label={t.observations.sending} />;
    return <StatusBadge kind="delivered" label={t.observations.deliveredToGround} />;
  };

  return (
    <div className="onboard-observations">
      <h1 id="view-h" tabIndex={-1}>{t.observations.title}</h1>
      <LinkBanner />
      <section className="card" aria-labelledby="new-obs-h">
        <h2 id="new-obs-h">{t.observations.newTitle} <Badge kind="userEntry" /></h2>
        <fieldset>
          <legend>{t.observations.topics} <span className="muted small">({t.observations.topicsHint})</span></legend>
          <div className="chips">
            {OBSERVATION_TOPICS.map((tp) => (
              <label key={tp} className={`chip${topics.includes(tp) ? ' is-on' : ''}`}>
                <input type="checkbox" checked={topics.includes(tp)} onChange={() => toggle(tp)} /> {t.topics[tp]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span>{t.observations.privateNote}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} lang={locale} />
          <span className="muted small">🔒 {t.observations.privateHint}</span>
        </label>
        <div className="field">
          <span>{t.observations.relatedChange}</span>
          <select value={related ?? ''} onChange={(e) => setRelated(e.target.value || null)}>
            <option value="">{t.observations.noRelatedChange}</option>
            {receivedChanges.map((id) => <option key={id} value={id}>{changeLabel(id)}</option>)}
          </select>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} /> {t.observations.shareToggle}
        </label>
        {share && (
          <div className="share-box">
            <label className="field">
              <span>{t.observations.shareComment}</span>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} lang={locale} />
            </label>
            <div className="preview-box" aria-live="polite">
              <strong>{t.observations.previewTitle}</strong>
              <dl>
                <dt>{t.ground.topics}</dt><dd>{topics.length > 0 ? topics.map((tp) => t.topics[tp]).join(', ') : t.common.none}</dd>
                <dt>{t.ground.relatedChange}</dt><dd>{changeLabel(related)}</dd>
                <dt>{t.ground.comment}</dt><dd>{comment.trim() ? <q lang={locale}>{comment.trim()}</q> : <span className="muted">{t.ground.noComment}</span>}</dd>
              </dl>
              <p className="muted small">{t.observations.previewNoNote}</p>
            </div>
          </div>
        )}
        {!canSave && <p className="muted small">{t.observations.topicsRequired}</p>}
        <button type="button" className="btn btn-primary" disabled={!canSave} onClick={save}>{t.common.save}</button>
        {savedFlash && <span className="ok" role="status"> {t.observations.saved}</span>}
      </section>
      <section className="card" aria-labelledby="obs-list-h">
        <h2 id="obs-list-h">{t.observations.listTitle}</h2>
        {observations.length === 0 ? <p className="empty">{t.observations.empty}</p> : (
          <ul className="obs-list">
            {[...observations].reverse().map((o) => (
              <li key={o.id} className="obs-item">
                <div className="row-head">
                  <span className="mono">{t.observations.savedAt({ time: mt.time(o.createdAtMs) })}</span>
                  <span>{o.topics.map((tp) => t.topics[tp]).join(', ')}</span>
                  {shareLabel(o.sharedSummaryId)}
                </div>
                {o.privateNote && <p className="obs-note">🔒 <UserTextView text={o.privateNote} /></p>}
                <p className="muted small">{t.observations.relatedChange}: {changeLabel(o.relatedChangeId)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
