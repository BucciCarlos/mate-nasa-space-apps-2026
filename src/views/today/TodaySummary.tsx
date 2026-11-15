import type { MouseEvent, ReactNode } from 'react';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { fmtClock, fmtDate } from '../../i18n/format';
import { CREW } from '../../demo/fd30';
import type { CrewId, PreviewState } from '../../demo/fd30';
import { EQUIPMENT, plannedExercise } from '../../demo/fd30Plan';
import { exerciseSessionView } from '../../demo/exerciseSession';
import { exerciseHistory } from '../../demo/history/exercise';
import { fdDate, fdLabel, sleepDuration, sleepHistory } from '../../demo/history/sleep';
import { labEvents, labPlanSlots, labSamples, labStatus } from '../../demo/laboratory';
import type { LabSample } from '../../demo/laboratory';
import { ownCheckins } from '../fd30-ops/opsState';
import type { OpsState } from '../fd30-ops/opsState';
import { OPS_TEXT } from '../fd30-ops/opsText';
import { SLEEP_TEXT } from '../history/sleep/sleepText';
import { EXERCISE_TEXT } from '../history/exercise/exerciseText';
import { toHash } from '../../app/routes';
import { TODAY_TEXT as TODAY } from './todayText';
import { meanOfReadings, sessionPowerDifference, sleepDelta } from './todayMetrics';
import './today.css';

interface Props {
  state: PreviewState; owner: CrewId; time: number; ops: OpsState;
  onOpenSleep: () => void; onOpenExercise: () => void; onOpenLaboratory: (sampleId?: string, eventId?: string) => void;
}
type Slot = { key: string; fd: number; value: number | null; mark: 'bar' | 'gap' | 'pending'; label: string; shown: string; current: boolean };

/** Seven day columns across the card width. A day without data is a hollow marker, never a zero-height bar. */
function Week({ slots, max }: { slots: Slot[]; max: number }) {
  return <div className="td-week" aria-hidden="true">
    {slots.map(s => <div key={s.key} className={`td-col${s.current ? ' td-col-now' : ''}`} data-slot={s.key} data-gap={s.mark === 'bar' ? undefined : 'true'}>
      <span className="td-colval">{s.current ? s.shown : ''}</span>
      <span className="td-track">{s.mark === 'bar' && s.value !== null
        ? <i className="td-bar" style={{ height: `${Math.max(6, Math.min(100, (s.value / max) * 100))}%` }} />
        : s.mark === 'pending' ? <i className="td-pending" /> : <i className="td-gap" />}</span>
      <span className="td-collabel">{String(s.fd)}</span>
    </div>)}
  </div>;
}

function Card({ id, className, href, onOpen, children, labelledby }: { id: string; className: string; href: string; onOpen?: (e: MouseEvent) => void; children: ReactNode; labelledby: string }) {
  // The whole card is one link: no buttons or links are nested inside it.
  return <a id={id} className={`td-card ${className}`} href={href} onClick={onOpen} aria-labelledby={labelledby}>{children}</a>;
}
const Chevron = () => <svg className="td-chevron" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
/** Status icons: shape carries the state, no colour judgement. */
function StatusIcon({ kind }: { kind: 'planned' | 'collection' | 'analysis' | 'result' | 'note' | 'empty' }) {
  const d = { planned: <><circle cx="12" cy="12" r="8.5" {...stroke} /><path d="M12 7.5V12l3 2" {...stroke} /></>,
    collection: <path d="M12 3.5c3 4 5.5 6.8 5.5 10a5.5 5.5 0 0 1-11 0c0-3.2 2.5-6 5.5-10z" {...stroke} />,
    analysis: <path d="M7 3.5h10M7 20.5h10M8 3.5v3.2l4 4.3 4-4.3V3.5M8 20.5v-3.2l4-4.3 4 4.3v3.2" {...stroke} />,
    result: <><circle cx="12" cy="12" r="8.5" {...stroke} /><path d="M8 12.3l2.8 2.8L16.2 9.5" {...stroke} /></>,
    note: <><path d="M5 5.5h14v10H11l-4 3.5v-3.5H5z" {...stroke} /><path d="M8.5 9.5h7M8.5 12.5h4" {...stroke} /></>,
    empty: <><circle cx="12" cy="12" r="8.5" {...stroke} strokeDasharray="3 3" /></> }[kind];
  return <span className="td-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" focusable="false">{d}</svg></span>;
}

export function TodaySummary({ state, owner, time, ops, onOpenSleep, onOpenExercise, onOpenLaboratory }: Props) {
  const locale = useLocale(), t = TODAY[locale], ft = useT().fd30, st = SLEEP_TEXT[locale], xt = EXERCISE_TEXT[locale], ot = OPS_TEXT[locale];
  const crew = CREW.find(c => c.id === owner)!;
  const nf = new Intl.NumberFormat(locale);
  const go = (open: () => void) => (e: MouseEvent) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; e.preventDefault(); open(); };
  const day = (fd: number) => fmtDate(Date.parse(fdDate(fd)), locale);

  // Sleep: latest available night + last 7 nights. Gaps stay gaps.
  const sleep = sleepHistory(state, { perspective: 'onboard', owner }, time, 'last7');
  const sleepToday = sleep?.days.at(-1);
  // Compare with the night right before the one shown (FD29 vs FD28 while FD30 has not arrived). Full range, so the lookup never depends on the 7-day window.
  const delta = sleepDelta(sleepHistory(state, { perspective: 'onboard', owner }, time, 'all')?.records ?? [], sleep?.latest ?? null);
  const sleepSlots: Slot[] = sleep ? sleep.days.map(d => ({ key: `fd${d.fd}`, fd: d.fd, value: d.record?.durationMinutes ?? null, current: d.fd === sleep.latest?.fd,
    mark: d.record ? 'bar' : d.status === 'not_received' ? 'pending' : 'gap', shown: d.record ? sleepDuration(d.record.durationMinutes) : '',
    label: `${fdLabel(d.fd)} · ${d.record ? `${sleepDuration(d.record.durationMinutes)} ${t.hoursUnit}` : d.status === 'not_received' ? t.notReceivedDay : t.noRecordDay}` })) : [];

  // Exercise: live / completed / planned, from the same selectors as the module.
  const live = exerciseSessionView(state, owner, time);
  const history = exerciseHistory(state, { perspective: 'onboard', owner }, time, 'last7');
  const plan = plannedExercise(owner);
  const completed = live.phase === 'completed' ? history?.records.find(r => r.id === live.session!.id) ?? null : null;
  const lastWorkout = live.phase === 'planned' ? history?.latest ?? null : null;
  const shownSession = completed ?? lastWorkout;
  const shownFd = live.phase === 'live' ? 30 : shownSession?.fd ?? null;
  const exSlots: Slot[] = history ? history.days.map(d => {
    const total = d.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    return { key: `fd${d.fd}`, fd: d.fd, value: total || null, current: d.fd === shownFd, mark: d.sessions.length ? 'bar' : d.status === 'live' ? 'pending' : 'gap',
      shown: total ? `${nf.format(Math.round(total))} ${t.minutes}` : '',
      label: `${fdLabel(d.fd)} · ${d.sessions.length ? `${nf.format(Math.round(d.sessions[0].durationMinutes))} ${t.minutes}` : t.noActivityDay}` };
  }) : [];
  const elapsed = live.elapsedSeconds === null ? '' : `${String(Math.floor(live.elapsedSeconds / 60)).padStart(2, '0')}:${String(live.elapsedSeconds % 60).padStart(2, '0')}`;
  const pulse = live.phase === 'live' ? live.current?.pulse_bpm ?? null : null;
  // Heart rate: available readings of the displayed session only (minute intervals, as the history means). Gaps are skipped.
  const sessionEnd = live.session?.finish ? Date.parse(live.session.finish.occurredAt) : null;
  const meanPulse = live.phase === 'completed' && sessionEnd !== null ? meanOfReadings(live.points.filter(p => Date.parse(p.occurredAt) < sessionEnd).map(p => p.pulse_bpm)) : null;
  const powerDiff = history && shownSession ? sessionPowerDifference(history.comparisons, shownSession.id) : null;
  const exerciseState = live.phase === 'live' ? ft.exerciseInProgress : live.phase === 'completed' ? ft.exerciseCompleted : ft.exercisePlanned;
  const sameLatest = !!completed && history?.latest?.id === completed.id; // already summarised above: keep the sentence for assistive technology only

  // Laboratory: latest sample of each type visible at this cursor.
  const samples = labSamples(state, owner).filter(s => labEvents(s).length);
  const lastEvent = (s: LabSample) => labEvents(s).at(-1)!;
  const order = (a: LabSample, b: LabSample) => Date.parse(lastEvent(a).receivedAt) - Date.parse(lastEvent(b).receivedAt) || lastEvent(a).scenarioSequence - lastEvent(b).scenarioSequence;
  const byType = (['blood', 'urine'] as const).flatMap(type => { const found = samples.filter(s => s.sampleType === type).sort(order).at(-1); return found ? [found] : []; });
  const labStatusText = { planned: ft.labPlan, collection: ft.labTaken, analysis: ft.labAnalyzing, result: ft.labResult };
  const newestSample = [...byType].sort(order).at(-1);
  // A profile with no received sample yet but its own planned collection (Tomás, Mei before the event): show the PLAN as a plan, never as a state.
  const plannedOnly = byType.length ? [] : labPlanSlots(owner);

  // Wellbeing: only the active owner's own check-ins already entered at this cursor. Text is never shown here.
  const checkin = ownCheckins(ops, owner, time).at(-1) ?? null;

  const clock = fmtClock(time);
  return <div className="td" data-today-owner={owner}>
    <header className="td-head">
      <p className="fd-eyebrow">{t.header}</p>
      <h1 id="fd-view-h" tabIndex={-1}>{crew.name}</h1>
      <p className="td-meta"><span>{ft.mission}</span><span aria-hidden="true">·</span><time dateTime={new Date(time).toISOString()}>{clock} <small>{t.clock}</small></time></p>
    </header>

    <div className="td-primary">
      <Card id="td-sleep" className="td-sleep" href={toHash({ view: 'fd30', page: 'sleep' })} onOpen={go(onOpenSleep)} labelledby="td-sleep-t td-sleep-d td-sleep-v">
        <span className="td-head-row"><span className="td-title" id="td-sleep-t">{t.sleep}</span><Chevron /></span>
        {sleep?.latest ? <>
          <span className="td-date" id="td-sleep-d"><b>{day(sleep.latest.fd)}</b><span className="td-chip">{fdLabel(sleep.latest.fd)}</span>{sleepToday && !sleepToday.record && <span className="td-chip td-chip-open">{t.sleepMissing}</span>}</span>
          <span className="td-figrow">
            <strong className="td-value" id="td-sleep-v" data-sleep-latest-fd={sleep.latest.fd}>{sleepDuration(sleep.latest.durationMinutes)}<small>{t.hoursUnit}</small></strong>
            {delta && <span className="td-delta" data-sleep-delta={delta.minutes}><span aria-hidden="true">{delta.minutes > 0 ? '↑' : delta.minutes < 0 ? '↓' : '→'}</span><b>{delta.minutes > 0 ? '+' : delta.minutes < 0 ? '−' : ''}{nf.format(Math.abs(delta.minutes))} {t.minutes}</b><i>{t.vsNight(fdLabel(delta.previousFd))}</i></span>}
          </span>
          <span className="sr-only" data-sleep-latest>{st.latest(fdLabel(sleep.latest.fd), sleepDuration(sleep.latest.durationMinutes))}</span>
        </> : <>
          <span className="td-date" id="td-sleep-d">{sleepToday && !sleepToday.record && <span className="td-chip td-chip-open">{t.sleepMissing}</span>}</span>
          <strong className="td-value td-empty" id="td-sleep-v">{t.sleepNone}</strong>
        </>}
        {!!sleepSlots.length && <><Week slots={sleepSlots} max={Math.max(540, ...sleepSlots.map(s => s.value ?? 0))} />
          <span className="td-caption">{t.last7} · {st.coverage(sleep!.records.length, sleep!.days.length)}</span>
          <ul className="sr-only">{sleepSlots.map(s => <li key={s.key}>{s.label}</li>)}</ul></>}
      </Card>

      <Card id="td-exercise" className="td-exercise" href={toHash({ view: 'fd30', page: 'exercise' })} onOpen={go(onOpenExercise)} labelledby="td-ex-t td-ex-s td-ex-v">
        <span className="td-head-row"><span className="td-title" id="td-ex-t">{t.exercise}</span><span className="td-pill" id="td-ex-s" data-exercise-phase={live.phase}>{exerciseState}</span><Chevron /></span>
        {live.phase === 'live' ? <span className="td-figrow td-figs" id="td-ex-v">
          <span className="td-fig"><strong className="td-value" data-today-elapsed>{elapsed}<small>{ft.sessionElapsedUnit}</small></strong><span className="td-figlabel">{ft.sessionElapsed}</span></span>
          <span className="td-fig"><strong className={`td-value${pulse === null ? ' td-empty' : ''}`} data-today-pulse={pulse ?? 'missing'}>{pulse !== null ? <>{nf.format(pulse)}<small>{ft.sessionPulseUnit}</small></> : '—'}</strong><span className="td-figlabel">{pulse !== null ? t.pulseNow : ft.sessionNoReading}</span></span>
        </span> :
          completed ? <span className="td-figrow td-figs" id="td-ex-v">
          <span className="td-fig"><strong className="td-value">{nf.format(Math.round(completed.durationMinutes))}<small>{t.minutes}</small></strong><span className="td-figlabel">{t.recordedDuration}<br /><span className="td-sub">{fdLabel(completed.fd)}</span></span></span>
          {meanPulse && <span className="td-fig" data-today-mean-pulse={Math.round(meanPulse.mean)}><strong className="td-value">{nf.format(Math.round(meanPulse.mean))}<small>{ft.sessionPulseUnit}</small></strong><span className="td-figlabel">{t.meanPulse}<br /><span className="td-sub">{t.readings(meanPulse.count)}</span></span></span>}
        </span> : <span className="td-figrow" id="td-ex-v">
          <strong className="td-value td-small">{plan ? `${plan.start.slice(11, 16)}–${plan.end.slice(11, 16)}` : exerciseState}<small>{plan ? 'UTC' : ''}</small></strong>
          <span className="td-note">{plan && Date.parse(plan.start) <= time ? t.todayReservation : t.nextReservation}{plan?.equipmentId ? ` · ${EQUIPMENT[plan.equipmentId][locale]}` : ''}<br /><span className="td-sub">{t.reservationNote}</span></span>
        </span>}
        {!!history?.records.length && <Week slots={exSlots} max={Math.max(60, ...exSlots.map(s => s.value ?? 0))} />}
        {!!history?.records.length && <span className="td-caption">{t.recentSessions} · {t.last7}</span>}
        {powerDiff && <span className="td-sub td-power" data-exercise-difference={powerDiff.differenceW}><b>{t.powerReference}</b> · {xt.difference(nf.format(Math.round(powerDiff.differenceW * 10) / 10), powerDiff.differencePercent === null ? '—' : nf.format(Math.round(powerDiff.differencePercent * 10) / 10))}</span>}
        {history?.latest && (sameLatest
          ? <span className="sr-only" data-exercise-latest>{xt.latest(fdLabel(history.latest.fd), nf.format(history.latest.durationMinutes))}</span>
          : <span className="td-last"><span data-exercise-latest>{xt.latest(fdLabel(history.latest.fd), nf.format(history.latest.durationMinutes))}</span></span>)}
        {live.phase === 'planned' && !history?.latest && <span className="td-last">{t.noWorkout}</span>}
        <ul className="sr-only">{exSlots.map(s => <li key={s.key}>{s.label}</li>)}</ul>
      </Card>
    </div>

    <div className="td-secondary">
      <Card id="td-lab" className="td-lab" href={toHash({ view: 'fd30', page: 'laboratory' })} labelledby="td-lab-t td-lab-v"
        onOpen={go(() => newestSample ? onOpenLaboratory(newestSample.id, lastEvent(newestSample).id) : onOpenLaboratory())}>
        <span className="td-head-row"><span className="td-title" id="td-lab-t">{t.laboratory}</span><Chevron /></span>
        <span className="td-rows" id="td-lab-v">{byType.length ? byType.map(s => <span className="td-row" key={s.id} data-lab-sample={s.id}>
          <StatusIcon kind={labStatus(s)} />
          <span className="td-rowtext"><b>{labStatusText[labStatus(s)]}</b><span>{s.sampleType === 'blood' ? ft.labBlood : ft.labUrine} · {fmtDate(Date.parse(lastEvent(s).receivedAt), locale)} {fmtClock(Date.parse(lastEvent(s).receivedAt))} {t.sampleTime}</span></span></span>)
          : plannedOnly.length ? plannedOnly.map(slot => <span className="td-row" key={slot.id} data-lab-planned={slot.sampleId}><StatusIcon kind="planned" />
              <span className="td-rowtext"><b>{ft.labPlan}</b><span>{slot.sampleType === 'blood' ? ft.labBlood : ft.labUrine} · {fmtClock(Date.parse(slot.start))} {t.sampleTime}</span></span></span>)
          : <span className="td-row"><StatusIcon kind="empty" /><span className="td-rowtext"><b>{t.noSamples}</b></span></span>}</span>
      </Card>
      <Card id="td-wellbeing" className="td-wellbeing" href="#/onboard/personal/wellbeing" labelledby="td-wb-t td-wb-v">
        <span className="td-head-row"><span className="td-title" id="td-wb-t">{t.wellbeing}</span><Chevron /></span>
        <span className="td-rows" id="td-wb-v"><span className="td-row" data-checkin-id={checkin?.id}>
          <StatusIcon kind={checkin ? 'result' : 'note'} />
          {checkin
            ? <span className="td-rowtext"><b>{t.lastCheckin}</b><span>{checkin.topic === 'day' ? ot.day : ot.leisure} · {fmtDate(checkin.at, locale)} {fmtClock(checkin.at)} {t.sampleTime} · {t.private}</span></span>
            : <span className="td-rowtext"><b>{t.writeCheckin}</b><span>{t.noCheckin} · {t.private}</span></span>}
        </span></span>
      </Card>
    </div>
  </div>;
}
