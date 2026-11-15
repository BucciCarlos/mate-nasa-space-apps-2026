import { Fragment, useState } from 'react';
import type { BlockMove, CrewMember, Interval, ScheduleBlock } from '../../state/types';
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
}

function pct(ms: number, range: Interval): number {
  const a = toMs(range.start);
  const b = toMs(range.end);
  return Math.max(0, Math.min(100, ((ms - a) / (b - a)) * 100));
}

/** Crew lanes × time, with a list alternative (03 §6). */
export function Timeline({ range, lanes, moves = [], highlightBlockId = null, nowMs = null, selectedId = null, onSelect, compact = false }: TimelineProps) {
  const t = useT();
  const locale = useLocale();
  const [asList, setAsList] = useState(false);
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

  // Block kind → tint (matches base.css .blk-*).
  const kindBg: Record<string, string> = {
    sleep: 'bg-[rgba(80,100,160,0.28)] border-[rgba(80,100,160,0.6)]',
    pre_sleep: 'bg-[rgba(80,100,160,0.14)] border-[rgba(80,100,160,0.4)] border-dotted',
    post_sleep: 'bg-[rgba(80,100,160,0.14)] border-[rgba(80,100,160,0.4)] border-dotted',
    task: 'bg-[rgba(53,196,230,0.16)]',
    exercise: 'bg-[rgba(79,213,154,0.16)]',
    meal: 'bg-[rgba(255,179,71,0.14)]',
    personal: 'bg-[rgba(127,127,127,0.14)]',
    conference: 'bg-[rgba(127,127,127,0.14)]',
  };
  const renderBlock = (b: ScheduleBlock, lane: CrewMember) => {
    const mv = moveOf(b.id);
    const changed = !!mv;
    const hl = highlightBlockId === b.id;
    const kindLabel = t.blocks[b.kind];
    const title = b.title[locale];
    const label = changed && mv
      ? t.a11y.changedBlock({ title, before: fmtInterval(mv.before, locale), after: fmtInterval(mv.after, locale) })
      : t.a11y.blockLabel({ kind: kindLabel, title, range: fmtInterval(b, locale) });
    const h = compact ? 'h-20' : 'h-[70px]';
    const cls = `absolute top-2 ${h} rounded border border-line text-fg bg-bg3 px-1.5 py-0.5 text-[11px] leading-tight text-left overflow-hidden flex flex-col gap-px ${kindBg[b.kind] ?? ''}${changed ? ' border-2 border-amber bg-amber-bg' : ''}${hl ? ' outline outline-3 outline-amber' : ''}${selectedId === b.id ? ' outline outline-3 outline-accent' : ''}${b.movable ? ' border-accent' : ''}`;
    const style = { left: `${pct(toMs(b.start), range)}%`, width: `${pct(toMs(b.end), range) - pct(toMs(b.start), range)}%` };
    const inner = (
      <>
        <span className="uppercase tracking-[0.06em] text-[9px] opacity-80">{kindLabel}</span>
        <span className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{title}</span>
        <span className="font-mono opacity-85">{fmtClock(b.start)}–{fmtClock(b.end)}</span>
        {changed && <span className="text-[9px] uppercase tracking-[0.06em] font-bold text-amber">{t.agenda.changed} · {t.agenda.after}</span>}
        {b.movable && !compact && <span className="text-[9px] text-accent">{t.ground.movable}</span>}
      </>
    );
    return (
      <Fragment key={`${lane.id}-${b.id}`}>
        {mv && visible(mv.before) && (
          <div className={`absolute top-0.5 h-5 border-2 border-dashed border-amber text-amber flex flex-row items-center gap-1 whitespace-nowrap text-[9px] px-1 ${kindBg[b.kind] ?? ''}`} style={{ left: `${pct(toMs(mv.before.start), range)}%`, width: `${pct(toMs(mv.before.end), range) - pct(toMs(mv.before.start), range)}%` }} aria-hidden="true">
            <span className="text-[9px] uppercase tracking-[0.06em] font-bold text-amber">{t.agenda.before}</span>
            <span className="font-mono">{fmtClock(mv.before.start)}–{fmtClock(mv.before.end)}</span>
          </div>
        )}
        {visible(b) && (onSelect ? (
          <button type="button" className={cls} style={style} aria-label={label} aria-pressed={selectedId === b.id} onClick={() => onSelect(b)}>{inner}</button>
        ) : (
          <div className={cls} style={style} aria-label={label} role="img">{inner}</div>
        ))}
      </Fragment>
    );
  };

  return (
    <div className="my-3">
      <div className="flex justify-between items-center gap-2 flex-wrap mb-2 text-fs0">
        <span className="text-fg2">{fmtDate(range.start, locale)} {fmtClock(range.start)} → {fmtDate(range.end, locale)} {fmtClock(range.end)} {t.common.utc}</span>
        <button type="button" className="inline-flex items-center gap-1 px-2 py-1 text-fs0 rounded text-accent bg-transparent hover:underline" onClick={() => setAsList((v) => !v)} aria-pressed={asList}>
          {asList ? t.common.showAsTimeline : t.common.showAsList}
        </button>
      </div>
      {asList ? (
        <div>
          {lanes.map(({ crew, blocks }) => (
            <section key={crew.id} className="mb-3" aria-label={t.agenda.crewLane({ name: crew.name })}>
              <h3>{crew.name}</h3>
              <ul>
                {blocks.filter(visible).map((b) => {
                  const mv = moveOf(b.id);
                  return (
                    <li key={b.id} className={mv ? 'text-amber' : ''}>
                      <span className="uppercase tracking-[0.06em] text-[9px] opacity-80">{t.blocks[b.kind]}</span> {b.title[locale]} · {fmtInterval(b, locale)}
                      {mv && <> — <strong>{t.agenda.changed}</strong>: {t.agenda.before} {fmtInterval(mv.before, locale)} → {t.agenda.after} {fmtInterval(mv.after, locale)}</>}
                      {onSelect && b.movable && <> <button type="button" className="inline-flex items-center gap-1 px-2 py-1 text-fs0 rounded text-accent bg-transparent hover:underline" onClick={() => onSelect(b)}>{t.ground.movable}</button></>}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className={`border border-line rounded-md overflow-hidden bg-bg2 ${compact ? 'is-compact' : ''}`} role="group" aria-label={t.agenda.timeline}>
          <div className="relative h-[22px] ml-[140px] border-b border-line text-[11px] text-fg2 font-mono" aria-label={t.agenda.timeAxis}>
            {labelled.map((h) => (
              <span key={h} className="absolute top-[3px] -translate-x-1/2" style={{ left: `${pct(h, range)}%` }}>{fmtClock(h)}</span>
            ))}
          </div>
          {lanes.map(({ crew, blocks }, i) => (
            <div key={crew.id} className={`flex border-b border-line ${i === lanes.length - 1 ? 'border-b-0' : ''}`} aria-label={t.agenda.crewLane({ name: crew.name })}>
              <div className="w-[140px] flex-[0_0_140px] px-2 py-2 font-semibold text-fs0 border-r border-line bg-bg3 flex items-center">{crew.name}</div>
              <div className={`relative flex-1 ${compact ? 'h-24' : 'h-[86px]'}`}>
                {hours.map((h) => <span key={h} className="absolute top-0 bottom-0 border-l border-dashed border-line" style={{ left: `${pct(h, range)}%` }} aria-hidden="true" />)}
                {blocks.map((b) => renderBlock(b, crew))}
                {nowMs !== null && nowMs > startMs && nowMs < endMs && (
                  <span className="absolute top-0 bottom-0 border-l-2 border-red" style={{ left: `${pct(nowMs, range)}%` }}><span className="absolute top-0 left-[3px] text-[9px] text-red font-bold">{t.ground.nowLine}</span></span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
