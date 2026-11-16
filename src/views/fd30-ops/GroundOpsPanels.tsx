import { useId } from 'react';
import { scheduleInterval, scheduleContinuation } from '../../demo/fd30Day';
import { SCHEDULE_TEXT } from '../../i18n/fd30Schedule';
import { useLocale } from '../../i18n/I18nProvider';
import type { OperationalBlock, OperationalCrew } from './opsSelectors';
import { OPS_TEXT } from './opsText';
import { GROUND_TRACKING_TEXT } from './groundTrackingText';
import { crewHeadline, resourceReservations, sharedBlocks } from './groundTracking';

function useInterval() {
  const locale = useLocale();
  return (block: OperationalBlock) => `${scheduleInterval(block)} ${scheduleContinuation(block, SCHEDULE_TEXT[locale])}`.trim();
}

/** Plan-only summary reused by the card and the person detail. Phrasing content only, so it can live inside the card button. */
export function GroundHeadline({ person, time }: { person: OperationalCrew; time: number }) {
  const locale = useLocale(), t = GROUND_TRACKING_TEXT[locale], o = OPS_TEXT[locale], interval = useInterval();
  const { current, progress, next, reservation } = crewHeadline(person, time);
  return <span className="gnd-headline">
    <span className="gnd-hl" data-hl="now"><span className="gnd-hl-label">{t.plannedNow}</span>
      <strong>{current?.title[locale] ?? t.noActivity}</strong>
      {current && <time>{interval(current)}</time>}
      {current && progress !== null && <span className="gnd-elapsed" role="img" aria-label={`${o.planProgress}: ${progress} %`}>
        <span className="gnd-elapsed-bar"><i style={{ width: `${progress}%` }} /></span><small>{progress} % · {t.elapsed}</small></span>}
      <span className="gnd-tag">{t.planned}</span></span>
    <span className="gnd-hl" data-hl="next"><span className="gnd-hl-label">{t.next}</span>
      <strong>{next?.title[locale] ?? t.noNext}</strong>{next && <time>{interval(next)}</time>}</span>
    <span className="gnd-hl" data-hl="equipment" data-phase={reservation?.phase ?? 'none'}>
      <span className="gnd-hl-label">{reservation ? reservation.phase === 'current' ? t.reservationCurrent : t.reservationUpcoming : t.reservation}</span>
      {reservation ? <span className="gnd-hl-inline"><strong>{reservation.block.equipment![locale]}</strong><time>{interval(reservation.block)}</time></span> : <strong>{t.noReservationPlan}</strong>}</span>
  </span>;
}

/** Compact resource view and shared blocks, both derived from the projected operational plan. */
export function GroundResources({ crew, time, onInspect }: { crew: readonly OperationalCrew[]; time: number; onInspect: (block: OperationalBlock) => void }) {
  const locale = useLocale(), t = GROUND_TRACKING_TEXT[locale], interval = useInterval(), id = useId();
  const resources = resourceReservations(crew, time), shared = sharedBlocks(crew, time);
  return <section className="gnd-resources" aria-labelledby={`${id}-r`} data-gnd-resources>
    <div className="gnd-resource-panel" data-gnd-resource-list>
      <h2 id={`${id}-r`}>{t.resources}</h2>
      <ul>{resources.map(resource => <li key={resource.name.en} data-resource={resource.name.en}>
        <strong>{resource.name[locale]}</strong>
        {resource.entries.length ? <ul>{resource.entries.map(({ person, block, phase }) => <li key={block.id} data-phase={phase}>
          <span>{person}</span><time>{interval(block)}</time>
          <span className="gnd-tag">{phase === 'current' ? t.reservationCurrent : t.reservationUpcoming}</span></li>)}</ul>
          : <p>{t.noReservationPlan}</p>}
      </li>)}</ul>
    </div>
    <div className="gnd-resource-panel" data-gnd-shared-list>
      <h2>{t.sharedTitle}</h2>
      {shared.length ? <ul>{shared.map(({ block, people, phase }) => <li key={block.id} data-shared={block.id} data-phase={phase}>
        <button type="button" onClick={() => onInspect(block)}>{block.title[locale]}</button>
        <time>{interval(block)}</time>
        <span>{t.sharedWith}: {people.join(' · ')}</span>
        <span className="gnd-tag">{phase === 'current' ? t.sharedNow : t.sharedUpcoming} · {t.planned}</span></li>)}</ul> : <p>{t.noShared}</p>}
    </div>
    <p className="gnd-note">{t.resourcesLimit}</p>
  </section>;
}
