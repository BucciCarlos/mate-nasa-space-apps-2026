import type { Notice } from '../../state/types';
import { useApp } from '../../state/AppProvider';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { fmtInterval } from '../../i18n/format';
import { RestWindowCard } from '../shared/RestWindowCard';
import { useMissionTime } from '../shared/useMissionTime';
import { ONBOARD_MISSION_ID } from '../../state/types';

/** Plan-change notice: rest window first, then the moved blocks. It never navigates by itself (02 §8.2). */
export function NoticeCard({ notice, chips }: { notice: Notice; chips?: React.ReactNode }) {
  const { state, dispatch } = useApp();
  const t = useT();
  const locale = useLocale();
  const mt = useMissionTime(ONBOARD_MISSION_ID);
  const plan = state.missions[ONBOARD_MISSION_ID].onboard.plan;
  const task = plan.blocks.find((b) => b.id === notice.taskId);
  return (
    <article className={`notice-card${notice.seen ? ' is-seen' : ''}`} aria-label={t.onboard.notice.planChange}>
      <div className="notice-head">
        <strong>{t.onboard.notice.planChange}</strong>
        <span className="muted small">{t.onboard.notice.receivedAt({ time: mt.time(notice.createdAtMs) })}</span>
      </div>
      <RestWindowCard rest={notice.rest} emphasis />
      <ul className="moves">
        {notice.moves.map((mv) => (
          <li key={mv.blockId}>{t.onboard.notice.taskMoved({ task: `${t.blocks[mv.kind]} · ${mv.title[locale]}`, before: fmtInterval(mv.before, locale), after: fmtInterval(mv.after, locale) })}</li>
        ))}
      </ul>
      <details className="rule-note">
        <summary>{t.onboard.whyAmISeeingThis}</summary>
        <p>{t.onboard.traceBody({ task: task ? task.title[locale] : notice.taskId, minutes: notice.trace.advanceMinutes, from: notice.trace.fromVersion, to: notice.trace.toVersion })}</p>
        <p className="muted small">{t.agenda.planningRule}: {t.agenda.planningRuleBody}</p>
      </details>
      {chips}
      {!notice.seen && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'notice/seen', missionId: ONBOARD_MISSION_ID, noticeId: notice.id })}>{t.onboard.notice.markSeen}</button>
      )}
    </article>
  );
}
