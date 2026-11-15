import { useEffect, useMemo, useState } from 'react';
import type { AdvanceMinutes, GroundRole, MissionId, ScheduleBlock } from '../../state/types';
import { ADVANCE_OPTIONS } from '../../state/types';
import { useApp } from '../../state/AppProvider';
import { planChangeSent } from '../../state/mateSlice';
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

const primaryBtn = 'inline-flex items-center gap-2 px-4 py-2 rounded-md font-bold bg-accent text-accent-fg border border-transparent disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';

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
    dispatch(planChangeSent(missionId, selected.id, minutes, Date.now()));
    setSentFlash(true);
    window.setTimeout(() => setSentFlash(false), 2500);
  };

  const statusOf = (changeId: string) => messages.find((m) => m.direction === 'uplink' && m.changeId === changeId);
  const statusLabel = (s: 'queued' | 'in_transit' | 'delivered') => (s === 'queued' ? t.message.queued : s === 'in_transit' ? t.message.inTransit : t.message.delivered);

  const opt = (on: boolean) => `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-bg3 cursor-pointer ${on ? 'bg-accent text-accent-fg font-semibold border-transparent' : ''}`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-4 items-start">
      <section className="border border-line rounded-md bg-bg2 p-4" aria-labelledby="ground-agenda-h">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 id="ground-agenda-h">{t.ground.agendaTitle}</h1>
          <span className="text-fg2 text-fs0">{t.agenda.planVersion({ version: plan.version })}</span>
          <Badge kind="simulated" />
        </div>
        <p className="text-fg2 text-fs0 mt-1">{t.ground.agendaHint}</p>
        <Timeline range={range} lanes={lanes} nowMs={missionNow} selectedId={selectedId} onSelect={onSelect} />
        <section className="mt-4" aria-labelledby="sent-h">
          <h2 id="sent-h">{t.ground.sentChanges}</h2>
          {changes.length === 0 ? <p className="text-center text-fg2 py-4">{t.ground.noChanges}</p> : (
            <ul className="flex flex-col divide-y divide-line border border-line rounded-md overflow-hidden">
              {[...changes].reverse().map((c) => {
                const task = plan.blocks.find((b) => b.id === c.taskId);
                const msg = statusOf(c.id);
                return (
                  <li key={c.id} className="flex flex-wrap gap-2 items-center px-3 py-2">
                    <span className="font-mono text-fs0 text-fg2">{mt.time(c.createdAtMs)}</span>
                    <span>{t.ground.changeRow({ task: task ? task.title[locale] : c.taskId, minutes: c.advanceMinutes, version: c.toVersion })}</span>
                    {msg && <StatusBadge kind={msg.status} label={statusLabel(msg.status)} />}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </section>

      <aside className="border border-line rounded-md bg-bg2 p-4" aria-labelledby="task-panel-h">
        <h2 id="task-panel-h">{t.ground.taskPanelTitle}</h2>
        {!selected ? <p className="text-center text-fg2 py-4">{t.ground.selectTask}</p> : (
          <>
            <div className="my-2">
              <div className="text-fs2 font-semibold">{selected.title[locale]}</div>
              <div className="text-fg2 text-fs0">{t.blocks[selected.kind]} · {fmtInterval(selected, locale)}</div>
              <div className="text-fg2 text-fs0">{t.ground.affectedCrew}: {selected.crewIds.map((id) => crew.find((c) => c.id === id)?.name ?? id).join(', ')}</div>
            </div>
            {!selected.movable ? <p className="text-amber text-fs0" role="alert">{t.ground.notMovable}</p> : (
              <>
                <fieldset className="my-2">
                  <legend className="font-semibold text-fs1 mb-1">{t.ground.advanceBy}</legend>
                  <div className="flex flex-wrap gap-2">
                    {ADVANCE_OPTIONS.map((m) => (
                      <label key={m} className={opt(minutes === m)}>
                        <input type="radio" name="advance" value={m} className="sr-only" checked={minutes === m} onChange={() => setMinutes(m)} />
                        {t.ground.minutes({ n: m })}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <h3 className="font-semibold text-fs1 mt-2">{t.ground.rulePreview}</h3>
                {preview && preview.ok && (
                  <div className="my-2">
                    <p className="font-mono text-fs0">{t.ground.newTime({ before: fmtInterval(selected, locale), after: fmtInterval({ start: preview.plan.blocks.find((b) => b.id === selected.id)!.start, end: preview.plan.blocks.find((b) => b.id === selected.id)!.end }, locale) })}</p>
                    {preview.perCrew.map((pc) => (
                      <div key={pc.crewId} className="my-2">
                        <RestWindowCard rest={pc.rest} name={crew.find((c) => c.id === pc.crewId)?.name ?? pc.crewId} />
                        <ul className="list-disc pl-5 text-fs0">
                          {pc.moves.map((mv) => (
                            <li key={mv.blockId}><span className="uppercase tracking-[0.06em] text-[9px] opacity-80">{t.blocks[mv.kind]}</span> {mv.title[locale]}: {fmtInterval(mv.before, locale)} → {fmtInterval(mv.after, locale)}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
                {preview && !preview.ok && (
                  <p className="text-amber text-fs0 my-1" role="alert">
                    {preview.reason === 'conflict'
                      ? t.ground.conflict({ blocks: preview.blockIds.map((id) => plan.blocks.find((b) => b.id === id)?.title[locale] ?? id).join(', ') })
                      : preview.reason === 'rest_window_eliminated' ? t.ground.restEliminated : t.ground.notMovable}
                  </p>
                )}
                <details className="border border-line rounded-md px-2 py-1 my-2 text-fs0">
                  <summary className="cursor-pointer text-accent">{t.agenda.planningRule}</summary>
                  <p className="mt-1">{t.agenda.planningRuleBody}</p>
                </details>
                {canSend ? (
                  <button type="button" className={primaryBtn} disabled={!preview?.ok} onClick={send}>{t.ground.sendUpdate}</button>
                ) : (
                  <p className="text-fg2 text-fs0">{t.ground.readOnlyRole}</p>
                )}
                {sentFlash && <p className="text-green font-semibold" role="status">{t.ground.sent}</p>}
              </>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
