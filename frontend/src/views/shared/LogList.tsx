import type { LogEntry, MissionId } from '../../state/types';
import { useT } from '../../i18n/I18nProvider';
import { useMissionTime } from './useMissionTime';
import { useApp } from '../../state/AppProvider';
import { useLocale } from '../../i18n/I18nProvider';

/** Log list with a "Why?" disclosure that shows references and, for changes, the rule inputs. */
export function LogList({ entries, missionId }: { entries: LogEntry[]; missionId: MissionId }) {
  const t = useT();
  const locale = useLocale();
  const { state } = useApp();
  const mt = useMissionTime(missionId);
  if (entries.length === 0) return <p className="text-center text-fg2 py-4">{t.ground.logEmpty}</p>;
  const m = state.missions[missionId];
  return (
    <ol className="flex flex-col divide-y divide-line border border-line rounded-md overflow-hidden bg-bg2">
      {entries.map((e) => {
        const change = e.refs.changeId ? m.ground.changes.find((c) => c.id === e.refs.changeId) : null;
        const task = change ? m.ground.plan.blocks.find((b) => b.id === change.taskId) : null;
        return (
          <li key={e.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
            <span className="font-mono text-fs0 text-fg2">{mt.time(e.atMs)}</span>
            <span className="text-fs0 uppercase tracking-[0.06em] text-fg2">{t.log[e.kind]}</span>
            <details className="ml-auto">
              <summary className="text-accent text-fs0 cursor-pointer list-none px-1">{t.common.why}</summary>
              <dl className="mt-2 text-fs0">
                <dt className="text-fg2">{t.log.refs}</dt>
                <dd><code className="font-mono text-fs0">{Object.entries(e.refs).map(([k, v]) => `${k}=${v}`).join(' · ') || t.common.none}</code></dd>
                {change && task && (
                  <>
                    <dt className="text-fg2 mt-1">{t.log.inputs}</dt>
                    <dd>{t.onboard.traceBody({ task: task.title[locale], minutes: change.advanceMinutes, from: change.fromVersion, to: change.toVersion })} <span className="text-fg2">— {t.agenda.planningRule}</span></dd>
                  </>
                )}
              </dl>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
