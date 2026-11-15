import type { Notice } from '../../state/types';
import { useApp } from '../../state/AppProvider';
import { noticeSeen } from '../../state/mateSlice';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { fmtInterval } from '../../i18n/format';
import { RestWindowCard } from '../shared/RestWindowCard';
import { useMissionTime } from '../shared/useMissionTime';
import { ONBOARD_MISSION_ID } from '../../state/types';

/** Plan-change notice: rest window first, then the moved blocks. It never navigates by itself (02 §8.2). */
export function NoticeCard({ notice, chips }: { notice: Notice; chips?: React.ReactNode }) {
  const { state } = useApp();
  const t = useT();
  const locale = useLocale();
  const mt = useMissionTime(ONBOARD_MISSION_ID);
  const plan = state.missions[ONBOARD_MISSION_ID].onboard.plan;
  const task = plan.blocks.find((b) => b.id === notice.taskId);
  return (
    <article className={`border-l-4 border-amber border-y border-x border-line rounded-md px-3 py-3 my-2 bg-bg2 ${notice.seen ? 'opacity-70' : ''}`} aria-label={t.onboard.notice.planChange}>
      <div className="flex items-center gap-2 flex-wrap">
        <strong>{t.onboard.notice.planChange}</strong>
        <span className="text-fg2 text-fs0">{t.onboard.notice.receivedAt({ time: mt.time(notice.createdAtMs) })}</span>
      </div>
      <RestWindowCard rest={notice.rest} emphasis />
      <ul className="list-disc pl-5 my-2 text-fs1">
        {notice.moves.map((mv) => (
          <li key={mv.blockId}>{t.onboard.notice.taskMoved({ task: `${t.blocks[mv.kind]} · ${mv.title[locale]}`, before: fmtInterval(mv.before, locale), after: fmtInterval(mv.after, locale) })}</li>
        ))}
      </ul>
      <details className="border border-line rounded-md px-2 py-1 my-2 text-fs0">
        <summary className="cursor-pointer text-accent">{t.onboard.whyAmISeeingThis}</summary>
        <p className="mt-1">{t.onboard.traceBody({ task: task ? task.title[locale] : notice.taskId, minutes: notice.trace.advanceMinutes, from: notice.trace.fromVersion, to: notice.trace.toVersion })}</p>
        <p className="text-fg2 text-fs0 mt-1">{t.agenda.planningRule}: {t.agenda.planningRuleBody}</p>
      </details>
      {chips}
      {!notice.seen && (
        <button type="button" className="inline-flex items-center gap-1 px-2 py-1 text-fs0 rounded text-accent bg-transparent hover:underline" onClick={() => noticeSeen(ONBOARD_MISSION_ID, notice.id)}>{t.onboard.notice.markSeen}</button>
      )}
    </article>
  );
}
