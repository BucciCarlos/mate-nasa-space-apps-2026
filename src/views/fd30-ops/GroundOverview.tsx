import { useEffect, useRef, useState } from 'react';
import { scheduleClock, scheduleInterval, scheduleContinuation } from '../../demo/fd30Day';
import { PLAN_SOURCE, PLAN_VERSION } from '../../demo/fd30Plan';
import { SCHEDULE_TEXT } from '../../i18n/fd30Schedule';
import { useLocale } from '../../i18n/I18nProvider';
import type { CrewId } from '../../demo/fd30';
import type { GroundRole } from '../../state/types';
import type { OperationalBlock, groundView } from './opsSelectors';
import { OPS_TEXT } from './opsText';
import { GROUND_TRACKING_TEXT } from './groundTrackingText';
import { GroundPlanTimeline } from './GroundPlanTimeline';
import { GroundOrbit } from './GroundOrbit';
import { GroundHeadline, GroundResources } from './GroundOpsPanels';
import { CrewPortrait } from './CrewPortrait';
import { GroundMedicalDashboard } from './GroundMedicalDashboard';
import type { GroundMedicalPerson } from './groundMedical';
import './ops.css';
import './groundTracking.css';

export function GroundOverview({ data, time, onRole, medical = null }: { data: ReturnType<typeof groundView>; time: number; onRole: (role: GroundRole) => void; medical?: GroundMedicalPerson[] | null }) {
  const locale = useLocale(), t = GROUND_TRACKING_TEXT[locale], o = OPS_TEXT[locale];
  const [selected, select] = useState<CrewId | null>(null);
  const [orbitOpen, setOrbitOpen] = useState(false);
  const [reference, setReference] = useState<OperationalBlock | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const referenceHeading = useRef<HTMLHeadingElement>(null);
  const crewButton = useRef<HTMLButtonElement>(null);
  const orbitButton = useRef<HTMLButtonElement>(null);
  const pendingCrewFocus = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected) detailHeading.current?.focus({ preventScroll: true });
    else if (pendingCrewFocus.current) { crewButton.current?.focus({ preventScroll: true }); pendingCrewFocus.current = false; }
    root.current?.closest('.fd-main')?.scrollTo({ top: 0 });
  }, [selected, data?.role]);
  const choose = (id: CrewId | null) => { pendingCrewFocus.current = id === null; select(id); setReference(null); };
  const inspect = (block: OperationalBlock) => { setReference(block); };
  useEffect(() => { if (reference) referenceHeading.current?.focus(); }, [reference]);
  const closeOrbit = () => { setOrbitOpen(false); orbitButton.current?.focus(); };
  if (!data) return null;
  const person = data.crew.find(c => c.id === selected), shown = person ? [person] : data.crew;
  const medicalPerson = data.role === 'medical_professional' && person ? medical?.find(p => p.id === person.id) : null;
  const interval = (block: OperationalBlock) => `${scheduleInterval(block)} ${scheduleContinuation(block, SCHEDULE_TEXT[locale])}`.trim();
  return <div className="ops ops-ground gnd" ref={root} data-ops-ground-role={data.role} data-person={person?.id}>
    <header className="gnd-heading">
      <div><p className="fd-eyebrow">{o.ground}</p><h1 id="fd-view-h" tabIndex={-1}>{t.title}</h1><p>{t.intro}</p></div>
      <div className="gnd-controls"><label className="ops-role">{o.role}<select value={data.role} onChange={e => onRole(e.target.value as GroundRole)}><option value="mission_operator">{o.operator}</option><option value="medical_professional">{o.medical}</option></select></label>
        <button type="button" ref={orbitButton} aria-expanded={orbitOpen} aria-controls="gnd-orbit" onClick={() => orbitOpen ? closeOrbit() : setOrbitOpen(true)}>{t.openOrbit}</button>
      </div>
    </header>
    <div className={`gnd-layout${orbitOpen ? ' has-orbit' : ''}`}>
      <div className="gnd-content">
        {person ? <section className="gnd-person" data-ops-detail={person.id}>
          <button type="button" className="gnd-back" onClick={() => choose(null)}>← {t.back}</button>
          <div className="gnd-person-heading"><h2 ref={detailHeading} tabIndex={-1}>{person.name}</h2><span>{t.simulation}</span></div>
        </section> : <div className="ops-crew-grid gnd-crew-cards" aria-label={t.crew}>
          {data.crew.map((c, index) => <article key={c.id} data-ops-card={c.id}>
            <button type="button" className="gnd-crew-card" ref={index === 0 ? crewButton : undefined} aria-label={`${t.open} · ${c.name}`} onClick={() => choose(c.id)}>
              <CrewPortrait owner={c.id} /><span className="gnd-crew-name">{c.name}</span><span className="gnd-card-caption">{o.fictional}</span>
              <GroundHeadline person={c} time={time} />
              <span className="gnd-card-action">{t.open} →</span>
            </button>
          </article>)}
        </div>}
        {medicalPerson && <GroundMedicalDashboard data={medicalPerson} />}
        {person && <section className="gnd-person-summary" data-operational-summary aria-label={t.agenda}>
          <GroundHeadline person={person} time={time} />
        </section>}
        {!person && <GroundResources crew={data.crew} time={time} onInspect={inspect} />}
        <GroundPlanTimeline crew={shown} time={time} selectedId={reference?.id ?? null} onSelect={inspect} />
        <section className="gnd-block-detail" aria-label={t.block}>
          <h3 ref={referenceHeading} tabIndex={-1}>{reference?.title[locale] ?? t.block}</h3>
          {reference ? <><p><time>{interval(reference)}</time><span className="gnd-tag">{t.planned}</span></p><code>{reference.id}</code></> : <p>{t.selectBlock}</p>}
        </section>
        {person && <section className="gnd-agenda" aria-label={t.agenda}><h2>{t.agenda}</h2><ul>{person.blocks.map(block => <li key={block.id}>
          <time>{interval(block)}</time><button type="button" onClick={() => inspect(block)}>{block.title[locale]}</button>{block.equipment && <span>{block.equipment[locale]}</span>}
        </li>)}</ul></section>}
        <p className="gnd-provenance">{t.source} · {PLAN_SOURCE} · {PLAN_VERSION}<span>{o.now} · {scheduleClock(time)} {t.axis}</span></p>
      </div>
      {orbitOpen && <GroundOrbit crew={data.crew} selected={selected} role={data.role} time={time} onClose={closeOrbit} onReference={inspect} />}
    </div>
  </div>;
}
