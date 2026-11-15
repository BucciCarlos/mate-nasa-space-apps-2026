import { useRef, useState } from 'react';
import type { ScheduleBlock } from '../state/types';
import { useLocale, useT } from '../i18n/I18nProvider';
import { GroundTimeline } from '../views/ground/GroundTimeline';
import { GroundCards } from '../views/ground/GroundCards';
import { groundAgendaText } from '../views/ground/groundAgendaText';
import { operationalPlan } from '../views/fd30-ops/opsSelectors';
import { CREW } from './fd30';
import { PLAN_SOURCE, PLAN_VERSION } from './fd30Plan';
import { SCHEDULE_END, SCHEDULE_START, scheduleInterval, scheduleClock, scheduleContinuation } from './fd30Schedule';
import { SCHEDULE_TEXT } from '../i18n/fd30Schedule';
import { FD30_PUBLIC_TEXT } from './fd30PublicText';
import '../styles/ground-agenda.css';
import '../styles/fd30-public.css';

/** Operational whitelist, already used by the Ground cards. No private events or M1 state are read. */
export function groundAgendaLanes() {
  return CREW.map(c => ({
    crew: { id: c.id, name: c.name, missionId: 'iss' as const, roleTitle: {
      en: c.id === 'iss:crew-ti' ? FD30_PUBLIC_TEXT.en.commander : FD30_PUBLIC_TEXT.en.crew,
      es: c.id === 'iss:crew-ti' ? FD30_PUBLIC_TEXT.es.commander : FD30_PUBLIC_TEXT.es.crew,
    } },
    blocks: operationalPlan(c.id).map(b => ({ ...b, missionId: 'iss' as const, crewIds: [c.id], movable: false })),
  }));
}

export function Fd30GroundAgenda({ time }: { time: number }) {
  const locale = useLocale(), messages = useT(), t = FD30_PUBLIC_TEXT[locale];
  const g = { ...groundAgendaText[locale], scrollHint: t.scrollHint };
  const [view, setView] = useState<'timeline' | 'cards'>('timeline');
  const [selected, setSelected] = useState<string | null>(null);
  const scrollRef = useRef<number | null>(null);
  const lanes = groundAgendaLanes();
  // Clip presentation only. Canonical IDs/source times remain in the shared plan and selected detail.
  const shownLanes = lanes.map(l => ({ ...l, blocks: l.blocks.map(b => ({ ...b,
    start: new Date(Math.max(SCHEDULE_START, Date.parse(b.start))).toISOString(),
    end: new Date(Math.min(SCHEDULE_END, Date.parse(b.end))).toISOString(),
    title: { en: `${b.title.en} ${scheduleContinuation(b, SCHEDULE_TEXT.en)}`, es: `${b.title.es} ${scheduleContinuation(b, SCHEDULE_TEXT.es)}` },
  })) }));
  const range = { start: new Date(SCHEDULE_START).toISOString(), end: new Date(SCHEDULE_END).toISOString() };
  const block = lanes.flatMap(l => l.blocks).find(b => b.id === selected);
  const onSelect = (b: ScheduleBlock) => setSelected(b.id);
  return <section className="fd-ground-agenda" aria-labelledby="fd-view-h">
    <div className="fd-page-intro"><h1 id="fd-view-h" tabIndex={-1}>{t.title}</h1><p>{t.intro}</p></div>
    <p className="fd-ground-plan-note">{t.planning}</p>
    <div className="ga-views" role="group" aria-label={g.views}>
      <button type="button" className="btn btn-ghost btn-sm" aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}>{g.viewTimeline}</button>
      <button type="button" className="btn btn-ghost btn-sm" aria-pressed={view === 'cards'} onClick={() => setView('cards')}>{g.viewCards}</button>
      <span>{messages.common.utc}</span>
    </div>
    {view === 'timeline'
      ? <GroundTimeline includeStart closingLabel="24:00" intervalLabel={scheduleInterval} clockLabel={scheduleClock} range={range} lanes={shownLanes} nowMs={time} selectedId={selected} onSelect={onSelect} scrollRef={scrollRef} text={g} />
      : <GroundCards showDuration={false} intervalLabel={scheduleInterval} range={range} lanes={shownLanes} selectedId={selected} onSelect={onSelect} text={g} selectAll={{ label: t.details, ariaLabel: t.inspect }} />}
    <section className="fd-ground-plan-detail" aria-label={t.details}>
      <h2>{block?.title[locale] ?? t.details}</h2>
      {block ? <><p>{messages.blocks[block.kind]} · {scheduleInterval(block)} {scheduleContinuation(block, SCHEDULE_TEXT[locale])}</p><p>{t.affected}: {lanes.filter(l => l.blocks.some(b => b.id === block.id)).map(l => l.crew.name).join(', ')}</p>
        {block.equipment && <p>{t.equipment}: {block.equipment[locale]}</p>}<strong>{t.planned}</strong></> : <p>{t.select}</p>}
    </section>
    <p className="fd-ground-plan-note">{SCHEDULE_TEXT[locale].simulatedPlan} · {PLAN_SOURCE} · {PLAN_VERSION}</p>
  </section>;
}
