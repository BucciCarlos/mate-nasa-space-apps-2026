import { useId } from 'react';
import { DAY_START, DAY_END, scheduleClock, scheduleInterval } from '../../demo/fd30Day';
import { useLocale } from '../../i18n/I18nProvider';
import type { OperationalBlock, OperationalCrew } from './opsSelectors';
import { GROUND_TRACKING_TEXT } from './groundTrackingText';

export function GroundPlanTimeline({ crew, time, selectedId, onSelect }: {
  crew: readonly OperationalCrew[]; time: number; selectedId: string | null; onSelect: (block: OperationalBlock) => void;
}) {
  const t = GROUND_TRACKING_TEXT[useLocale()], locale = useLocale(), heading = useId();
  const position = (ms: number) => (ms - DAY_START) / (DAY_END - DAY_START) * 100;
  const now = position(time);
  return <section className="gnd-schedule" aria-labelledby={heading}>
    <div className="gnd-section-heading"><h2 id={heading}>{t.timeline}</h2><span className="gnd-plan-key">{t.planned}</span></div>
    <div className="gnd-timeline-scroll" role="region" tabIndex={0} aria-label={t.timelineLabel}>
      <div className="gnd-timeline">
        <div className="gnd-axis"><span>{t.axis}</span><div>{[0, 6, 12, 18, 24].map(hour => <time key={hour} style={{ left: `${hour / 24 * 100}%` }}>{`${String(hour).padStart(2, '0')}:00`}</time>)}
          {now >= 0 && now < 100 && <span className="gnd-cursor-label" style={{ left: `${now}%` }}>{scheduleClock(time)}</span>}
        </div></div>
        {crew.map(person => <div className="gnd-plan-lane" key={person.id} data-gnd-lane={person.id}>
          <strong>{person.name}</strong><div className="gnd-plan-track">
            {person.blocks.filter(b => Date.parse(b.end) > DAY_START && Date.parse(b.start) < DAY_END).map(block => {
              const start = Math.max(DAY_START, Date.parse(block.start)), end = Math.min(DAY_END, Date.parse(block.end));
              const continuation = Date.parse(block.start) < DAY_START ? t.fromPrevious : block.continuesAfterDay ? t.continues : '';
              const label = `${person.name} · ${block.title[locale]} · ${scheduleInterval(block)} · ${t.planned}${continuation ? ` · ${continuation}` : ''}`;
              return <button key={block.id} type="button" className={`gnd-plan-block${selectedId === block.id ? ' is-selected' : ''}`} data-kind={block.kind}
                style={{ left: `${position(start)}%`, width: `${position(end) - position(start)}%` }} title={label} aria-label={label} aria-pressed={selectedId === block.id} onClick={() => onSelect(block)}>
                <span>{block.title[locale]}</span>
              </button>;
            })}
            {now >= 0 && now < 100 && <span className="gnd-plan-cursor" style={{ left: `${now}%` }} role="img" aria-label={`${t.now} · ${scheduleClock(time)} ${t.axis}`} />}
          </div>
        </div>)}
      </div>
    </div>
    <p className="gnd-note">{t.planLimit}</p>
  </section>;
}
