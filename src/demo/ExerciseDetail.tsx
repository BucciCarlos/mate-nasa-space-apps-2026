import { useEffect, useRef } from 'react';
import { useLocale, useT } from '../i18n/I18nProvider';
import { EXERCISE_SESSION, EXERCISE_VERSION, OWNER, elapsedMinutes, exerciseSessions } from './fd30';
import type { CrewId, ExerciseSession, PreviewState } from './fd30';

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

export function ExerciseDetail({ state, owner }: { state: PreviewState; owner: CrewId }) {
  const t = useT().fd30;
  const sessions = exerciseSessions(state, owner);
  const current = sessions.find(s => s.id === EXERCISE_SESSION);
  const history = sessions.filter(s => s.id !== EXERCISE_SESSION);
  return <>
    <div className="fd-page-intro"><p className="fd-eyebrow">{t.personal} / {t.exercise}</p><h1 id="fd-view-h" tabIndex={-1}>{t.exerciseTitle}</h1><p>{t.exerciseIntro}</p></div>
    {owner === OWNER && <section className="fd-rest-plan"><p className="fd-eyebrow">{t.planLane}</p><h2>{t.exercisePlanned}</h2><strong className="fd-large-time">{t.exercisePlan}</strong><p>{t.exercisePlanLimit}</p><small>{EXERCISE_VERSION} · demo-plan · iss:fd30:lf:planned-exercise</small></section>}
    {current ? <Session key={`${owner}:${current.id}`} session={current} historical={false} highlighted={state.profiles[owner].highlightedSessionId === current.id} /> : <section className="fd-record"><h2>{owner === OWNER ? t.exerciseWaiting : t.exerciseEmpty}</h2><p className="fd-no-record">{t.noRecord}</p><p>{t.exerciseMetrics}</p>{owner === OWNER && <p>{t.exercisePendingDuration}</p>}</section>}
    <section className="fd-history"><p className="fd-eyebrow">{t.history}</p>{history.length ? history.map(session => <Session key={`${owner}:${session.id}`} session={session} historical highlighted={false} />) : <p>{t.exerciseEmpty}</p>}</section>
  </>;
}
