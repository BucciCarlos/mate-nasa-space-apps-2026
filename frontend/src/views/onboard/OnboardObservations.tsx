import { useEffect, useState } from 'react';
import type { ObservationTopic } from '../../state/types';
import { OBSERVATION_TOPICS, ONBOARD_MISSION_ID } from '../../state/types';
import { useApp } from '../../state/AppProvider';
import { observationSaved, uiObservationPrefill } from '../../state/mateSlice';
import { selectOnboard, selectSummaryStatus } from '../../state/selectors';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { Badge, StatusBadge } from '../shared/Badge';
import { UserTextView } from '../shared/UserTextView';
import { LinkBanner } from './LinkBanner';
import { useMissionTime } from '../shared/useMissionTime';

const fieldCls = 'w-full font-inherit px-2 py-1 rounded border border-line bg-bg3 text-fg text-fs1';

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
      dispatch(uiObservationPrefill(null));
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
    dispatch(observationSaved({ missionId: ONBOARD_MISSION_ID, crewId: user.id, topics, privateNote: note.trim() ? { text: note.trim(), lang: locale } : null, relatedChangeId: related, share: share ? { comment: comment.trim() ? { text: comment.trim(), lang: locale } : null } : null, nowMs: Date.now() }));
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

  const chip = (on: boolean) => `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-bg3 cursor-pointer ${on ? 'bg-accent text-accent-fg font-semibold border-transparent' : ''}`;

  return (
    <div>
      <h1 id="view-h" tabIndex={-1}>{t.observations.title}</h1>
      <LinkBanner />
      <section className="border border-line rounded-md px-4 py-4 my-4 bg-bg2" aria-labelledby="new-obs-h">
        <h2 id="new-obs-h">{t.observations.newTitle} <Badge kind="userEntry" /></h2>
        <fieldset className="my-2">
          <legend className="font-semibold text-fs1 mb-2">{t.observations.topics} <span className="text-fg2 text-fs0">({t.observations.topicsHint})</span></legend>
          <div className="flex flex-wrap gap-2">
            {OBSERVATION_TOPICS.map((tp) => (
              <label key={tp} className={chip(topics.includes(tp))}>
                <input type="checkbox" className="sr-only" checked={topics.includes(tp)} onChange={() => toggle(tp)} /> {t.topics[tp]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block my-2">
          <span className="block font-semibold text-fs1 mb-1">{t.observations.privateNote}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} lang={locale} className={fieldCls} />
          <span className="text-fg2 text-fs0">🔒 {t.observations.privateHint}</span>
        </label>
        <div className="block my-2">
          <span className="block font-semibold text-fs1 mb-1">{t.observations.relatedChange}</span>
          <select value={related ?? ''} onChange={(e) => setRelated(e.target.value || null)} className={fieldCls}>
            <option value="">{t.observations.noRelatedChange}</option>
            {receivedChanges.map((id) => <option key={id} value={id}>{changeLabel(id)}</option>)}
          </select>
        </div>
        <label className="inline-flex items-center gap-2 my-2 cursor-pointer">
          <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} /> {t.observations.shareToggle}
        </label>
        {share && (
          <div className="border border-line rounded-md px-3 py-2 my-2 bg-bg3">
            <label className="block my-1">
              <span className="block font-semibold text-fs0 mb-1">{t.observations.shareComment}</span>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} lang={locale} className={fieldCls} />
            </label>
            <div className="border-l-4 border-accent border-y border-x border-line rounded-md px-3 py-2 my-2" aria-live="polite">
              <strong>{t.observations.previewTitle}</strong>
              <dl>
                <dt className="text-fg2 text-fs0 mt-1">{t.ground.topics}</dt><dd>{topics.length > 0 ? topics.map((tp) => t.topics[tp]).join(', ') : t.common.none}</dd>
                <dt className="text-fg2 text-fs0 mt-1">{t.ground.relatedChange}</dt><dd>{changeLabel(related)}</dd>
                <dt className="text-fg2 text-fs0 mt-1">{t.ground.comment}</dt><dd>{comment.trim() ? <q lang={locale}>{comment.trim()}</q> : <span className="text-fg2">{t.ground.noComment}</span>}</dd>
              </dl>
              <p className="text-fg2 text-fs0">{t.observations.previewNoNote}</p>
            </div>
          </div>
        )}
        {!canSave && <p className="text-fg2 text-fs0">{t.observations.topicsRequired}</p>}
        <button type="button" className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-bold bg-accent text-accent-fg border border-transparent disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer" disabled={!canSave} onClick={save}>{t.common.save}</button>
        {savedFlash && <span className="text-green font-semibold" role="status"> {t.observations.saved}</span>}
      </section>
      <section className="border border-line rounded-md px-4 py-4 my-4 bg-bg2" aria-labelledby="obs-list-h">
        <h2 id="obs-list-h">{t.observations.listTitle}</h2>
        {observations.length === 0 ? <p className="text-center text-fg2 py-4">{t.observations.empty}</p> : (
          <ul className="flex flex-col divide-y divide-line">
            {[...observations].reverse().map((o) => (
              <li key={o.id} className="py-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="font-mono text-fs0 text-fg2">{t.observations.savedAt({ time: mt.time(o.createdAtMs) })}</span>
                  <span>{o.topics.map((tp) => t.topics[tp]).join(', ')}</span>
                  {shareLabel(o.sharedSummaryId)}
                </div>
                {o.privateNote && <p className="my-1">🔒 <UserTextView text={o.privateNote} /></p>}
                <p className="text-fg2 text-fs0">{t.observations.relatedChange}: {changeLabel(o.relatedChangeId)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
