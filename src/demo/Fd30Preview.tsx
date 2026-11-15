import { CrewDynamics } from '../views/crew-dynamics/CrewDynamics';
import { useEffect, useReducer, useRef, useState } from 'react';
import { navigate } from '../app/routes';
import { isGroundPage, isOnboardPage, LAST_ONBOARD_KEY, restoredOnboardPage } from '../app/publicRoutes';
import type { OnboardFd30Page } from '../app/publicRoutes';
import { FD30_PUBLIC_TEXT } from './fd30PublicText';
import { Fd30GroundAgenda } from './Fd30GroundAgenda';
import { useApp } from '../state/AppProvider';
import { sessionStorageOrNull } from '../state/persistence';
import { useLocale, useT } from '../i18n/I18nProvider';
import { CREW, FD30_KEY, EXERCISE_SESSION, clampMissionTime, projectDomain, receivedPersonalEvents, latestPersonalEvent, latestNews, nextPreviewEvent, previewReduce, previewTime, restorePreview } from './fd30';
import { LaboratoryDetail, labHeadingId } from './LaboratoryDetail';
import { SleepDetail } from '../views/history/sleep/SleepDetail';
import { ExerciseDetail } from './ExerciseDetail';
import { Fd30Timebar } from './Fd30Timebar';
import { TodaySummary } from '../views/today/TodaySummary';
import { useDialogueVoice } from './voice/useDialogueVoice';
import { DemoDock } from './DemoDock';
import { Fd30PersonalAgenda } from './Fd30PersonalAgenda';
import { Fd30Conversation } from './Fd30Conversation';
import { FloatingCompanion } from './FloatingCompanion';
import { ModuleCatalog } from '../views/catalog/ModuleCatalog';
import { EvidenceSuite } from '../views/evidence/EvidenceSuite';
import { OpsNavigation } from '../views/fd30-ops/OpsNavigation';
import { OpsPanel } from '../views/fd30-ops/OpsPanel';
import { OPS_TEXT } from '../views/fd30-ops/opsText';
import { useOpsJournal } from '../views/fd30-ops/useOpsJournal';
import type { GroundRole, Route } from '../state/types';
import type { CrewId } from './fd30';
import '../styles/fd30.css';
import '../styles/fd30-imp05.css';
import '../styles/secondary-nav.css';
import '../styles/fd30-demo-dock.css';
import { BrandImage } from '../views/shared/BrandMark';
import { ThemeToggle } from '../theme/ThemeSettings';

function Arrow() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 12H20M14 6L20 12L14 18" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
}


type Fd30Page = Extract<Route, { view: 'fd30' }>['page'];
export function Fd30Preview({ page }: { page: Fd30Page }) {
  const { dispatch: appDispatch } = useApp();
  const locale = useLocale();
  const messages = useT();
  const t = messages.fd30;
  const o = OPS_TEXT[locale];
  const p = FD30_PUBLIC_TEXT[locale];
  const onGround = isGroundPage(page);
  const opsPage = page === 'ground' || page === 'crew' || page === 'wellbeing' || page === 'requests';
  const [savedOnboard] = useState(() => {
    try { return restoredOnboardPage(sessionStorageOrNull()?.getItem(LAST_ONBOARD_KEY) ?? null); } catch { return 'today' as const; }
  });
  const lastOnboardPage = useRef<OnboardFd30Page>(savedOnboard);
  if (isOnboardPage(page)) lastOnboardPage.current = page;
  useEffect(() => {
    if (isOnboardPage(page)) {
      try { sessionStorageOrNull()?.setItem(LAST_ONBOARD_KEY, page); } catch { /* Navigation memory is optional. */ }
    }
  }, [page]);
  const [groundRole, setGroundRole] = useState<GroundRole>('mission_operator');
  const [state, dispatch] = useReducer(previewReduce, undefined, () => {
    let raw: string | null = null;
    try { raw = sessionStorageOrNull()?.getItem(FD30_KEY) ?? null; } catch { /* In-memory preview remains usable. */ }
    return restorePreview(raw, Date.now());
  });
  const [now, setNow] = useState(Date.now);
  const [chatOpen, setChatOpen] = useState(false);
  const [telemetryAsTable, setTelemetryAsTable] = useState(false);
  const guidedHandled = useRef<string | null>(null);
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
  const newsEvent = latestNews(state, owner);
  const summaryEvent = latestPersonalEvent(state, owner);
  const news = !!newsEvent;
  const missionTime = previewTime(state, now);
  const journal = useOpsJournal(owner, missionTime);
  const nextEvent = nextPreviewEvent(state);
  const nextLabel = nextEvent && 'sampleId' in nextEvent
    ? nextEvent.sampleType === 'blood' ? nextEvent.kind === 'lab.sample_taken' ? t.labNextBloodTaken : nextEvent.kind === 'lab.analysis_started' ? t.labNextBloodAnalysis : t.labNextBloodResult
      : nextEvent.kind === 'lab.sample_taken' ? t.labNextUrineTaken : nextEvent.kind === 'lab.analysis_started' ? t.labNextUrineAnalysis : t.labNextUrineResult
    : nextEvent?.kind === 'exercise.started' ? t.nextExerciseStart : nextEvent?.kind === 'exercise.finished' ? t.nextExerciseFinish : t.nextTime;
  const labNewsText = newsEvent && 'sampleId' in newsEvent ? `${newsEvent.sampleType === 'blood' ? t.labBlood : t.labUrine} · ${newsEvent.kind === 'lab.result_available' ? t.labResult : newsEvent.kind === 'lab.analysis_started' ? t.labAnalyzing : t.labTaken}` : '';
  const newsText = labNewsText || (newsEvent?.kind === 'exercise.finished' ? t.exerciseCompleted : newsEvent?.kind === 'exercise.started' ? `${t.exerciseStart} · ${newsEvent.occurredAt.slice(11, 16)} · ${t.clock}` : t.newsText);
  const pose = chatOpen || showing ? 'interaction' : news ? 'news' : 'idle';
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(missionTime);

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
  useEffect(() => { if (chatOpen && !onGround) closeRef.current?.focus(); }, [chatOpen, onGround]);
  useEffect(() => {
    if (!chatOpen || onGround) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) { setChatOpen(false); characterRef.current?.focus(); }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [chatOpen, onGround]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [profile.turns.length, chatOpen]);
  useEffect(() => {
    const selected = showing && (page === 'laboratory' ? profile.highlightedSampleId : page === 'exercise' ? profile.highlightedSessionId : null);
    const heading = document.getElementById(page === 'catalog' ? 'mcat-h' : selected ? page === 'laboratory' ? labHeadingId(selected) : 'fd-exercise-session-h' : 'fd-view-h');
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
  // Today's lab card: open the module on the sample it shows. Same view action as the news summary; the clock is untouched.
  const openTodayLab = (sampleId?: string, eventId?: string) => {
    if (!sampleId || !eventId) return openPersonal('laboratory');
    dispatch({ type: 'laboratory/view', owner, sampleId, eventId });
    setShowing(true); setAnnouncement(t.labOpened);
    navigate({ view: 'fd30', page: 'laboratory' });
  };
  // VOICE06/SLEEP-VOICE03: spoken dialogues (Laboratory, Sleep). Guided playback opens ONE target once, only after the answer
  // ended successfully; the dialogue names the target (a lab sample or a sleep night), never a fixed one, and the clock is untouched.
  const guidedVoiceOpened = useRef(new Set<string>());
  const [sleepTarget, setSleepTarget] = useState<{ owner: CrewId; fd: number } | null>(null);
  useEffect(() => { if (page !== 'sleep') setSleepTarget(null); }, [page]);
  const [exerciseTarget, setExerciseTarget] = useState<{ owner: CrewId; fd: number; focus: 'session' | 'comparison' } | null>(null);
  useEffect(() => { if (page !== 'exercise') setExerciseTarget(null); }, [page]);
  const voice = useDialogueVoice({ chatOpen: chatOpen && !onGround, owner, onGround, page, cursor: missionTime, onEnded: (key, target) => {
    const current = stateRef.current;
    if (current.playback !== 'guided' || guidedVoiceOpened.current.has(key)) return;
    if (target.sampleId) {
      const sample = current.laboratory.find(s => s.crewId === current.activeCrewId && s.id === target.sampleId);
      if (!sample?.result) return;
      guidedVoiceOpened.current.add(key);
      openTodayLab(sample.id, sample.result.id);
    } else if (target.exercise) {
      // Exercise: Lucía's completed FD30 session reuses the existing exercise/view path; Tomás/Mei open their exact FD (and the comparison section for Tomás).
      const ex = target.exercise, session = current.exercise.find(s => s.id === ex.sessionId && s.crewId === current.activeCrewId);
      guidedVoiceOpened.current.add(key);
      if (session?.finish) { dispatch({ type: 'exercise/view', owner: current.activeCrewId, sessionId: session.id, eventId: session.finish.id }); setShowing(true); }
      setExerciseTarget({ owner: current.activeCrewId, fd: ex.fd, focus: ex.focus });
      openPersonal('exercise');
    } else if (target.sleepFd) {
      guidedVoiceOpened.current.add(key);
      setSleepTarget({ owner: current.activeCrewId, fd: target.sleepFd });
      openPersonal('sleep');
    }
  } });
  const openSleep = () => openPersonal('sleep');
  const openExercise = () => openPersonal('exercise');
  const openLaboratory = () => openPersonal('laboratory');
  const openSummary = () => openPersonal(summaryEvent && 'sampleId' in summaryEvent ? 'laboratory' : summaryEvent && 'sessionId' in summaryEvent ? 'exercise' : 'sleep', true);
  const seek = (target: number) => {
    const at = clampMissionTime(target), n = Date.now();
    const events = receivedPersonalEvents({ ...state, ...projectDomain(at) }, owner);
    const count = events.filter(e => !profile.announcedIds.includes(e.id)).length;
    dispatch({ type: 'seek', now: n, target: at });
    if (!onGround) dispatch({ type: 'events/announce', owner, ids: events.map(e => e.id) });
    setNow(n); setShowing(false);
    setAnnouncement(onGround ? '' : t.timeSummary(new Date(at).toISOString().slice(11, 16), count));
  };
  useEffect(() => {
    if (onGround) return;
    const events = receivedPersonalEvents(state, owner).filter(e => !profile.announcedIds.includes(e.id));
    if (!events.length) return;
    dispatch({ type: 'events/announce', owner, ids: events.map(e => e.id) });
    const unread = events.filter(e => 'sampleId' in e ? !profile.labSeenIds.includes(e.id)
      : 'sessionId' in e ? !profile.exerciseSeenIds.includes(e.id) : !profile.seen);
    if (unread.length) setAnnouncement(t.timeSummary(time, unread.length));
  }, [state.processedIds, owner, profile.announcedIds, onGround]);
  useEffect(() => {
    const request = state.guidedRequest;
    if (!request || request.owner !== owner || guidedHandled.current === request.eventId) return;
    guidedHandled.current = request.eventId;
    dispatch({ type: 'guided/consume', owner, eventId: request.eventId });
    if (onGround) return;
    if (document.activeElement?.id === 'fd-ask' && profile.draft.trim()) return;
    dispatch({ type: 'exercise/view', owner, sessionId: EXERCISE_SESSION, eventId: request.eventId });
    setShowing(true); setAnnouncement(t.guidedOpened);
    navigate({ view: 'fd30', page: 'exercise' });
    if (page === 'exercise') document.getElementById('fd-exercise-session-h')?.focus();
  }, [state.guidedRequest, owner, onGround]);
  const closeChat = () => { setChatOpen(false); characterRef.current?.focus(); };
  const reset = () => {
    if (!window.confirm(t.confirm)) return;
    const nowMs = Date.now();
    dispatch({ type: 'reset', now: nowMs }); setNow(nowMs);
    journal.dispatch({ type: 'reset' });
    setChatOpen(false); setShowing(false); setAnnouncement(''); guidedHandled.current = null;
    navigate({ view: 'fd30', page: 'today' });
  };

  return (
    <div className={`fd30${chatOpen && !onGround ? ' fd-chat-open' : ''}${onGround ? ' fd30-ground' : ''}`} data-surface={onGround ? 'ground' : 'onboard'}>
      <a className="skip" href="#fd-main" onClick={e => { e.preventDefault(); document.getElementById('fd-main')?.focus(); }}>{messages.a11y.skipToContent}</a>
      <header className="fd-header">
        <a className="fd-brand" href={onGround ? '#/demo/fd30/ground' : '#/demo/fd30'} aria-label={`${messages.common.appName} · ${onGround ? o.ground : t.onboard}`}><BrandImage name={messages.common.appName} /></a>
        {onGround ? <nav className="fd-nav" aria-label={messages.a11y.missionNav}><a href="#/demo/fd30/ground" aria-current={page === 'ground' ? 'page' : undefined}>{p.overview}</a><a href="#/demo/fd30/ground/agenda" aria-current={page === 'ground-agenda' ? 'page' : undefined}>{p.agenda}</a><a href="#/demo/fd30/ground/catalog" aria-current={page === 'ground-catalog' ? 'page' : undefined}>{p.catalog}</a></nav> : <nav className="fd-nav" aria-label={messages.a11y.missionNav}>
          <a href="#/demo/fd30" aria-current={page === 'today' ? 'page' : undefined}>{t.today}</a>
          <a href="#/onboard/personal/agenda" aria-current={page === 'agenda' ? 'page' : undefined}>{t.agendaNav}</a>
          <a href="#/onboard/personal/sleep" aria-current={page === 'sleep' ? 'page' : undefined} onClick={e => { e.preventDefault(); openSleep(); }}>{t.sleep}</a>
          <a href="#/onboard/personal/exercise" aria-current={page === 'exercise' ? 'page' : undefined} onClick={e => { e.preventDefault(); openExercise(); }}>{t.exercise}</a>
          <a href="#/onboard/personal/laboratory" aria-current={page === 'laboratory' ? 'page' : undefined} onClick={e => { e.preventDefault(); openLaboratory(); }}>{t.laboratory}</a>
          <a href="#/onboard/personal/catalog" aria-current={page === 'catalog' ? 'page' : undefined}>{t.catalog}</a>
        </nav>}
        {!onGround && <div className="fd-identity"><span className="fd-profile-mark" aria-hidden="true">✳</span><span><strong>{crew.name}</strong><small>{t.crew}</small></span></div>}
        <div className="fd-languages" role="group" aria-label={messages.common.language}>
          {(['en', 'es'] as const).map(lang => <button key={lang} type="button" lang={lang} aria-pressed={locale === lang} onClick={() => appDispatch({ type: 'locale/set', locale: lang })}>{lang.toUpperCase()}</button>)}
        </div>
        <ThemeToggle />
      </header>
      <DemoDock label={t.demo} hint={t.demoHint} instructions={t.demoDockHelp} closeLabel={t.demoClose}>
        <div className="fd-demo-navigation">
          <button className="fd-perspective-switch" type="button" onClick={() => navigate({ view: 'fd30', page: onGround ? lastOnboardPage.current : 'ground' })}>{onGround ? p.switchToOnboard : p.switchToGround}</button>
          <a className="fd-secondary-link" href={onGround ? '#/demo/fd30/ground/evidence' : '#/onboard/personal/evidence'} aria-current={page === 'evidence' || page === 'ground-evidence' ? 'page' : undefined}>{t.evidence}</a>
        </div>
        {!onGround && <label className="fd-view-as"><span>{t.viewAs}</span><select aria-label={t.viewAs} value={owner} onChange={e => { setChatOpen(false); setShowing(false); setAnnouncement(''); dispatch({ type: 'select', crewId: e.target.value as CrewId }); }}>{CREW.map(c => <option key={c.id} value={c.id}>{c.name} · {c.character}</option>)}</select></label>}
        <button className="fd-next" type="button" disabled={!nextEvent} onClick={() => { const n = Date.now(); setNow(n); dispatch({ type: 'next', now: n }); }}>{!nextEvent ? t.end : t.next}<span>{!onGround && nextEvent && nextLabel}</span>{nextEvent && <Arrow />}</button>
        <button className="fd-reset" type="button" onClick={reset}>{t.restart}</button>
        <Fd30Timebar state={state} time={missionTime} dispatch={dispatch} onSeek={seek} />
      </DemoDock>
      <div className="fd-workspace">
        <main className="fd-main" id="fd-main" tabIndex={-1}>
          <div className={`fd-page${page === 'agenda' ? ' fd-page-schedule' : ''}${onGround || page === 'crew' ? ' fd-page-operations' : ''}`}>
            <div className="fd-dayline"><span>{t.mission} <span aria-hidden="true">/</span> {t.date}</span><time title={t.clock}>{time} <small>{t.clock}</small></time></div>
            {!onGround && <OpsNavigation owner={owner} page={page} />}
            {page === 'crew-dynamics' || page === 'ground-crew-dynamics' ? <CrewDynamics state={state} viewer={onGround ? { perspective: 'ground', role: groundRole } : { perspective: 'onboard', owner }} />
              : page === 'ground-agenda' ? <Fd30GroundAgenda time={missionTime} />
              : page === 'ground-catalog' ? <div className="fd-ground-catalog"><ModuleCatalog perspective="ground" role={groundRole} /></div>
              : page === 'ground-evidence' ? <EvidenceSuite perspective="ground" />
              : opsPage ? <OpsPanel page={page} session={state} time={missionTime} journal={journal.state} onAction={journal.dispatch} role={groundRole} onRole={setGroundRole} onSkip={() => navigate({ view: 'fd30', page: 'today' })} /> : page === 'today' ? <TodaySummary state={state} owner={owner} time={missionTime} ops={journal.state} onOpenSleep={openSleep} onOpenExercise={openExercise} onOpenLaboratory={openTodayLab} />
              : page === 'agenda' ? <Fd30PersonalAgenda state={state} owner={owner} time={missionTime} /> : page === 'laboratory' ? <><LaboratoryDetail state={state} owner={owner} highlight={showing} time={missionTime} /><p className="fd-evidence-hint"><a href="#/onboard/personal/evidence">{t.labInspirationLink}</a></p></> : page === 'exercise' ? <ExerciseDetail state={state} owner={owner} time={missionTime} asTable={telemetryAsTable} onToggle={() => setTelemetryAsTable(v => !v)} highlight={showing} target={exerciseTarget?.owner === owner ? { fd: exerciseTarget.fd, focus: exerciseTarget.focus } : null} /> : page === 'catalog' ? <>
              <ModuleCatalog perspective="onboard" />
            </> : page === 'evidence' ? <>
              <div className="fd-page-intro"><h1 id="fd-view-h" tabIndex={-1}>{t.evidence}</h1></div>
              <EvidenceSuite perspective="onboard" />
            </> : <SleepDetail state={state} owner={owner} time={missionTime} targetFd={sleepTarget?.owner === owner ? sleepTarget.fd : null} />}
            {!onGround && !opsPage && page !== 'crew-dynamics' && page !== 'catalog' && page !== 'agenda' && page !== 'sleep' && page !== 'evidence' && page !== 'ground-evidence' && <section className="fd-provenance" aria-labelledby="fd-provenance-h"><h2 id="fd-provenance-h">{t.provenance}</h2><div><article><h3>{t.planLane}</h3><p>{page === 'laboratory' ? t.labPlanBody : page === 'exercise' ? t.exercisePlanLimit : t.planSource}</p></article><article><h3>{t.deviceLane}</h3><p>{page === 'laboratory' ? t.labAdapter : page === 'exercise' ? t.exerciseAdapter : t.deviceSource}</p></article><article><h3>{t.evidenceLane}</h3><p>{t.evidenceBody}</p></article></div><p className="fd-research"><a href="https://ntrs.nasa.gov/citations/20230014025" target="_blank" rel="noreferrer">{t.research}<span aria-hidden="true"> ↗</span></a><span>{t.researchBody}</span></p></section>}
            {!onGround && !!state.diagnostics.length && <details className="fd-report-details"><summary>{t.diagnostics}</summary>{state.diagnostics.map(d => <p key={d.eventId}>{d.eventId} · {d.sourceId} · {d.status === 'rejected' ? t.rejected : t.unassigned}</p>)}</details>}
            <footer className="fd-foot">{opsPage ? o.resetLimit : t.scope}{!onGround && <> <span aria-hidden="true">·</span> {crew.name}</>}</footer>
          </div>
        </main>
        {chatOpen && !onGround && <aside className="fd-dock" aria-label={t.characterDescription}>
          <section id="fd-chat-panel" className="fd-chat" aria-labelledby="fd-chat-h">
            <header><div><h2 id="fd-chat-h">{crew.character}</h2><small>{t.private}</small></div><button ref={closeRef} type="button" aria-label={t.closeChat} onClick={closeChat}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3L13 13M3 13L13 3" stroke="currentColor" strokeWidth="1.5" /></svg></button></header>
            <Fd30Conversation profile={profile} character={crew.character} logRef={logRef} time={missionTime} owner={owner} voice={voice}
              onAsk={(text, input = 'text') => dispatch({ type: 'ask', owner, text, lang: locale, now: Date.now(), input })}
              onDraft={text => dispatch({ type: 'draft', owner, text })}
              onOpen={detail => { if (detail === 'agenda') { navigate({ view: 'fd30', page: 'agenda' }); } else openPersonal(detail); }} />
          </section>
        </aside>}
        {!onGround && <FloatingCompanion key={owner} crew={crew} preference={profile.position} pose={pose} news={news} hasSummary={!!summaryEvent} newsText={newsText} chatOpen={chatOpen}
          onPosition={position => dispatch({ type: 'position', owner, position })} onChat={() => setChatOpen(true)} onSleep={openSleep} onExercise={openExercise} onLaboratory={openLaboratory} onSummary={openSummary} characterRef={characterRef} />}
      </div>
      {!onGround && <div className="sr-only" role="status">{announcement}</div>}
    </div>
  );
}
