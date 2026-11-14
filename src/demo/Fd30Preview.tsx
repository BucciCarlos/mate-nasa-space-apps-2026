import { useEffect, useReducer, useRef, useState } from 'react';
import { navigate, toHash } from '../app/routes';
import { useApp } from '../state/AppProvider';
import { sessionStorageOrNull } from '../state/persistence';
import { useLocale, useT } from '../i18n/I18nProvider';
import { CREW, FD30_KEY, HISTORY, OWNER, REST, WAKE_EVENT, EXERCISE_SESSION, exerciseSessions, latestPersonalEvent, latestNews, nextPreviewEvent, previewReply, historyFor, previewReduce, previewTime, restorePreview } from './fd30';
import { LaboratoryDetail, labHeadingId } from './LaboratoryDetail';
import { BLOOD_SAMPLE, labSamples, labStatus } from './laboratory';
import { ExerciseDetail } from './ExerciseDetail';
import { FloatingCompanion } from './FloatingCompanion';
import type { CrewId } from './fd30';
import '../styles/fd30.css';

function Arrow() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 12H20M14 6L20 12L14 18" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
}

function Daybreak() {
  return (
    <svg className="fd-daybreak" viewBox="0 0 320 340" aria-hidden="true">
      <defs><linearGradient id="fd-sky" x2="0" y2="1"><stop stopColor="#1c363b" /><stop offset="1" stopColor="#536e6d" /></linearGradient><linearGradient id="fd-earth" x2="0" y2="1"><stop stopColor="#f2ca9b" /><stop offset=".08" stopColor="#c1cebc" /><stop offset="1" stopColor="#819f98" /></linearGradient></defs>
      <rect width="320" height="340" rx="155" fill="url(#fd-sky)" />
      <g fill="#f8edd8"><circle cx="72" cy="83" r="1.8" /><circle cx="235" cy="114" r="1.3" /><circle cx="175" cy="40" r="1" /><circle cx="122" cy="130" r="1" /><path d="M220 55V66M215 60.5H225" stroke="#f8edd8" /></g>
      <path d="M14 242Q160 128 306 242V265Q160 151 14 265Z" fill="#f4d2ad" opacity=".15" />
      <path d="M19 264Q160 138 301 264Q277 334 160 340Q43 334 19 264Z" fill="url(#fd-earth)" />
      <path d="M44 279Q146 190 275 274M66 301Q151 227 253 297" fill="none" stroke="#eceddd" strokeWidth="1" opacity=".45" />
      <ellipse cx="160" cy="338" rx="97" ry="2" fill="#1c363b" opacity=".1" />
    </svg>
  );
}

export function Fd30Preview({ page }: { page: 'today' | 'sleep' | 'exercise' | 'laboratory' }) {
  const { dispatch: appDispatch } = useApp();
  const locale = useLocale();
  const messages = useT();
  const t = messages.fd30;
  const [state, dispatch] = useReducer(previewReduce, undefined, () => {
    let raw: string | null = null;
    try { raw = sessionStorageOrNull()?.getItem(FD30_KEY) ?? null; } catch { /* In-memory preview remains usable. */ }
    return restorePreview(raw, Date.now());
  });
  const [now, setNow] = useState(Date.now);
  const [chatOpen, setChatOpen] = useState(false);
  const [showing, setShowing] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const characterRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const owner = state.activeCrewId;
  const crew = CREW.find(c => c.id === owner)!;
  const profile = state.profiles[owner];
  const history = historyFor(owner);
  const received = state.wakeReceived && owner === OWNER;
  const newsEvent = latestNews(state, owner);
  const summaryEvent = latestPersonalEvent(state, owner);
  const news = !!newsEvent;
  const exercise = exerciseSessions(state, owner).find(s => s.id === EXERCISE_SESSION);
  const exerciseStatus = exercise?.finish ? t.exerciseCompleted : exercise?.start ? t.exerciseInProgress : owner === OWNER ? t.exercisePlanned : t.noRecord;
  const blood = labSamples(state, owner).find(s => s.id === BLOOD_SAMPLE);
  const bloodStatus = labStatus(blood);
  const labLabels = { planned: t.labPlan, collection: t.labTaken, analysis: t.labAnalyzing, result: t.labResult };
  const latestIsLab = !!summaryEvent && 'sampleId' in summaryEvent;
  const latestLabLabel = summaryEvent?.kind === 'lab.result_available' ? t.labResult : summaryEvent?.kind === 'lab.analysis_started' ? t.labAnalyzing : t.labTaken;
  const nextEvent = nextPreviewEvent(state);
  const nextLabel = nextEvent && 'sampleId' in nextEvent
    ? nextEvent.sampleType === 'blood' ? nextEvent.kind === 'lab.sample_taken' ? t.labNextBloodTaken : nextEvent.kind === 'lab.analysis_started' ? t.labNextBloodAnalysis : t.labNextBloodResult
      : nextEvent.kind === 'lab.sample_taken' ? t.labNextUrineTaken : nextEvent.kind === 'lab.analysis_started' ? t.labNextUrineAnalysis : t.labNextUrineResult
    : nextEvent?.kind === 'exercise.started' ? t.nextExerciseStart : nextEvent?.kind === 'exercise.finished' ? t.nextExerciseFinish : t.nextTime;
  const labNewsText = newsEvent && 'sampleId' in newsEvent ? `${newsEvent.sampleType === 'blood' ? t.labBlood : t.labUrine} · ${newsEvent.kind === 'lab.result_available' ? t.labResult : newsEvent.kind === 'lab.analysis_started' ? t.labAnalyzing : t.labTaken}` : '';
  const newsText = labNewsText || (newsEvent?.kind === 'exercise.finished' ? t.exerciseCompleted : newsEvent?.kind === 'exercise.started' ? `${t.exerciseStart} · ${newsEvent.occurredAt.slice(11, 16)} · ${t.clock}` : t.newsText);
  const pose = chatOpen || showing ? 'interaction' : news ? 'news' : 'idle';
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(previewTime(state, now));

  useEffect(() => {
    const tick = () => { const nowMs = Date.now(); setNow(nowMs); dispatch({ type: 'tick', now: nowMs }); };
    tick();
    const timer = window.setInterval(tick, 1000);
    window.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); window.removeEventListener('visibilitychange', tick); };
  }, []);
  useEffect(() => {
    const save = () => { try { sessionStorageOrNull()?.setItem(FD30_KEY, JSON.stringify(stateRef.current)); } catch { /* Storage is optional. */ } };
    save();
    window.addEventListener('pagehide', save);
    return () => { save(); window.removeEventListener('pagehide', save); };
  }, [state]);
  useEffect(() => { if (chatOpen) closeRef.current?.focus(); }, [chatOpen]);
  useEffect(() => {
    if (!chatOpen) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) { setChatOpen(false); characterRef.current?.focus(); }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [chatOpen]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [profile.turns.length, chatOpen]);
  useEffect(() => {
    const selected = showing && (page === 'laboratory' ? profile.highlightedSampleId : page === 'exercise' ? profile.highlightedSessionId : null);
    const heading = document.getElementById(selected ? page === 'laboratory' ? labHeadingId(selected) : 'fd-exercise-session-h' : 'fd-view-h');
    heading?.focus();
    if (selected) heading?.scrollIntoView({ block: 'center' });
    else document.getElementById('fd-main')?.scrollTo(0, 0);
  }, [page]);
  useEffect(() => {
    if (!showing) return;
    const timer = window.setTimeout(() => setShowing(false), 2000);
    return () => window.clearTimeout(timer);
  }, [showing]);

  const openPersonal = (module: 'sleep' | 'exercise' | 'laboratory', summary = false) => {
    if (module === 'sleep') dispatch({ type: 'seen', owner });
    if (module === 'exercise' && summary && summaryEvent && 'sessionId' in summaryEvent) {
      dispatch({ type: 'exercise/view', owner, sessionId: summaryEvent.sessionId, eventId: summaryEvent.id });
    }
    if (module === 'laboratory' && summary && summaryEvent && 'sampleId' in summaryEvent) {
      dispatch({ type: 'laboratory/view', owner, sampleId: summaryEvent.sampleId, eventId: summaryEvent.id });
    }
    setShowing(true);
    setAnnouncement(module === 'laboratory' ? summary ? t.labSummaryOpened : t.labOpened : module === 'sleep' ? t.opened : summary ? t.exerciseSummaryOpened : t.exerciseOpened);
    navigate({ view: 'fd30', page: module });
    if (page === module) document.getElementById(summary && module === 'laboratory' && summaryEvent && 'sampleId' in summaryEvent ? labHeadingId(summaryEvent.sampleId) : summary && module === 'exercise' ? 'fd-exercise-session-h' : 'fd-view-h')?.focus();
  };
  const openSleep = () => openPersonal('sleep');
  const openExercise = () => openPersonal('exercise');
  const openLaboratory = () => openPersonal('laboratory');
  const openSummary = () => openPersonal(summaryEvent && 'sampleId' in summaryEvent ? 'laboratory' : summaryEvent && 'sessionId' in summaryEvent ? 'exercise' : 'sleep', true);
  const closeChat = () => { setChatOpen(false); characterRef.current?.focus(); };
  const reset = () => {
    if (!window.confirm(t.confirm)) return;
    const nowMs = Date.now();
    dispatch({ type: 'reset', now: nowMs }); setNow(nowMs);
    setChatOpen(false); setShowing(false); setAnnouncement('');
    navigate({ view: 'fd30', page: 'today' });
  };
  const personalLink = (module: 'sleep' | 'exercise' | 'laboratory', label: string, className = 'fd-link') => <a className={className} href={toHash({ view: 'fd30', page: module })} onClick={e => { e.preventDefault(); openPersonal(module); }}>{label}<Arrow /></a>;
  const sleepLink = (label: string, className = 'fd-link') => personalLink('sleep', label, className);

  return (
    <div className={`fd30${chatOpen ? ' fd-chat-open' : ''}`} data-surface="onboard">
      <a className="skip" href="#fd-main">{messages.a11y.skipToContent}</a>
      <header className="fd-header">
        <a className="fd-brand" href="#/demo/fd30">{messages.common.appName}<span>{t.onboard}</span></a>
        <nav className="fd-nav" aria-label={messages.a11y.missionNav}>
          <a href="#/demo/fd30" aria-current={page === 'today' ? 'page' : undefined}>{t.today}</a>
          <a href="#/onboard/personal/sleep" aria-current={page === 'sleep' ? 'page' : undefined} onClick={e => { e.preventDefault(); openSleep(); }}>{t.sleep}</a>
          <a href="#/onboard/personal/exercise" aria-current={page === 'exercise' ? 'page' : undefined} onClick={e => { e.preventDefault(); openExercise(); }}>{t.exercise}</a>
          <a href="#/onboard/personal/laboratory" aria-current={page === 'laboratory' ? 'page' : undefined} onClick={e => { e.preventDefault(); openLaboratory(); }}>{t.laboratory}</a>
        </nav>
        <div className="fd-identity"><span className="fd-profile-mark" aria-hidden="true">✳</span><span><strong>{crew.name}</strong><small>{t.crew}</small></span></div>
        <div className="fd-languages" role="group" aria-label={messages.common.language}>
          {(['en', 'es'] as const).map(lang => <button key={lang} type="button" lang={lang} aria-pressed={locale === lang} onClick={() => appDispatch({ type: 'locale/set', locale: lang })}>{lang.toUpperCase()}</button>)}
        </div>
      </header>
      <section className="fd-demo" aria-label={t.demo}>
        <div><strong>{t.demo}</strong><span>{t.demoHint}</span></div>
        <label className="fd-view-as"><span>{t.viewAs}</span><select aria-label={t.viewAs} value={owner} onChange={e => { setChatOpen(false); setShowing(false); setAnnouncement(''); dispatch({ type: 'select', crewId: e.target.value as CrewId }); }}>{CREW.map(c => <option key={c.id} value={c.id}>{c.name} · {c.character}</option>)}</select></label>
        <button className="fd-next" type="button" disabled={!nextEvent} onClick={() => { const n = Date.now(); setNow(n); dispatch({ type: 'next', now: n }); }}>{!nextEvent ? t.end : t.next}<span>{nextEvent && nextLabel}</span>{nextEvent && <Arrow />}</button>
        <button className="fd-reset" type="button" onClick={reset}>{t.restart}</button>
        <a className="fd-m1" href="#/ground/iss/agenda">{t.m1}<span aria-hidden="true"> ↗</span></a>
      </section>
      <div className="fd-workspace">
        <main className="fd-main" id="fd-main" tabIndex={-1}>
          <div className="fd-page">
            <div className="fd-dayline"><span>{t.mission} <span aria-hidden="true">/</span> {t.date}</span><time title={t.clock}>{time} <small>{t.clock}</small></time></div>
            {page === 'today' || page === 'laboratory' ? <p className="fd-lab-scope">{t.labScope}</p> : null}
            {page === 'today' ? <>
              <div className="fd-page-intro"><p className="fd-eyebrow">{t.personal}</p><h1 id="fd-view-h" tabIndex={-1}>{t.day}</h1></div>
              <section className={`fd-moment${received ? ' fd-awake' : ''}`} aria-labelledby="fd-moment-h">
                <div className="fd-moment-copy"><p className="fd-eyebrow"><span className="fd-status-dot" />{t.now} · {latestIsLab || exercise || received ? t.receivedBadge : t.beforeBadge}</p><h2 id="fd-moment-h">{latestIsLab ? latestLabLabel : exercise ? exerciseStatus : received ? t.morning : t.before}</h2><p>{latestIsLab ? t.labFuture : exercise ? exercise.finish ? t.exerciseCalculation : t.exercisePendingDuration : received ? t.afterBody : t.beforeBody}</p>{latestIsLab || exercise ? <a className="fd-primary" href={toHash({ view: 'fd30', page: latestIsLab ? 'laboratory' : 'exercise' })} onClick={e => { e.preventDefault(); openSummary(); }}>{t.summary}<Arrow /></a> : sleepLink(received ? t.summary : t.openSleep, 'fd-primary')}<p className="fd-source-inline">{t.simulated} · {latestIsLab ? summaryEvent.sourceId : exercise ? 'demo-exercise' : received ? WAKE_EVENT.sourceId : REST.sourceId}</p></div>
                <Daybreak />
              </section>
              <section className="fd-sleep-strip" aria-label={t.sleep}>
                <div><p className="fd-eyebrow">{t.planned}</p><strong className="fd-plan-time">{t.planTime}</strong><p>{t.planDates} · {t.planDuration}</p><small>{t.planLane}</small></div>
                <div><p className="fd-eyebrow">{t.recorded}</p><strong className="fd-no-record">{t.noRecord}</strong><p>{received ? t.received : t.waiting}</p>{sleepLink(t.openSleep)}</div>
              </section>
              <section className="fd-exercise-card" aria-labelledby="fd-exercise-card-h"><p className="fd-eyebrow">{t.exercise}</p><h2 id="fd-exercise-card-h">{exerciseStatus}</h2><p>{owner === OWNER ? t.exercisePlan : t.exerciseEmpty}</p><strong>{t.exerciseMetrics}</strong><p>{t.simulated} · {exercise ? 'demo-exercise' : owner === OWNER ? 'demo-plan' : t.noRecord}</p>{personalLink('exercise', t.openExercise)}</section>
              <section className="fd-lab-card" aria-labelledby="fd-lab-card-h"><p className="fd-eyebrow">{t.laboratory} · {t.labBlood}</p><h2 id="fd-lab-card-h">{owner === OWNER ? labLabels[bloodStatus] : t.labEmpty}</h2><strong>{t.labNoValues}</strong><p>{t.labFuture}</p>{personalLink('laboratory', t.openLaboratory)}</section>
              <section className="fd-next-step"><p className="fd-eyebrow">{t.nextAction}</p><h2>{t.review}</h2><p>{t.reviewBody}</p>{sleepLink(t.openSleep)}</section>
              <section className="fd-personal-context"><h2>{t.observations}</h2><p>{t.noObservations}</p></section>
            </> : page === 'laboratory' ? <LaboratoryDetail state={state} owner={owner} /> : page === 'exercise' ? <ExerciseDetail state={state} owner={owner} /> : <>
              <div className="fd-page-intro"><p className="fd-eyebrow">{t.personal} / {t.sleep}</p><h1 id="fd-view-h" tabIndex={-1}>{t.sleepTitle}</h1><p>{t.sleepIntro}</p></div>
              <section className="fd-rest-plan" aria-labelledby="fd-plan-h"><p className="fd-eyebrow">{t.planLane}</p><h2 id="fd-plan-h">{t.planned}</h2><strong className="fd-large-time">{t.planTime}</strong><p>{t.planDates} <span aria-hidden="true">·</span> {t.planDuration}</p><div className="fd-rest-line" aria-hidden="true"><span /><span /></div><p>{t.calculated}</p><small>{REST.sourceId} · {`iss:fd30:${owner.slice(-2)}:planned-rest`}</small></section>
              <section className="fd-record" aria-labelledby="fd-record-h"><div className="fd-record-heading"><h2 id="fd-record-h">{t.recorded}</h2><span className="fd-tag">{t.simulated}</span></div><p className="fd-no-record">{t.noRecord}</p><p>{t.noRecordBody}</p><div className="fd-report-status"><span aria-hidden="true">{received ? '↳' : '—'}</span><div><strong>{received ? t.received : t.waiting}</strong><p>{t.reportLimit}</p></div></div>
                {received && <details className="fd-report-details"><summary>{t.details}</summary><dl><dt>{t.instrument}</dt><dd>{t.deviceSource}</dd><dt>{t.variable}</dt><dd>{t.variableValue}</dd><dt>{t.nature}</dt><dd>{t.natureValue}</dd><dt>{t.availability}</dt><dd>{t.availabilityValue}</dd><dt>{t.attribution}</dt><dd>{t.attributionValue}</dd><dt>{t.source}</dt><dd>{WAKE_EVENT.sourceId} · {WAKE_EVENT.id} · {WAKE_EVENT.episodeId}</dd><dt>{t.timing}</dt><dd>{WAKE_EVENT.occurredAt} / {WAKE_EVENT.receivedAt}</dd><dt>{t.version}</dt><dd>{HISTORY.version}</dd></dl></details>}
              </section>
              <section className="fd-history"><p className="fd-eyebrow">{t.history}</p><h2>{t.historyTitle}</h2><p>{t.historyBody}</p><strong>{t.recorded} · {t.noRecord}</strong><small>{t.historySource} · {HISTORY.sourceId} · {history.id} · {HISTORY.version}</small><small>{crew.name} · {owner} · {history.date}</small></section>
            </>}
            <section className="fd-provenance" aria-labelledby="fd-provenance-h"><h2 id="fd-provenance-h">{t.provenance}</h2><div><article><h3>{t.planLane}</h3><p>{page === 'laboratory' ? t.labPlanBody : page === 'exercise' ? t.exercisePlanLimit : t.planSource}</p></article><article><h3>{t.deviceLane}</h3><p>{page === 'laboratory' ? t.labAdapter : page === 'exercise' ? t.exerciseAdapter : t.deviceSource}</p></article><article><h3>{t.evidenceLane}</h3><p>{t.evidenceBody}</p></article></div><p className="fd-research"><a href="https://ntrs.nasa.gov/citations/20230014025" target="_blank" rel="noreferrer">{t.research}<span aria-hidden="true"> ↗</span></a><span>{t.researchBody}</span></p></section>
            {!!state.diagnostics.length && <details className="fd-report-details"><summary>{t.diagnostics}</summary>{state.diagnostics.map(d => <p key={d.eventId}>{d.eventId} · {d.sourceId} · {d.status === 'rejected' ? t.rejected : t.unassigned}</p>)}</details>}
            <footer className="fd-foot">{t.scope} <span aria-hidden="true">·</span> {crew.name}</footer>
          </div>
        </main>
        {chatOpen && <aside className="fd-dock" aria-label={t.characterDescription}>
          <section id="fd-chat-panel" className="fd-chat" aria-labelledby="fd-chat-h">
            <header><div><h2 id="fd-chat-h">{t.chatTitle} · {crew.character}</h2><small>{t.private}</small></div><button ref={closeRef} type="button" aria-label={t.closeChat} onClick={closeChat}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3L13 13M3 13L13 3" stroke="currentColor" strokeWidth="1.5" /></svg></button></header>
            <div className="fd-chat-log" ref={logRef} role="log" aria-label={messages.a11y.conversation}><p className="fd-chat-intro">{t.intro}</p>{profile.turns.map((turn, i) => <div className="fd-chat-pair" key={i}><p className="fd-chat-user" lang={turn.lang}><small>{t.you}</small>{turn.text}</p><p><small>{crew.character}</small>{turn.reply === 'laboratory' ? t.labChatReply : turn.reply === 'exercise' ? t.exerciseChatReply : turn.reply === 'sleep' ? t.chatReply : t.fallback}</p></div>)}</div>
            <div className="fd-chat-tools">{sleepLink(t.openSleep)}{personalLink('exercise', t.openExercise)}{personalLink('laboratory', t.openLaboratory)}<form onSubmit={e => { e.preventDefault(); const text = profile.draft; dispatch({ type: 'ask', owner, text, lang: locale }); const reply = previewReply(state, owner, text); if (reply === 'laboratory') { if (/summary|resumen/i.test(text) && latestIsLab) openSummary(); else openLaboratory(); } else if (reply === 'exercise') { if (/summary|resumen/i.test(text) && summaryEvent && 'sessionId' in summaryEvent) openSummary(); else openExercise(); } else if (reply === 'sleep') openSleep(); }}><label className="sr-only" htmlFor="fd-ask">{t.ask}</label><input id="fd-ask" value={profile.draft} placeholder={t.ask} onChange={e => dispatch({ type: 'draft', owner, text: e.target.value })} /><button type="submit" disabled={!profile.draft.trim()} aria-label={t.send}><Arrow /></button></form></div>
          </section>
        </aside>}
        <FloatingCompanion key={owner} crew={crew} preference={profile.position} pose={pose} news={news} hasSummary={!!summaryEvent} newsText={newsText} chatOpen={chatOpen}
          onPosition={position => dispatch({ type: 'position', owner, position })} onChat={() => setChatOpen(true)} onSleep={openSleep} onExercise={openExercise} onLaboratory={openLaboratory} onSummary={openSummary} characterRef={characterRef} />
      </div>
      <div className="sr-only" role="status">{announcement}</div>
    </div>
  );
}
