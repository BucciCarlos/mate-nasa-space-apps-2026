import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import type { BlockMove, CrewMember, Interval, ScheduleBlock } from '../../state/types';
import type { CSSProperties } from 'react';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { fmtClock, fmtDate, fmtInterval } from '../../i18n/format';
import { HOUR_MS, toMs } from '../../domain/time';

export interface TimelineProps {
  range: Interval;
  lanes: { crew: CrewMember; blocks: ScheduleBlock[] }[];
  /** Moves to render as Before (dashed) / After (solid) with the "Changed" label */
  moves?: BlockMove[];
  highlightBlockId?: string | null;
  nowMs?: number | null;
  selectedId?: string | null;
  onSelect?: (block: ScheduleBlock) => void;
  compact?: boolean;
  operations?: boolean;
}

function pct(ms: number, range: Interval): number {
  const a = toMs(range.start);
  const b = toMs(range.end);
  return Math.max(0, Math.min(100, ((ms - a) / (b - a)) * 100));
}

/** Crew lanes × time, with a list alternative (03 §6). */
export function Timeline({ range, lanes, moves = [], highlightBlockId = null, nowMs = null, selectedId = null, onSelect, compact = false, operations = false }: TimelineProps) {
  const t = useT();
  const locale = useLocale();
  const [asList, setAsList] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startMs = toMs(range.start);
  const endMs = toMs(range.end);
  const hours: number[] = [];
  for (let h = Math.ceil(startMs / HOUR_MS) * HOUR_MS; h <= endMs; h += HOUR_MS) hours.push(h);
  // Label every hour on short ranges, every 2 or 3 hours on long ones, so labels never overlap
  const spanHours = (endMs - startMs) / HOUR_MS;
  const labelStep = spanHours > 36 ? 3 : spanHours > 18 ? 2 : 1;
  const labelled = hours.filter((h) => (h / HOUR_MS) % labelStep === 0);
  const moveOf = (id: string) => moves.find((m) => m.blockId === id);
  const visible = (i: Interval) => toMs(i.end) > startMs && toMs(i.start) < endMs;

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!operations || !scroller) return;
    const marker = scroller.querySelector('.tl-now');
    scroller.scrollLeft = marker
      ? Math.max(0, marker.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft - scroller.clientWidth / 3)
      : 0;
  }, [operations, startMs, endMs, asList]);

  const renderBlock = (b: ScheduleBlock, lane: CrewMember) => {
    const mv = moveOf(b.id);
    const changed = !!mv;
    const hl = highlightBlockId === b.id;
    const kindLabel = t.blocks[b.kind];
    const title = b.title[locale];
    const label = changed && mv
      ? t.a11y.changedBlock({ title, before: fmtInterval(mv.before, locale), after: fmtInterval(mv.after, locale) })
      : t.a11y.blockLabel({ kind: kindLabel, title, range: fmtInterval(b, locale) });
    const cls = `blk blk-${b.kind}${changed ? ' is-changed' : ''}${hl ? ' is-highlight' : ''}${selectedId === b.id ? ' is-selected' : ''}${b.movable ? ' is-movable' : ''}`;
    const style = { left: `${pct(toMs(b.start), range)}%`, width: `${pct(toMs(b.end), range) - pct(toMs(b.start), range)}%` };
    const inner = (
      <>
        <span className="blk-kind">{kindLabel}</span>
        <span className="blk-title">{title}</span>
        <span className="blk-time">{fmtClock(b.start)}–{fmtClock(b.end)}</span>
        {operations && <span className="blk-short-time" aria-hidden="true">{fmtClock(b.start)}</span>}
        {changed && <span className="blk-flag">{t.agenda.changed} · {t.agenda.after}</span>}
        {b.movable && !compact && <span className="blk-movable">{t.ground.movable}</span>}
      </>
    );
    return (
      <Fragment key={`${lane.id}-${b.id}`}>
        {mv && visible(mv.before) && (
          <div className={`blk blk-${b.kind} is-before`} style={{ left: `${pct(toMs(mv.before.start), range)}%`, width: `${pct(toMs(mv.before.end), range) - pct(toMs(mv.before.start), range)}%` }} aria-hidden="true">
            <span className="blk-flag">{t.agenda.before}</span>
            <span className="blk-time">{fmtClock(mv.before.start)}–{fmtClock(mv.before.end)}</span>
          </div>
        )}
        {visible(b) && (onSelect ? (
          <button type="button" className={cls} style={style} title={operations ? label : undefined} aria-label={label} aria-pressed={selectedId === b.id} onClick={() => onSelect(b)}>{inner}</button>
        ) : (
          <div className={cls} style={style} title={operations ? label : undefined} aria-label={label} role="img">{inner}</div>
        ))}
      </Fragment>
    );
  };

  return (
    <div className={`timeline-wrap${operations ? ' operations-timeline' : ''}`}>
      <div className="timeline-tools">
        <span className="muted" aria-live={operations ? 'polite' : undefined}>{fmtDate(range.start, locale)} {fmtClock(range.start)} → {fmtDate(range.end, locale)} {fmtClock(range.end)} {t.common.utc}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsList((v) => !v)} aria-pressed={asList}>
          {asList ? t.common.showAsTimeline : t.common.showAsList}
        </button>
      </div>
      {operations && !lanes.some(({ blocks }) => blocks.some(visible)) && <p className="empty">{t.operations.emptyWindow}</p>}
      {asList ? (
        <div className="timeline-list">
          {lanes.map(({ crew, blocks }) => (
            <section key={crew.id} aria-label={t.agenda.crewLane({ name: crew.name })}>
              <h3>{crew.name}</h3>
              <ul>
                {blocks.filter(visible).map((b) => {
                  const mv = moveOf(b.id);
                  return (
                    <li key={b.id} className={mv ? 'is-changed' : ''}>
                      <span className="blk-kind">{t.blocks[b.kind]}</span> {b.title[locale]} · {fmtInterval(b, locale)}
                      {mv && <> — <strong>{t.agenda.changed}</strong>: {t.agenda.before} {fmtInterval(mv.before, locale)} → {t.agenda.after} {fmtInterval(mv.after, locale)}</>}
                      {onSelect && (operations || b.movable) && <> <button type="button" className="btn btn-ghost btn-sm" aria-label={operations ? t.operations.activityDetails({ title: b.title[locale] }) : undefined} onClick={() => onSelect(b)}>{b.movable ? t.ground.movable : t.operations.details}</button></>}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div ref={scrollRef} className="timeline-scroll" role="group" aria-label={t.agenda.timeline} tabIndex={0}>
          <div className={`timeline${compact ? ' is-compact' : ''}`} style={operations ? { '--timeline-width': `${140 + spanHours * 108}px` } as CSSProperties : undefined}>
            <div className="tl-axis" aria-label={t.agenda.timeAxis}>
              {labelled.map((h) => (
                <span key={h} className="tl-tick" style={{ left: `${pct(h, range)}%` }}>{fmtClock(h)}</span>
              ))}
            </div>
            {lanes.map(({ crew, blocks }) => (
              <div key={crew.id} className="tl-lane" aria-label={t.agenda.crewLane({ name: crew.name })}>
                <div className="tl-lane-name">{crew.name}</div>
                <div className="tl-lane-track">
                  {hours.map((h) => <span key={h} className="tl-grid" style={{ left: `${pct(h, range)}%` }} aria-hidden="true" />)}
                  {blocks.map((b) => renderBlock(b, crew))}
                  {nowMs !== null && nowMs > startMs && nowMs < endMs && (
                    <span className="tl-now" style={{ left: `${pct(nowMs, range)}%` }}><span className="tl-now-label">{t.ground.nowLine}</span></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
