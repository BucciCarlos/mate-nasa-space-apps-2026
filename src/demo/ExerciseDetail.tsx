import { useEffect, useRef } from 'react';
import { ExerciseChart } from './ExerciseChart';
import { EQUIPMENT, plannedExercise } from './fd30Plan';
import { exerciseSessionView } from './exerciseSession';
import { useLocale, useT } from '../i18n/I18nProvider';
import { EXERCISE_VERSION } from './fd30';
import { ExerciseHistory } from '../views/history/exercise/ExerciseHistory';
import type { ExerciseTarget } from '../views/history/exercise/ExerciseHistory';
import type { CrewId, PreviewState } from './fd30';
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
    <div className="fd-session-metric-label"><span>{label}</span></div>
    <strong className={value == null ? 'fd-session-missing' : ''} data-reading-value={value ?? 'missing'}>
      {value == null ? t.sessionNoReading : <>{new Intl.NumberFormat(locale).format(value)}<small>{unit}</small></>}
    </strong>
  </div>;
  return <section className={`fd-session-dashboard${highlighted ? ' fd-session-highlight' : ''}`} data-session-phase={view.phase} data-session-id={view.session!.id} aria-labelledby="fd-exercise-session-h">
    <div className="fd-record-heading"><h2 id="fd-exercise-session-h" ref={heading} tabIndex={-1}>{finished ? t.sessionSummary : t.exerciseInProgress}</h2></div>
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

export function ExerciseDetail({ state, owner, time, asTable, onToggle, highlight, target = null }: { state: PreviewState; owner: CrewId; time: number; asTable: boolean; onToggle: () => void; highlight: boolean; target?: ExerciseTarget | null }) {
  const t = useT().fd30;
  const locale = useLocale();
  const plan = plannedExercise(owner);
  const view = exerciseSessionView(state, owner, time);
  const reservation = plan && <section className="fd-rest-plan"><p className="fd-eyebrow">{t.planLane}</p><h2>{t.exercisePlanned}</h2><strong className="fd-large-time">{plan.start.slice(11, 16)}–{plan.end.slice(11, 16)}</strong><p>{EQUIPMENT[plan.equipmentId!][locale]} · {t.equipmentUnverified}</p><p>{t.exercisePlanLimit}</p><small>{plan.id} · demo-plan</small></section>;
  return <div className="fd-exercise-detail">
    <div className="fd-page-intro"><p className="fd-eyebrow">{t.personal} / {t.exercise}</p><h1 id="fd-view-h" tabIndex={-1}>{t.exerciseTitle}</h1><p>{t.exerciseIntro}</p></div>
    {view.phase === 'planned' ? <>{reservation}<p className="fd-session-explanation">{view.session?.finish ? t.exerciseIncomplete : t.exerciseWaiting}</p></> : view.phase === 'live' ? <SessionPanel view={view} highlighted={highlight && state.profiles[owner].highlightedSessionId === view.session!.id} /> : null}
    <ExerciseChart owner={owner} time={time} points={view.points} asTable={asTable} onToggle={onToggle} />
    {view.phase !== 'planned' && <details className="fd-session-reservation"><summary>{t.exercisePlanned}</summary>{reservation}</details>}
    <ExerciseHistory state={state} owner={owner} time={time} highlight={highlight} target={target} />
  </div>;
}
