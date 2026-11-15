import type { CrewMember, Interval, ScheduleBlock } from '../../state/types';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { fmtDuration, fmtInterval } from '../../i18n/format';
import { durationMinutes, toMs } from '../../domain/time';
import { groundAgendaText } from './groundAgendaText';

interface Props {
  intervalLabel?: (block: ScheduleBlock) => string;
  showDuration?: boolean;
  text?: typeof groundAgendaText.en;
  selectAll?: { label: string; ariaLabel: (title: string) => string };
  range: Interval;
  lanes: { crew: CrewMember; blocks: ScheduleBlock[] }[];
  selectedId: string | null;
  onSelect: (block: ScheduleBlock) => void;
}

/** The same agenda as one card per astronaut: columns on desktop, stacked on mobile (CSS). */
export function GroundCards({ range, lanes, selectedId, onSelect, text, selectAll, intervalLabel, showDuration = true }: Props) {
  const t = useT();
  const locale = useLocale();
  const g = text ?? groundAgendaText[locale];
  const startMs = toMs(range.start), endMs = toMs(range.end);
  return (
    <div className="gac" role="group" aria-label={g.cardsLabel}>
      {lanes.map(({ crew, blocks }) => {
        const shown = blocks.filter((b) => toMs(b.end) > startMs && toMs(b.start) < endMs);
        return (
          <section key={crew.id} className="gac-card" aria-labelledby={`gac-${crew.id}`}>
            <h3 id={`gac-${crew.id}`}>{crew.name}<small>{crew.roleTitle[locale]}</small></h3>
            {shown.length === 0 ? <p className="empty">{g.noBlocks}</p> : (
              <ul>
                {shown.map((b) => (
                  <li key={b.id} className={`gac-item blk-${b.kind}${selectedId === b.id ? ' is-selected' : ''}`}>
                    <span className="mono gac-time">{intervalLabel ? intervalLabel(b) : fmtInterval(b, locale)}</span>
                    <span className="gac-main">
                      <span className="blk-kind">{t.blocks[b.kind]}</span>
                      <span className="gac-title">{b.title[locale]}</span>
                      {showDuration && <span className="muted">{g.duration}: {fmtDuration(durationMinutes(b))}</span>}
                    </span>
                    {(b.movable || selectAll) && (
                      <button type="button" className={`btn btn-ghost btn-sm${selectedId === b.id ? ' is-on' : ''}`} aria-pressed={selectedId === b.id}
                        aria-label={selectAll ? selectAll.ariaLabel(b.title[locale]) : g.selectBlock({ title: b.title[locale] })} onClick={() => onSelect(b)}>{selectAll?.label ?? t.ground.movable}</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
