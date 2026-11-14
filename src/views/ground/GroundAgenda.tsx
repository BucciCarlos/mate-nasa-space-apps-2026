import { useEffect, useMemo, useState } from 'react';
import type { AdvanceMinutes, GroundRole, MissionId, ScheduleBlock } from '../../state/types';
import { ADVANCE_OPTIONS } from '../../state/types';
import { useApp } from '../../state/AppProvider';
import { selectGroundPlan } from '../../state/selectors';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { fmtInterval } from '../../i18n/format';
import { advanceTask } from '../../domain/agenda';
import { DAY_MS, missionTimeMs, toIso, toMs } from '../../domain/time';
import { Timeline } from '../shared/Timeline';
import { RestWindowCard } from '../shared/RestWindowCard';
import { Badge, StatusBadge } from '../shared/Badge';
import { useNow } from '../../state/useNow';
import { useMissionTime } from '../shared/useMissionTime';

export function GroundAgenda({ missionId, role }: { missionId: MissionId; role: GroundRole }) {
  const { state, dispatch } = useApp();
  const t = useT();
  const locale = useLocale();
  const now = useNow(30_000);
  const mt = useMissionTime(missionId);
  const { plan, crew, changes, messages } = selectGroundPlan(state, missionId, role);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<AdvanceMinutes>(90);
  const [sentFlash, setSentFlash] = useState(false);

  useEffect(() => { setSelectedId(null); }, [missionId]);

  // Ground covers the current mission day and the next one (03 §2)
  const range = useMemo(() => {
    const dayStart = Math.floor(toMs(state.missions[missionId].clockStart) / DAY_MS) * DAY_MS;
    return { start: toIso(dayStart), end: toIso(dayStart + 2 * DAY_MS) };
  }, [state.missions, missionId]);
  const selected = selectedId ? plan.blocks.find((b) => b.id === selectedId) ?? null : null;
  const preview = selected ? advanceTask(plan, selected.id, minutes) : null;
  const lanes = crew.map((c) => ({ crew: c, blocks: plan.blocks.filter((b) => b.crewIds.includes(c.id)) }));
  const missionNow = missionTimeMs(state.missions[missionId].clockStart, state.sessionStartMs, now);
  const canSend = role === 'mission_operator';

  const onSelect = (b: ScheduleBlock) => setSelectedId(b.id);
  const send = () => {
    if (!selected || !preview?.ok || !canSend) return;
    dispatch({ type: 'plan/change_sent', missionId, taskId: selected.id, advanceMinutes: minutes, nowMs: Date.now() });
    setSentFlash(true);
    window.setTimeout(() => setSentFlash(false), 2500);
  };

  const statusOf = (changeId: string) => messages.find((m) => m.direction === 'uplink' && m.changeId === changeId);
  const statusLabel = (s: 'queued' | 'in_transit' | 'delivered') => (s === 'queued' ? t.message.queued : s === 'in_transit' ? t.message.inTransit : t.message.delivered);

  return (
    <div className="ground-agenda">
      <section className="panel panel-main" aria-labelledby="ground-agenda-h">
        <div className="panel-head">
          <h1 id="ground-agenda-h">{t.ground.agendaTitle}</h1>
          <span className="muted">{t.agenda.planVersion({ version: plan.version })}</span>
          <Badge kind="simulated" />
        </div>
        <p className="muted">{t.ground.agendaHint}</p>
        <Timeline range={range} lanes={lanes} nowMs={missionNow} selectedId={selectedId} onSelect={onSelect} />
        <section className="sent-changes" aria-labelledby="sent-h">
          <h2 id="sent-h">{t.ground.sentChanges}</h2>
          {changes.length === 0 ? <p className="empty">{t.ground.noChanges}</p> : (
            <ul className="row-list">
              {[...changes].reverse().map((c) => {
                const task = plan.blocks.find((b) => b.id === c.taskId);
                const msg = statusOf(c.id);
                return (
                  <li key={c.id} className="row">
                    <span className="mono">{mt.time(c.createdAtMs)}</span>
                    <span>{t.ground.changeRow({ task: task ? task.title[locale] : c.taskId, minutes: c.advanceMinutes, version: c.toVersion })}</span>
                    {msg && <StatusBadge kind={msg.status} label={statusLabel(msg.status)} />}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </section>

      <aside className="panel panel-side" aria-labelledby="task-panel-h">
        <h2 id="task-panel-h">{t.ground.taskPanelTitle}</h2>
        {!selected ? <p className="empty">{t.ground.selectTask}</p> : (
          <>
            <div className="task-detail">
              <div className="task-title">{selected.title[locale]}</div>
              <div className="muted">{t.blocks[selected.kind]} · {fmtInterval(selected, locale)}</div>
              <div className="muted">{t.ground.affectedCrew}: {selected.crewIds.map((id) => crew.find((c) => c.id === id)?.name ?? id).join(', ')}</div>
            </div>
            {!selected.movable ? <p className="warn">{t.ground.notMovable}</p> : (
              <>
                <fieldset className="advance-opts">
                  <legend>{t.ground.advanceBy}</legend>
                  {ADVANCE_OPTIONS.map((m) => (
                    <label key={m} className={`opt${minutes === m ? ' is-on' : ''}`}>
                      <input type="radio" name="advance" value={m} checked={minutes === m} onChange={() => setMinutes(m)} />
                      {t.ground.minutes({ n: m })}
                    </label>
                  ))}
                </fieldset>
                <h3>{t.ground.rulePreview}</h3>
                {preview && preview.ok && (
                  <div className="preview">
                    <p className="mono">{t.ground.newTime({ before: fmtInterval(selected, locale), after: fmtInterval({ start: preview.plan.blocks.find((b) => b.id === selected.id)!.start, end: preview.plan.blocks.find((b) => b.id === selected.id)!.end }, locale) })}</p>
                    {preview.perCrew.map((pc) => (
                      <div key={pc.crewId} className="preview-crew">
                        <RestWindowCard rest={pc.rest} name={crew.find((c) => c.id === pc.crewId)?.name ?? pc.crewId} />
                        <ul className="moves">
                          {pc.moves.map((mv) => (
                            <li key={mv.blockId}><span className="blk-kind">{t.blocks[mv.kind]}</span> {mv.title[locale]}: {fmtInterval(mv.before, locale)} → {fmtInterval(mv.after, locale)}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
                {preview && !preview.ok && (
                  <p className="warn" role="alert">
                    {preview.reason === 'conflict'
                      ? t.ground.conflict({ blocks: preview.blockIds.map((id) => plan.blocks.find((b) => b.id === id)?.title[locale] ?? id).join(', ') })
                      : preview.reason === 'rest_window_eliminated' ? t.ground.restEliminated : t.ground.notMovable}
                  </p>
                )}
                <details className="rule-note">
                  <summary>{t.agenda.planningRule}</summary>
                  <p>{t.agenda.planningRuleBody}</p>
                </details>
                {canSend ? (
                  <button type="button" className="btn btn-primary" disabled={!preview?.ok} onClick={send}>{t.ground.sendUpdate}</button>
                ) : (
                  <p className="muted">{t.ground.readOnlyRole}</p>
                )}
                {sentFlash && <p className="ok" role="status">{t.ground.sent}</p>}
              </>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
