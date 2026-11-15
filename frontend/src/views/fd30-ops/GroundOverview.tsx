import { scheduleInterval as fmtInterval, scheduleContinuation } from '../../demo/fd30Day';
import { SCHEDULE_TEXT } from '../../i18n/fd30Schedule';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../../i18n/I18nProvider';

import type { CrewId } from '../../demo/fd30';
import type { GroundRole } from '../../state/types';
import { CrewPortrait } from './CrewPortrait';
import type { OperationalCrew, groundView } from './opsSelectors';
import { OPS_TEXT } from './opsText';
import './ops.css';

function PlanSummary({ person }: { person: OperationalCrew }) {
  const locale = useLocale(), t = OPS_TEXT[locale];
  return <div className="ops-plan-summary">
    <p className="ops-label">{t.activity}</p><strong>{person.current?.title[locale] ?? t.noActivity}</strong>
    {person.current && <p className="ops-time">{fmtInterval(person.current)} {scheduleContinuation(person.current, SCHEDULE_TEXT[locale])} · {t.planned}</p>}
    {person.progress !== null ? <div className="ops-progress"><label htmlFor={`ops-progress-${person.id}`}>{t.planProgress}<span>{person.progress}%</span></label><progress id={`ops-progress-${person.id}`} max={100} value={person.progress} /><p>{t.progressLimit}</p></div> : <p className="ops-muted">{t.noProgress}</p>}
    <div className="ops-reservation"><p className="ops-label">{t.reservation}</p>{person.reservation ? <><strong>{person.reservation.equipment![locale]}</strong><p className="ops-time">{fmtInterval(person.reservation)} · {t.planned}</p></> : <p>{t.noReservation}</p>}</div>
  </div>;
}

export function GroundOverview({ data, onRole }: { data: ReturnType<typeof groundView>; onRole: (role: GroundRole) => void }) {
  const locale = useLocale(), t = OPS_TEXT[locale];
  const [selected, select] = useState<CrewId | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (selected) { detailHeading.current?.focus(); detailHeading.current?.scrollIntoView({ block: 'center' }); }
  }, [selected]);
  if (!data) return null;
  const person = data.crew.find(c => c.id === selected);
  return <div className="ops ops-ground" data-ops-ground-role={data.role}>
    <header className="ops-intro"><p className="fd-eyebrow">{t.ground}</p><h1 id="fd-view-h" tabIndex={-1}>{t.groundTitle}</h1><p>{t.groundIntro}</p><label className="ops-role">{t.role}<select value={data.role} onChange={e => onRole(e.target.value as GroundRole)}><option value="mission_operator">{t.operator}</option><option value="medical_professional">{t.medical}</option></select></label></header>
    {person ? <section className="ops-person-detail" data-ops-detail={person.id}>
      <button type="button" onClick={() => select(null)}>{t.close}</button><div className="ops-detail-heading"><CrewPortrait owner={person.id} /><div><p className="ops-label">{t.detail}</p><h2 ref={detailHeading} tabIndex={-1}>{person.name}</h2><p className="ops-muted">{t.fictional}</p></div></div>
      <PlanSummary person={person} />
      {data.role === 'medical_professional' && <section className="ops-medical-empty"><h3>{t.medicalTitle}</h3><strong>{t.medicalEmpty}</strong><p>{t.medicalLimit}</p></section>}
      <section className="ops-plan-list"><h3>{t.agenda}</h3><ul>{person.blocks.map(b => <li key={b.id}><time>{fmtInterval(b)} {scheduleContinuation(b, SCHEDULE_TEXT[locale])}</time><strong>{b.title[locale]}</strong><span>{t.planned}</span>{b.equipment && <small>{b.equipment[locale]}</small>}</li>)}</ul></section>
    </section> : <div className="ops-crew-grid">{data.crew.map(c => <article className="ops-crew-card" key={c.id} data-ops-card={c.id}>
      <CrewPortrait owner={c.id} /><p className="ops-portrait-caption">{t.fictional}</p><h2>{c.name}</h2><PlanSummary person={c} /><button type="button" aria-label={`${t.open} · ${c.name}`} onClick={() => select(c.id)}>{t.open}</button>
    </article>)}</div>}
    <p className="ops-boundary">{data.role === 'medical_professional' ? `${t.medicalEmpty} ${t.medicalLimit}` : t.operationsLimit}</p>
    <p className="ops-muted">{t.resetLimit}</p>
  </div>;
}
