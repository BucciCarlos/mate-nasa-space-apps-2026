import { useEffect, useRef } from 'react';
import { ExerciseChart } from './ExerciseChart';
import { EQUIPMENT, plannedExercise } from './fd30Plan';
import { exerciseSessionView } from './exerciseSession';
import { useLocale, useT } from '../i18n/I18nProvider';
import { EXERCISE_SESSION, EXERCISE_VERSION, elapsedMinutes, exerciseSessions } from './fd30';
import type { CrewId, ExerciseSession, PreviewState } from './fd30';
import '../styles/fd30-exercise.css';

function SessionPanel({ view, highlighted }: { view: ReturnType<typeof exerciseSessionView>; highlighted: boolean }) {
  const t = useT().fd30;
  const locale = useLocale();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (highlighted) { heading.current?.focus(); heading.current?.scrollIntoView({ block: 'center' }); }
  }, [highlighted]);
  const finished = view.phase === 'completed';
  const seconds = view.elapsedSeconds!;
  const elapsed = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const reading = (value: number | null | undefined, unit: string, label: string, metric: string) => <div className="fd-session-reading" data-session-metric={metric}>
    <div className="fd-session-metric-label"><span>{label}</span><span className="fd-session-origin">{t.sessionSimulated}</span></div>
    <strong className={value == null ? 'fd-session-missing' : ''} data-reading-value={value ?? 'missing'}>
      {value == null ? t.sessionNoReading : <>{new Intl.NumberFormat(locale).format(value)}<small>{unit}</small></>}
    </strong>
  </div>;
  return <section className={`fd-session-dashboard${highlighted ? ' fd-session-highlight' : ''}`} data-session-phase={view.phase} data-session-id={view.session!.id} aria-labelledby="fd-exercise-session-h">
    <div className="fd-record-heading"><h2 id="fd-exercise-session-h" ref={heading} tabIndex={-1}>{finished ? t.sessionSummary : t.exerciseInProgress}</h2><span className="fd-tag">{t.sessionSimulated}</span></div>
    <p className="fd-session-disclosure">{t.sessionNotMeasured}</p>
    <div className="fd-session-primary">
      {!finished && reading(view.current?.pulse_bpm, t.sessionPulseUnit, t.sessionPulse, 'pulse')}
      <div className="fd-session-reading"><div className="fd-session-metric-label">{t.sessionElapsed}</div><strong data-session-elapsed>{elapsed}</strong><small>{t.sessionElapsedUnit}</small></div>
      {finished && <div className="fd-session-received"><span>{t.sessionCoverage}</span><strong>{view.points.length}<small>/61</small></strong><p>{t.telemetryCount(view.points.length, view.points.filter(p => p.pulse_bpm !== null && p.workload_w !== null && p.cadence_rpm !== null).length)}</p></div>}
    </div>
    <p className="fd-session-explanation">{t.sessionElapsedHint}</p>
    {finished ? <p>{t.sessionClosed}</p> : <div className="fd-session-secondary">
      {reading(view.current?.workload_w, 'W', t.telemetryPower, 'power')}
      {reading(view.current?.cadence_rpm, 'rpm', t.telemetryCadence, 'cadence')}
    </div>}
    <details className="fd-report-details"><summary>{t.sessionHistoryDetails}</summary><dl>
      <dt>{t.exerciseStart}</dt><dd>{view.session!.start!.occurredAt}</dd>
      <dt>{t.exerciseFinish}</dt><dd>{finished ? view.session!.finish!.occurredAt : t.exerciseMissing}</dd>
      <dt>{t.source}</dt><dd>{view.session!.id} · {EXERCISE_VERSION} · demo-exercise</dd>
    </dl></details>
  </section>;
}

function Session({ session, highlighted, historical }: { session: ExerciseSession; highlighted: boolean; historical: boolean }) {
  const t = useT().fd30;
  const locale = useLocale();
  const heading = useRef<HTMLHeadingElement>(null);
  const minutes = elapsedMinutes(session);
  const events = [session.start, session.finish].filter(e => e !== null);
  useEffect(() => {
    if (highlighted) { heading.current?.focus(); heading.current?.scrollIntoView({ block: 'center' }); }
  }, [highlighted]);
  return (
    <section className={`fd-exercise-session${highlighted ? ' fd-session-highlight' : ''}`} data-session-id={session.id} aria-labelledby={historical ? 'fd-exercise-history-h' : 'fd-exercise-session-h'}>
      <div className="fd-record-heading"><h2 ref={heading} id={historical ? 'fd-exercise-history-h' : 'fd-exercise-session-h'} tabIndex={-1}>{historical ? t.exerciseHistory : session.finish ? t.exerciseCompleted : t.exerciseInProgress}</h2><span className="fd-tag">{t.simulated}</span>{highlighted && <span className="fd-tag">{t.exerciseHighlight}</span>}</div>
      {historical && <p>{t.exerciseHistoryBody}</p>}
      <dl className="fd-session-times"><dt>{t.exerciseStart}</dt><dd>{session.start ? <time dateTime={session.start.occurredAt}>{session.start.occurredAt}</time> : t.exerciseMissing}</dd><dt>{t.exerciseFinish}</dt><dd>{session.finish ? <time dateTime={session.finish.occurredAt}>{session.finish.occurredAt}</time> : t.exerciseMissing}</dd></dl>
      {!historical && (minutes !== null ? <div className="fd-session-duration"><p className="fd-eyebrow">{t.exerciseElapsed}</p><strong>{new Intl.NumberFormat(locale).format(minutes)} <small>{/* i18n-ignore — SI time unit */}min</small></strong><p>{t.exerciseCalculation}</p></div> : <p>{session.finish && !session.start ? t.exerciseIncomplete : t.exercisePendingDuration}</p>)}
      <h3>{t.exerciseMetrics}</h3><p>{t.exerciseMetricsLimit}</p>
      <details className="fd-report-details"><summary>{t.details}</summary><dl>
        <dt>{t.instrument}</dt><dd>{historical ? t.historySource : t.exerciseAdapter}</dd>
        <dt>{t.variable}</dt><dd>{t.exerciseVariable}</dd>
        <dt>{t.nature}</dt><dd>{historical ? t.exerciseHistoryNature : t.exerciseNature}</dd>
        <dt>{t.availability}</dt><dd>{t.exerciseAvailability}</dd>
        <dt>{t.attribution}</dt><dd>{t.attributionValue}</dd>
        <dt>{t.source}</dt><dd>{session.id}{events.map(event => <div key={event.id}>{event.sourceId} · {event.id}</div>)}</dd>
        <dt>{t.timing}</dt><dd>{events.map(event => <div key={event.id}>{event.occurredAt} / {event.receivedAt}</div>)}</dd>
        <dt>{t.version}</dt><dd>{EXERCISE_VERSION}</dd>
      </dl></details>
    </section>
  );
}

export function ExerciseDetail({ state, owner, time, asTable, onToggle, highlight }: { state: PreviewState; owner: CrewId; time: number; asTable: boolean; onToggle: () => void; highlight: boolean }) {
  const t = useT().fd30;
  const locale = useLocale();
  const plan = plannedExercise(owner);
  const view = exerciseSessionView(state, owner, time);
  const sessions = exerciseSessions(state, owner);
  const history = sessions.filter(s => s.id !== EXERCISE_SESSION);
  const reservation = plan && <section className="fd-rest-plan"><p className="fd-eyebrow">{t.planLane}</p><h2>{t.exercisePlanned}</h2><strong className="fd-large-time">{plan.start.slice(11, 16)}–{plan.end.slice(11, 16)}</strong><p>{EQUIPMENT[plan.equipmentId!][locale]} · {t.equipmentUnverified}</p><p>{t.exercisePlanLimit}</p><small>{plan.id} · demo-plan</small></section>;
  return <div className="fd-exercise-detail">
    <div className="fd-page-intro"><p className="fd-eyebrow">{t.personal} / {t.exercise}</p><h1 id="fd-view-h" tabIndex={-1}>{t.exerciseTitle}</h1><p>{t.exerciseIntro}</p></div>
    {view.phase === 'planned' ? <>{reservation}<p className="fd-session-explanation">{view.session?.finish ? t.exerciseIncomplete : t.exerciseWaiting}</p></> : <SessionPanel view={view} highlighted={highlight && state.profiles[owner].highlightedSessionId === view.session!.id} />}
    <ExerciseChart owner={owner} time={time} points={view.points} asTable={asTable} onToggle={onToggle} />
    {view.phase !== 'planned' && <details className="fd-session-reservation"><summary>{t.exercisePlanned}</summary>{reservation}</details>}
    <section className="fd-history"><p className="fd-eyebrow">{t.history}</p>{history.length ? history.map(session => <Session key={`${owner}:${session.id}`} session={session} historical highlighted={false} />) : <p>{t.exerciseEmpty}</p>}</section>
  </div>;
}
