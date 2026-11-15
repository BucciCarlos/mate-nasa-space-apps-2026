import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { toHash } from '../app/routes';
import { useLocale, useT } from '../i18n/I18nProvider';
import { SCHEDULE_TEXT } from '../i18n/fd30Schedule';
import { useCrewName } from './viewerName';
import type { CrewId, PreviewState } from './fd30';
import { EQUIPMENT, PLAN_SOURCE, PLAN_VERSION, planFor } from './fd30Plan';
import { SCHEDULE_END, SCHEDULE_START, scheduleBlockView, scheduleX, scheduleClock, scheduleInterval, scheduleContinuation } from './fd30Schedule';
import '../styles/fd30-schedule.css';

export function Fd30PersonalAgenda({ state, owner, time }: { state: PreviewState; owner: CrewId; time: number }) {
  const locale = useLocale(), messages = useT(), t = SCHEDULE_TEXT[locale];
  const crew = { name: useCrewName(owner) };
  const blocks = planFor(owner);
  // Local selection/scroll only: no simulation dispatch, clock or record copies here.
  const [selected, setSelected] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const ownerCell = useRef<HTMLDivElement>(null);
  const view = selected ? scheduleBlockView(state, owner, selected, time) : null;
  const formatTime = (value: number | string) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(new Date(value));
  const blockTime = (block: typeof blocks[number]) => `${scheduleInterval(block)} ${scheduleContinuation(block, t)}`;
  const center = () => {
    const el = scroller.current;
    if (el) el.scrollLeft = scheduleX(time) - (el.clientWidth - (ownerCell.current?.offsetWidth ?? 0)) / 2;
  };
  // Initial entry/profile changes center the viewport; ticking never steals the user's scroll.
  useEffect(() => { setSelected(null); center(); }, [owner]);
  const hours = Array.from({ length: (SCHEDULE_END - SCHEDULE_START) / 1_800_000 + 1 }, (_, i) => SCHEDULE_START + i * 1_800_000);
  const width = scheduleX(SCHEDULE_END);
  return <div className="fd-personal-schedule">
    <div className="fd-page-intro"><p className="fd-eyebrow">{messages.fd30.personal} / {messages.fd30.agendaNav}</p><h1 id="fd-view-h" tabIndex={-1}>{t.title}</h1><p>{t.intro}</p></div>
    <section className="fd-schedule" aria-label={t.timeline}>
      <div className="fd-schedule-toolbar"><div className="fd-schedule-profile"><strong>{crew.name}</strong><span>{t.now} <time data-schedule-now={time}>{formatTime(time)} {t.utc}</time></span></div><button type="button" onClick={center}>{t.center}</button></div>
      <div className="fd-schedule-browse"><span id="fd-schedule-hint">{t.browse}</span><div><button type="button" onClick={() => scroller.current?.scrollBy({ left: -480 })}>{t.earlier}</button><button type="button" onClick={() => scroller.current?.scrollBy({ left: 480 })}>{t.later}</button></div></div>
      <div className="fd-schedule-scroll" ref={scroller} tabIndex={0} role="region" aria-label={t.timeline} aria-describedby="fd-schedule-hint">
        <div className="fd-schedule-canvas" style={{ '--schedule-width': `${width}px` } as CSSProperties}>
          <div className="fd-schedule-corner">{t.utc}</div>
          <div className="fd-schedule-owner" ref={ownerCell}><strong>{crew.name}</strong><span>{t.row}</span></div>
          <div className="fd-schedule-track" style={{ width }}>
            {hours.map(h => <div className={`fd-schedule-tick${h === SCHEDULE_END ? ' fd-schedule-close' : ''}`} style={{ left: scheduleX(h) }} key={h}><time>{scheduleClock(h)}</time></div>)}
            <div className="fd-schedule-blocks" data-schedule-owner={owner}>
              {blocks.map(block => {
                const association = scheduleBlockView(state, owner, block.id, time)!;
                const start = Math.max(SCHEDULE_START, Date.parse(block.start));
                const short = Date.parse(block.end) - Date.parse(block.start) < 15 * 60_000;
                return <button type="button" key={block.id} className={`fd-schedule-block fd-schedule-${block.kind}${short ? ' fd-schedule-short' : ''}`}
                  data-schedule-block={block.id} aria-pressed={selected === block.id} aria-controls="fd-schedule-detail"
                  aria-label={`${block.title[locale]} · ${blockTime(block)} · ${association.event ? t.confirmed : t.planned}`}
                  title={`${block.title[locale]} · ${blockTime(block)}`} onClick={() => setSelected(block.id)}
                  style={{ left: scheduleX(start), width: scheduleX(Math.min(SCHEDULE_END, Date.parse(block.end))) - scheduleX(start) }}>
                  <span className="fd-schedule-block-copy"><time>{short ? formatTime(block.start) : scheduleInterval(block)}</time><strong>{short ? messages.blocks[block.kind] : block.title[locale]}</strong>{!short && <small>{scheduleContinuation(block, t)}</small>}<span>{short ? association.event ? t.eventShort : t.planShort : association.event ? t.confirmed : t.planned}</span></span>
                </button>;
              })}
            </div>
            <div className="fd-schedule-marker" style={{ left: scheduleX(time) }} data-schedule-marker={time}><span>{t.now} {formatTime(time)}</span></div>
          </div>
        </div>
      </div>
      <p className="fd-schedule-provenance">{t.simulatedPlan} · {PLAN_SOURCE} · {PLAN_VERSION} · {messages.fd30.agendaLimit}</p>
    </section>
    <section className="fd-schedule-detail" id="fd-schedule-detail" aria-labelledby="fd-schedule-detail-h">
      <p className="fd-eyebrow">{t.selected}</p><h2 id="fd-schedule-detail-h">{view ? view.block.title[locale] : t.select}</h2>
      {view && <>
        <dl><dt>{t.hours}</dt><dd>{blockTime(view.block)}</dd><dt>{t.type}</dt><dd>{messages.blocks[view.block.kind]}</dd>
          {view.block.equipmentId && <><dt>{t.equipment}</dt><dd>{EQUIPMENT[view.block.equipmentId][locale]} · {messages.fd30.equipmentUnverified}</dd></>}
        </dl>
        <p className="fd-schedule-plan-label">{t.planned}</p>
        {view.event ? <div className="fd-schedule-event"><strong>{t.confirmed}</strong><dl><dt>{t.event}</dt><dd>{t.stages[view.event.kind]}</dd><dt>{t.occurred}</dt><dd>{formatTime(view.event.occurredAt)}</dd><dt>{t.received}</dt><dd>{formatTime(view.event.receivedAt)}</dd></dl><small>{t.source}: {view.event.sourceId} · {view.event.id}</small>
          {view.module && <a className="fd-link" data-schedule-module={view.module} href={toHash({ view: 'fd30', page: view.module })}>{view.module === 'exercise' ? t.openExercise : t.openLaboratory}</a>}
        </div> : <p data-schedule-unconfirmed>{t.plannedOnly}</p>}
      </>}
    </section>
    <details className="fd-schedule-list"><summary>{t.list}</summary><ol>{blocks.map(block => <li key={block.id}><button type="button" aria-pressed={selected === block.id} aria-controls="fd-schedule-detail" onClick={() => setSelected(block.id)}><time>{blockTime(block)}</time><strong>{block.title[locale]}</strong><span>{messages.blocks[block.kind]}</span></button></li>)}</ol></details>
  </div>;
}
