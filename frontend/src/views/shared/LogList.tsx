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
  if (entries.length === 0) return <p className="empty">{t.ground.logEmpty}</p>;
  const m = state.missions[missionId];
  return (
    <ol className="log-list">
      {entries.map((e) => {
        const change = e.refs.changeId ? m.ground.changes.find((c) => c.id === e.refs.changeId) : null;
        const task = change ? m.ground.plan.blocks.find((b) => b.id === change.taskId) : null;
        return (
          <li key={e.id} className="log-row">
            <span className="log-time">{mt.time(e.atMs)}</span>
            <span className="log-kind">{t.log[e.kind]}</span>
            <details className="log-why">
              <summary>{t.common.why}</summary>
              <dl>
                <dt>{t.log.refs}</dt>
                <dd><code>{Object.entries(e.refs).map(([k, v]) => `${k}=${v}`).join(' · ') || t.common.none}</code></dd>
                {change && task && (
                  <>
                    <dt>{t.log.inputs}</dt>
                    <dd>{t.onboard.traceBody({ task: task.title[locale], minutes: change.advanceMinutes, from: change.fromVersion, to: change.toVersion })} <span className="muted">— {t.agenda.planningRule}</span></dd>
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
