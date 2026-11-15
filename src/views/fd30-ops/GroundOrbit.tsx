import { useEffect, useRef, useState } from 'react';
import { scheduleClock, scheduleInterval } from '../../demo/fd30Day';
import { useLocale } from '../../i18n/I18nProvider';
import type { GroundRole } from '../../state/types';
import type { OperationalBlock, OperationalCrew } from './opsSelectors';
import { OPS_TEXT } from './opsText';
import { groundPlanReferences } from './groundTracking';
import type { GroundQuery } from './groundTracking';
import { GROUND_TRACKING_TEXT } from './groundTrackingText';

export function GroundOrbit({ crew, selected, role, time, onClose, onReference }: {
  crew: readonly OperationalCrew[]; selected: string | null; role: GroundRole; time: number;
  onClose: () => void; onReference: (block: OperationalBlock) => void;
}) {
  const locale = useLocale(), t = GROUND_TRACKING_TEXT[locale], o = OPS_TEXT[locale];
  const [query, setQuery] = useState<GroundQuery | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const references = query ? groundPlanReferences(crew, query, selected, time) : [];
  const person = crew.find(c => c.id === selected);
  return <aside className="gnd-orbit" id="gnd-orbit" aria-labelledby="gnd-orbit-h" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
    <header><h2 id="gnd-orbit-h" ref={heading} tabIndex={-1}>{t.orbit}</h2><button type="button" aria-label={t.closeOrbit} onClick={onClose}>{'×'}</button></header>
    <p className="gnd-predefined">{t.predefined}</p>
    <dl className="gnd-orbit-context"><dt>{t.context}</dt><dd>{person?.name ?? t.crew}</dd><dt>{t.role}</dt><dd>{role === 'medical_professional' ? o.medical : o.operator}</dd><dt>{o.now}</dt><dd>{scheduleClock(time)} {t.axis}</dd></dl>
    <div className="gnd-query-buttons">{(['equipment', 'maintenance'] as const).map(id => <button type="button" key={id} aria-pressed={query === id} onClick={() => setQuery(id)}>{id === 'equipment' ? t.equipmentQuery : t.maintenanceQuery}</button>)}</div>
    <div className="gnd-orbit-answer" aria-live="polite" aria-atomic="true">
      {!query ? <p>{t.orbitIntro}</p> : <>
        <p>{references.length ? query === 'equipment' ? t.equipmentAnswer : t.maintenanceAnswer : query === 'equipment' ? t.noReservation : t.noMaintenance}</p>
        <ul>{references.map(({ block, people }) => <li key={`${block.id}:${people.join(',')}`}>
          <strong>{people.join(' · ')}</strong><span>{query === 'equipment' ? block.equipment![locale] : block.title[locale]}</span>
          <time>{scheduleInterval(block)}</time><span className="gnd-tag">{t.planned}</span>
          <button type="button" className="gnd-reference" aria-label={`${t.reference} · ${block.id}`} onClick={() => onReference(block)}><span>{t.reference}</span><code>{block.id}</code></button>
        </li>)}</ul>
        <p className="gnd-note">{query === 'equipment' ? t.equipmentLimit : t.planLimit}</p>
      </>}
    </div>
  </aside>;
}
