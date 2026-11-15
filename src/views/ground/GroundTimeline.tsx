import { Fragment, useLayoutEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { CrewMember, Interval, ScheduleBlock } from '../../state/types';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { fmtClock, fmtDate, fmtInterval, fmtTime } from '../../i18n/format';
import { HOUR_MS, toMs } from '../../domain/time';
import { groundAgendaText } from './groundAgendaText';

/** One hour is this wide, so 48 h are never squeezed into the screen: the track scrolls sideways. */
export const PX_PER_HOUR = 80;
export const NAME_COL = 150;

interface Props {
  text?: typeof groundAgendaText.en;
  range: Interval;
  lanes: { crew: CrewMember; blocks: ScheduleBlock[] }[];
  nowMs: number | null;
  selectedId: string | null;
  onSelect: (block: ScheduleBlock) => void;
  /** Remembers the scroll position so switching to cards and back keeps the place. */
  scrollRef: MutableRefObject<number | null>;
}

/** Wide, horizontally scrollable crew timeline. Names are sticky on the left, one per row. */
export function GroundTimeline({ range, lanes, nowMs, selectedId, onSelect, scrollRef, text }: Props) {
  const t = useT();
  const locale = useLocale();
  const g = text ?? groundAgendaText[locale];
  const scroller = useRef<HTMLDivElement>(null);
  const startMs = toMs(range.start), endMs = toMs(range.end);
  const x = (ms: number) => ((ms - startMs) / HOUR_MS) * PX_PER_HOUR;
  const trackWidth = x(endMs);
  const hours: number[] = [];
  for (let h = Math.ceil(startMs / HOUR_MS) * HOUR_MS; h < endMs; h += HOUR_MS) hours.push(h);
  const nowVisible = nowMs !== null && nowMs > startMs && nowMs < endMs;
  const visible = (b: ScheduleBlock) => toMs(b.end) > startMs && toMs(b.start) < endMs;

  // Pure scrolling: it never touches the mission clock or any state.
  const centerOnNow = (smooth: boolean) => {
    const el = scroller.current;
    if (!el || nowMs === null) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: Math.max(0, x(nowMs) - (el.clientWidth - NAME_COL) / 2), behavior: smooth && !reduce ? 'smooth' : 'auto' });
  };
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (scrollRef.current !== null) el.scrollLeft = scrollRef.current;
    else if (nowVisible) centerOnNow(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="gat">
      <div className="gat-tools">
        <span className="gat-now-readout">{nowVisible ? g.nowAt({ time: fmtTime(nowMs!, locale) }) : g.nowOutside}</span>
        <button type="button" className="btn btn-ghost btn-sm" disabled={!nowVisible} onClick={() => centerOnNow(true)}>{g.centerNow}</button>
        <span className="muted">{g.scrollHint}</span>
      </div>
      <div className="gat-scroll" ref={scroller} role="region" tabIndex={0} aria-label={g.timelineRegion} onScroll={(e) => { scrollRef.current = e.currentTarget.scrollLeft; }}>
        <div className="gat-inner" style={{ width: NAME_COL + trackWidth }}>
          <div className="gat-axis" aria-label={t.agenda.timeAxis}>
            <div className="gat-corner" style={{ width: NAME_COL }}>{t.agenda.timeAxis}</div>
            <div className="gat-axis-track" style={{ width: trackWidth }}>
              {hours.map((h, i) => {
                const midnight = new Date(h).getUTCHours() === 0;
                return (
                  <Fragment key={h}>
                    {(midnight || i === 0) && <span className="gat-date" style={{ left: x(h) }}>{fmtDate(h, locale)}</span>}
                    <span className="gat-tick" style={{ left: x(h) }}>{fmtClock(h)}</span>
                  </Fragment>
                );
              })}
              {nowVisible && <span className="gat-now-chip" style={{ left: x(nowMs!) }}>{t.ground.nowLine} · {fmtClock(nowMs!)}</span>}
            </div>
          </div>
          {lanes.map(({ crew, blocks }) => (
            <div key={crew.id} className="gat-lane" role="group" aria-label={t.agenda.crewLane({ name: crew.name })}>
              <div className="gat-name" style={{ width: NAME_COL }}>
                <strong>{crew.name}</strong>
                <small>{crew.roleTitle[locale]}</small>
              </div>
              <div className="gat-track" style={{ width: trackWidth }}>
                {hours.map((h) => <span key={h} className="gat-grid" style={{ left: x(h) }} aria-hidden="true" />)}
                {blocks.filter(visible).map((b) => {
                  const title = b.title[locale];
                  const label = t.a11y.blockLabel({ kind: t.blocks[b.kind], title, range: fmtInterval(b, locale) });
                  return (
                    <button key={b.id} type="button" className={`blk blk-${b.kind}${selectedId === b.id ? ' is-selected' : ''}${b.movable ? ' is-movable' : ''}`}
                      style={{ left: x(toMs(b.start)), width: Math.max(2, x(toMs(b.end)) - x(toMs(b.start))) }}
                      aria-label={label} aria-pressed={selectedId === b.id} onClick={() => onSelect(b)}>
                      <span className="blk-kind">{t.blocks[b.kind]}</span>
                      <span className="blk-title">{title}</span>
                      <span className="blk-time">{fmtClock(b.start)}–{fmtClock(b.end)}</span>
                      {b.movable && <span className="blk-movable">{t.ground.movable}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {nowVisible && <span className="gat-now-line" style={{ left: NAME_COL + x(nowMs!) }} aria-hidden="true" />}
        </div>
      </div>
    </div>
  );
}
