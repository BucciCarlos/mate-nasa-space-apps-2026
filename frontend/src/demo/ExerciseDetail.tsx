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
  const eyebrow = 'text-fd-quiet text-[12px] font-semibold uppercase tracking-[.13em] leading-[1.6]';
  return (
    <section className={`my-6 p-[22px] border border-fd-rule rounded overflow-wrap-anywhere ${highlighted ? 'outline-2 outline-fd-rust outline-offset-[3px] bg-[#eee0cd55]' : ''}`} data-session-id={session.id} aria-labelledby={historical ? 'fd-exercise-history-h' : 'fd-exercise-session-h'}>
      <div className="flex flex-wrap items-center gap-3"><h2 ref={heading} id={historical ? 'fd-exercise-history-h' : 'fd-exercise-session-h'} tabIndex={-1} className="m-0 text-lg font-[550]">{historical ? t.exerciseHistory : session.finish ? t.exerciseCompleted : t.exerciseInProgress}</h2><span className="text-[12px] px-[7px] py-[3px] border border-[#c4cabb] rounded">{t.simulated}</span>{highlighted && <span className="text-[12px] px-[7px] py-[3px] border border-[#c4cabb] rounded">{t.exerciseHighlight}</span>}</div>
      {historical && <p className="text-[15px] leading-[1.65] text-fd-quiet">{t.exerciseHistoryBody}</p>}
      <dl className="grid grid-cols-1 sm:grid-cols-[150px_minmax(0,1fr)] gap-2.5 text-fs1"><dt className="text-fd-quiet">{t.exerciseStart}</dt><dd className="m-0">{session.start ? <time dateTime={session.start.occurredAt}>{session.start.occurredAt}</time> : t.exerciseMissing}</dd><dt className="text-fd-quiet">{t.exerciseFinish}</dt><dd className="m-0">{session.finish ? <time dateTime={session.finish.occurredAt}>{session.finish.occurredAt}</time> : t.exerciseMissing}</dd></dl>
      {!historical && (minutes !== null ? <div className="border-t border-fd-rule mt-5 pt-3.5"><p className={eyebrow}>{t.exerciseElapsed}</p><strong className="block text-[clamp(34px,5vw,46px)] font-normal tabular-nums">{new Intl.NumberFormat(locale).format(minutes)} <small className="text-lg">{/* i18n-ignore — SI time unit */}min</small></strong><p className="text-[15px] leading-[1.65] text-fd-quiet">{t.exerciseCalculation}</p></div> : <p className="text-[15px] leading-[1.65] text-fd-quiet">{session.finish && !session.start ? t.exerciseIncomplete : t.exercisePendingDuration}</p>)}
      <h3 className="text-lg font-[550]">{t.exerciseMetrics}</h3><p className="text-[15px] leading-[1.65] text-fd-quiet">{t.exerciseMetricsLimit}</p>
      <details className="text-fs1 border-t border-fd-rule pt-3.5"><summary className="cursor-pointer font-[550]">{t.details}</summary><dl className="grid grid-cols-1 sm:grid-cols-[150px_minmax(0,1fr)] gap-2.5 mb-0">
        <dt className="text-fd-quiet">{t.instrument}</dt><dd className="m-0">{historical ? t.historySource : t.exerciseAdapter}</dd>
        <dt className="text-fd-quiet">{t.variable}</dt><dd className="m-0">{t.exerciseVariable}</dd>
        <dt className="text-fd-quiet">{t.nature}</dt><dd className="m-0">{historical ? t.exerciseHistoryNature : t.exerciseNature}</dd>
        <dt className="text-fd-quiet">{t.availability}</dt><dd className="m-0">{t.exerciseAvailability}</dd>
        <dt className="text-fd-quiet">{t.attribution}</dt><dd className="m-0">{t.attributionValue}</dd>
        <dt className="text-fd-quiet">{t.source}</dt><dd className="m-0">{session.id}{events.map(event => <div key={event.id}>{event.sourceId} · {event.id}</div>)}</dd>
        <dt className="text-fd-quiet">{t.timing}</dt><dd className="m-0">{events.map(event => <div key={event.id}>{event.occurredAt} / {event.receivedAt}</div>)}</dd>
        <dt className="text-fd-quiet">{t.version}</dt><dd className="m-0">{EXERCISE_VERSION}</dd>
      </dl></details>
    </section>
  );
}

export function ExerciseDetail({ state, owner }: { state: PreviewState; owner: CrewId }) {
  const t = useT().fd30;
  const sessions = exerciseSessions(state, owner);
  const current = sessions.find(s => s.id === EXERCISE_SESSION);
  const history = sessions.filter(s => s.id !== EXERCISE_SESSION);
  const eyebrow = 'text-fd-quiet text-[12px] font-semibold uppercase tracking-[.13em] leading-[1.6]';
  return <>
    <div className="mt-[34px] mb-7"><p className={eyebrow}>{t.personal} / {t.exercise}</p><h1 id="fd-view-h" tabIndex={-1} className="font-serif text-[clamp(32px,5vw,46px)] font-normal tracking-[-.035em] leading-[1.12] my-2 mb-3">{t.exerciseTitle}</h1><p className="text-fd-quiet text-fs1">{t.exerciseIntro}</p></div>
    {owner === OWNER && <section className="bg-fd-sage p-[26px] rounded-[4px_40px_4px_4px]"><p className={eyebrow}>{t.planLane}</p><h2 className="text-lg font-[550] my-3">{t.exercisePlanned}</h2><strong className="block font-serif text-[clamp(30px,4.5vw,40px)] font-normal tabular-nums tracking-[-.05em]">{t.exercisePlan}</strong><p className="text-fd-quiet text-fs1">{t.exercisePlanLimit}</p><small className="block text-fd-quiet text-[12px] overflow-wrap-anywhere">{EXERCISE_VERSION} · demo-plan · iss:fd30:lf:planned-exercise</small></section>}
    {current ? <Session key={`${owner}:${current.id}`} session={current} historical={false} highlighted={state.profiles[owner].highlightedSessionId === current.id} /> : <section className="py-7"><h2 className="text-lg font-[550]">{owner === OWNER ? t.exerciseWaiting : t.exerciseEmpty}</h2><p className="block font-serif font-normal text-[clamp(28px,4.5vw,38px)] my-3">{t.noRecord}</p><p className="text-[15px] leading-[1.65] text-fd-quiet">{t.exerciseMetrics}</p>{owner === OWNER && <p className="text-[15px] leading-[1.65] text-fd-quiet">{t.exercisePendingDuration}</p>}</section>}
    <section className="border-t border-fd-rule py-6"><p className={eyebrow}>{t.history}</p>{history.length ? history.map(session => <Session key={`${owner}:${session.id}`} session={session} historical highlighted={false} />) : <p className="text-[15px] leading-[1.65] text-fd-quiet">{t.exerciseEmpty}</p>}</section>
  </>;
}
