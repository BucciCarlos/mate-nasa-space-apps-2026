import { useEffect, useReducer, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../state/AppProvider';
import { localeSet } from '../state/mateSlice';
import { useLocale, useT } from '../i18n/I18nProvider';
import { CREW, HISTORY, OWNER, REST, WAKE_EVENT, EXERCISE_SESSION, clampMissionTime, exerciseSessions, latestPersonalEvent, latestNews, historyFor, previewReduce, previewTime, projectDomain, receivedPersonalEvents, restorePreview } from './fd30';
import { LaboratoryDetail, labHeadingId } from './LaboratoryDetail';
import { BLOOD_SAMPLE, labSamples, labStatus } from './laboratory';
import { ExerciseDetail } from './ExerciseDetail';
import { Fd30Timebar } from './Fd30Timebar';
import { Fd30Agenda } from './Fd30Agenda';
import { Fd30PersonalAgenda } from './Fd30PersonalAgenda';
import { Fd30Conversation } from './Fd30Conversation';
import { Fd30GroundAgenda } from './Fd30GroundAgenda';
import { ModuleCatalog } from '../views/catalog/ModuleCatalog';
import { EvidenceSuite } from '../views/evidence/EvidenceSuite';
import { OpsPanel } from '../views/fd30-ops/OpsPanel';
import { useOpsJournal } from '../views/fd30-ops/useOpsJournal';
import { FD30_PUBLIC_TEXT } from './fd30PublicText';
import type { GroundRole } from '../state/types';
import { FloatingCompanion } from './FloatingCompanion';
import type { ChatDetail } from './fd30Chat';
import type { CrewId } from './fd30';

function Arrow() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 12H20M14 6L20 12L14 18" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
}

function Daybreak() {
  return (
    <svg className="w-full max-w-[245px] justify-self-end" viewBox="0 0 320 340" aria-hidden="true">
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

const PAGE_PATHS = { today: '/demo/fd30', sleep: '/onboard/personal/sleep', exercise: '/onboard/personal/exercise', laboratory: '/onboard/personal/laboratory', agenda: '/demo/fd30/agenda', catalog: '/onboard/personal/catalog', evidence: '/onboard/personal/evidence', ground: '/demo/fd30/ground', groundAgenda: '/demo/fd30/ground/agenda', groundCatalog: '/demo/fd30/ground/catalog', groundEvidence: '/demo/fd30/ground/evidence', crew: '/demo/fd30/ground/crew', wellbeing: '/demo/fd30/ground/wellbeing', requests: '/demo/fd30/ground/requests' } as const;

export function Fd30Preview({ page }: { page: 'today' | 'sleep' | 'exercise' | 'laboratory' | 'agenda' | 'catalog' | 'evidence' | 'ground' | 'ground-agenda' | 'ground-catalog' | 'ground-evidence' | 'crew' | 'wellbeing' | 'requests' }) {
  const appDispatch = useAppDispatch();
  const navigate = useNavigate();
  const locale = useLocale();
  const messages = useT();
  const t = messages.fd30;
  // No sessionStorage: the preview starts fresh on every mount (02 §3.3 —
  // the Redux store + backend are the only state sources).
  const [state, dispatch] = useReducer(previewReduce, undefined, () => restorePreview(null, Date.now()));
  const [now, setNow] = useState(Date.now);
  const [chatOpen, setChatOpen] = useState(false);
  const [showing, setShowing] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [telemetryAsTable, setTelemetryAsTable] = useState(false);
  const [groundRole, setGroundRole] = useState<GroundRole>('mission_operator');
  const p = FD30_PUBLIC_TEXT[locale];
  const characterRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const guidedHandled = useRef<string | null>(null);
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
  const labNewsText = newsEvent && 'sampleId' in newsEvent ? `${newsEvent.sampleType === 'blood' ? t.labBlood : t.labUrine} · ${newsEvent.kind === 'lab.result_available' ? t.labResult : newsEvent.kind === 'lab.analysis_started' ? t.labAnalyzing : t.labTaken}` : '';
  const newsText = labNewsText || (newsEvent?.kind === 'exercise.finished' ? t.exerciseCompleted : newsEvent?.kind === 'exercise.started' ? `${t.exerciseStart} · ${newsEvent.occurredAt.slice(11, 16)} · ${t.clock}` : t.newsText);
  const pose = chatOpen || showing ? 'interaction' : news ? 'news' : 'idle';
  const missionTime = previewTime(state, now);
  const journal = useOpsJournal(owner, missionTime);
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(missionTime);

  useEffect(() => {
    const tick = () => { const nowMs = Date.now(); setNow(nowMs); dispatch({ type: 'tick', now: nowMs }); };
    tick();
    const timer = window.setInterval(tick, 1000);
    window.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); window.removeEventListener('visibilitychange', tick); };
  }, []);
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
  useEffect(() => {
    const events = receivedPersonalEvents(state, owner).filter(e => !profile.announcedIds.includes(e.id));
    if (!events.length) return;
    dispatch({ type: 'events/announce', owner, ids: events.map(e => e.id) });
    const unread = events.filter(e => 'sampleId' in e ? !profile.labSeenIds.includes(e.id)
      : 'sessionId' in e ? !profile.exerciseSeenIds.includes(e.id) : !profile.seen);
    if (unread.length) setAnnouncement(t.timeSummary(time, unread.length));
  }, [state.processedIds, owner, profile.announcedIds]);
  useEffect(() => {
    const request = state.guidedRequest;
    if (!request || request.owner !== owner || guidedHandled.current === request.eventId) return;
    guidedHandled.current = request.eventId;
    dispatch({ type: 'guided/consume', owner, eventId: request.eventId });
    if (document.activeElement?.id === 'fd-ask' && profile.draft.trim()) return;
    dispatch({ type: 'exercise/view', owner, sessionId: EXERCISE_SESSION, eventId: request.eventId });
    setShowing(true); setAnnouncement(t.guidedOpened);
    navigate(PAGE_PATHS.exercise);
    if (page === 'exercise') document.getElementById('fd-exercise-session-h')?.focus();
  }, [state.guidedRequest, owner]);

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
    navigate(PAGE_PATHS[module]);
    if (page === module) document.getElementById(summary && module === 'laboratory' && summaryEvent && 'sampleId' in summaryEvent ? labHeadingId(summaryEvent.sampleId) : summary && module === 'exercise' ? 'fd-exercise-session-h' : 'fd-view-h')?.focus();
  };
  const openSleep = () => openPersonal('sleep');
  const openExercise = () => openPersonal('exercise');
  const openLaboratory = () => openPersonal('laboratory');
  const openSummary = () => openPersonal(summaryEvent && 'sampleId' in summaryEvent ? 'laboratory' : summaryEvent && 'sessionId' in summaryEvent ? 'exercise' : 'sleep', true);
  const openAgenda = () => { setShowing(true); setAnnouncement(t.opened); navigate('/demo/fd30/agenda'); };
  const openDetail = (detail: ChatDetail) => {
    if (detail === 'sleep') openSleep();
    else if (detail === 'exercise') openExercise();
    else if (detail === 'laboratory') openLaboratory();
    else openAgenda();
  };
  const seek = (target: number) => {
    const at = clampMissionTime(target), n = Date.now();
    const events = receivedPersonalEvents({ ...state, ...projectDomain(at) }, owner);
    const count = events.filter(e => !profile.announcedIds.includes(e.id)).length;
    dispatch({ type: 'seek', now: n, target: at });
    dispatch({ type: 'events/announce', owner, ids: events.map(e => e.id) });
    setNow(n); setShowing(false);
    setAnnouncement(t.timeSummary(new Date(at).toISOString().slice(11, 16), count));
  };
  const reset = () => {
    if (!window.confirm(t.confirm)) return;
    const nowMs = Date.now();
    dispatch({ type: 'reset', now: nowMs }); setNow(nowMs);
    setChatOpen(false); setShowing(false); setAnnouncement('');
    navigate(PAGE_PATHS.today);
  };
  const personalLink = (module: 'sleep' | 'exercise' | 'laboratory', label: string, className = 'fd-link') => <Link className={className} to={PAGE_PATHS[module]} onClick={e => { e.preventDefault(); openPersonal(module); }}>{label}<Arrow /></Link>;
  const sleepLink = (label: string, className = 'fd-link') => personalLink('sleep', label, className);
  const fdLink = 'inline-flex items-center gap-3 font-semibold text-fs1 no-underline underline underline-offset-[5px]';
  const fdPrimary = 'inline-flex items-center gap-5 no-underline px-4 py-3 rounded-md bg-fd-ink text-white text-fs1 font-semibold my-[18px] mb-3 cursor-pointer hover:bg-[#395857]';

  return (
    <div className={`h-screen h-dvh bg-fd-paper text-fd-ink grid grid-rows-[auto_auto_minmax(0,1fr)] ${chatOpen ? 'fd-chat-open' : ''}`} data-surface="onboard">
      <a className="sr-only focus:not-sr-only" href="#fd-main">{messages.a11y.skipToContent}</a>
      <header className="flex flex-wrap items-center gap-x-[34px] gap-y-2 px-9 pt-5 border-b border-fd-rule relative z-[60]">
        <Link className="flex gap-3.5 items-baseline no-underline text-xl font-extrabold tracking-[.12em] whitespace-nowrap pb-5" to={PAGE_PATHS.today}>{messages.common.appName}<span className="text-xs font-medium tracking-[.02em] text-fd-quiet">{t.onboard}</span></Link>
        <nav className="flex flex-wrap gap-x-[26px] gap-y-1 self-stretch" aria-label={messages.a11y.missionNav}>
          <NavLink to={PAGE_PATHS.today} aria-current="page" className={({ isActive }) => `flex items-center px-1 pb-[18px] no-underline font-semibold border-b-[3px] ${isActive ? 'border-fd-ink' : 'border-transparent'}`}>{t.today}</NavLink>
          <NavLink to={PAGE_PATHS.sleep} aria-current="page" onClick={e => { e.preventDefault(); openSleep(); }} className={({ isActive }) => `flex items-center px-1 pb-[18px] no-underline font-semibold border-b-[3px] ${isActive ? 'border-fd-ink' : 'border-transparent'}`}>{t.sleep}</NavLink>
          <NavLink to={PAGE_PATHS.exercise} aria-current="page" onClick={e => { e.preventDefault(); openExercise(); }} className={({ isActive }) => `flex items-center px-1 pb-[18px] no-underline font-semibold border-b-[3px] ${isActive ? 'border-fd-ink' : 'border-transparent'}`}>{t.exercise}</NavLink>
          <NavLink to={PAGE_PATHS.laboratory} aria-current="page" onClick={e => { e.preventDefault(); openLaboratory(); }} className={({ isActive }) => `flex items-center px-1 pb-[18px] no-underline font-semibold border-b-[3px] ${isActive ? 'border-fd-ink' : 'border-transparent'}`}>{t.laboratory}</NavLink>
          <NavLink to={PAGE_PATHS.catalog} aria-current="page" className={({ isActive }) => `flex items-center px-1 pb-[18px] no-underline font-semibold border-b-[3px] ${isActive ? 'border-fd-ink' : 'border-transparent'}`}>{t.catalog}</NavLink>
          <NavLink to={PAGE_PATHS.evidence} aria-current="page" className={({ isActive }) => `flex items-center px-1 pb-[18px] no-underline font-semibold border-b-[3px] ${isActive ? 'border-fd-ink' : 'border-transparent'}`}>{t.evidence}</NavLink>
          <NavLink to={PAGE_PATHS.ground} aria-current="page" className={({ isActive }) => `flex items-center px-1 pb-[18px] no-underline font-semibold border-b-[3px] ${isActive ? 'border-fd-ink' : 'border-transparent'}`}>{p.overview}</NavLink>
          <NavLink to="/demo/fd30/agenda" aria-current="page" onClick={e => { e.preventDefault(); openAgenda(); }} className={({ isActive }) => `flex items-center px-1 pb-[18px] no-underline font-semibold border-b-[3px] ${isActive ? 'border-fd-ink' : 'border-transparent'}`}>{t.agendaNav}</NavLink>
        </nav>
        <div className="ml-auto flex gap-2.5 pb-5 items-center"><span className="text-[29px] text-[#746b4e]" aria-hidden="true">✳</span><span><strong className="block text-fs2 font-semibold">{crew.name}</strong><small className="block text-fd-quiet text-xs">{t.crew}</small></span></div>
        <div className="flex gap-1 pb-5" role="group" aria-label={messages.common.language}>
          {(['en', 'es'] as const).map(lang => <button key={lang} type="button" lang={lang} aria-pressed={locale === lang} onClick={() => appDispatch(localeSet(lang))} className={`p-1.5 rounded text-xs border-0 cursor-pointer ${locale === lang ? 'bg-fd-ink text-white' : 'bg-transparent text-fd-quiet'}`}>{lang.toUpperCase()}</button>)}
        </div>
      </header>
      <section className="flex flex-wrap items-center gap-x-5 gap-y-2.5 px-9 py-2.5 bg-[#ece9df] border-b border-[#dfddd2] text-[13px] relative z-[60]" aria-label={t.demo}>
        <div className="flex flex-col gap-0.5"><strong className="text-[12px] tracking-[.08em] uppercase">{t.demo}</strong><span className="text-fd-quiet">{t.demoHint}</span></div>
        <label className="flex flex-col gap-[3px] text-[12px]"><span>{t.viewAs}</span><select aria-label={t.viewAs} value={owner} onChange={e => { setChatOpen(false); setShowing(false); setAnnouncement(''); dispatch({ type: 'select', crewId: e.target.value as CrewId }); }} className="bg-fd-card text-fd-ink border border-[#c5cabe] rounded px-[7px] py-[5px] max-w-[230px] text-fs1">{CREW.map(c => <option key={c.id} value={c.id}>{c.name} · {c.character}</option>)}</select></label>
        <Fd30Timebar state={state} time={missionTime} dispatch={dispatch} onSeek={seek} />
        <button className="border-0 px-0 py-2 bg-none text-fd-quiet text-[12px] underline underline-offset-[3px] cursor-pointer" type="button" onClick={reset}>{t.restart}</button>
        <Link className="ml-auto no-underline text-[12px]" to="/ground/iss/agenda">{t.m1}<span aria-hidden="true"> ↗</span></Link>
      </section>
      <div className={`grid grid-cols-[minmax(0,1fr)] ${chatOpen ? 'lg:grid-cols-[minmax(0,1fr)_350px]' : ''} min-h-0 w-full mx-auto h-full`}>
        <main className="min-w-0 min-h-0 overflow-auto" id="fd-main" tabIndex={-1}>
          <div className="max-w-[1100px] mx-auto px-9 py-6">
            <div className="flex justify-between items-center gap-4 text-fd-quiet text-[11px] tracking-[.02em]"><span>{t.mission} <span className="mx-[9px] text-[#97a18e]" aria-hidden="true">/</span> {t.date}</span><time title={t.clock} className="text-fd-ink tabular-nums text-base whitespace-nowrap">{time} <small className="text-[10px] ml-1.5 text-fd-quiet">{t.clock}</small></time></div>
            {page === 'today' || page === 'laboratory' ? <p className="text-fs0 text-fd-quiet border-l-2 border-[#a36846] pl-3 leading-[1.7]">{t.labScope}</p> : null}
            {page === 'agenda' ? <Fd30PersonalAgenda state={state} owner={owner} time={missionTime} /> : page === 'today' ? <>
              <div className="mt-[34px] mb-7"><p className="text-fd-quiet text-[12px] font-semibold uppercase tracking-[.13em] leading-[1.6]">{t.personal}</p><h1 id="fd-view-h" tabIndex={-1} className="font-serif text-[clamp(32px,5vw,46px)] font-normal tracking-[-.035em] leading-[1.12] my-2 mb-3">{t.day}</h1></div>
              <section className={`grid grid-cols-1 md:grid-cols-[1fr_28%] gap-[26px] items-center ${received ? 'bg-fd-cream' : 'bg-fd-sage'} p-[30px] pb-[26px] rounded-[4px_64px_4px_4px] min-h-[310px] ${chatOpen ? 'lg:grid-cols-[1fr] lg:min-h-0' : ''}`} aria-labelledby="fd-moment-h">
                <div className="max-w-[470px]">
                  <p className="text-fd-quiet text-[12px] font-semibold uppercase tracking-[.13em] leading-[1.6]"><span className={`inline-block w-1.5 h-1.5 border border-current rounded-full mr-[7px] mb-px ${received ? 'bg-fd-rust border-fd-rust' : ''}`} />{t.now} · {latestIsLab || exercise || received ? t.receivedBadge : t.beforeBadge}</p>
                  <h2 id="fd-moment-h" className="font-serif font-normal text-[36px] leading-[1.12] tracking-[-.03em] my-[18px]">{latestIsLab ? latestLabLabel : exercise ? exerciseStatus : received ? t.morning : t.before}</h2>
                  <p className="text-[#455d57] max-w-[400px] text-[15px] leading-[1.7]">{latestIsLab ? t.labFuture : exercise ? exercise.finish ? t.exerciseCalculation : t.exercisePendingDuration : received ? t.afterBody : t.beforeBody}</p>
                  {latestIsLab || exercise ? <Link className={fdPrimary} to={PAGE_PATHS[latestIsLab ? 'laboratory' : 'exercise']} onClick={e => { e.preventDefault(); openSummary(); }}>{t.summary}<Arrow /></Link> : sleepLink(received ? t.summary : t.openSleep, fdPrimary)}
                  <p className="text-[12px] text-fd-quiet">{t.simulated} · {latestIsLab ? summaryEvent.sourceId : exercise ? 'demo-exercise' : received ? WAKE_EVENT.sourceId : REST.sourceId}</p>
                </div>
                <Daybreak />
              </section>
              <section className="grid grid-cols-1 md:grid-cols-2 gap-7 py-7 border-b border-fd-rule" aria-label={t.sleep}>
                <div><p className="text-fd-quiet text-[12px] font-semibold uppercase tracking-[.13em] leading-[1.6]">{t.planned}</p><strong className="block text-[30px] font-[450] tabular-nums tracking-[-.04em] my-2.5 mb-1.5">{t.planTime}</strong><p className="text-fd-quiet text-fs1">{t.planDates} · {t.planDuration}</p><small className="text-fd-quiet text-fs0">{t.planLane}</small></div>
                <div className="md:border-l md:pl-7 md:border-fd-rule border-t md:border-t-0 pt-5 md:pt-0"><p className="text-fd-quiet text-[12px] font-semibold uppercase tracking-[.13em] leading-[1.6]">{t.recorded}</p><strong className="block font-serif font-normal text-[26px] my-3 mb-[9px]">{t.noRecord}</strong><p className="text-fd-quiet text-fs1">{received ? t.received : t.waiting}</p>{sleepLink(t.openSleep, `${fdLink} mt-[5px]`)}</div>
              </section>
              <details className="fd-agenda-details">
                <summary className="cursor-pointer text-fs1 font-semibold">{t.agendaTitle}<span className="text-fd-quiet text-[13px] font-normal"> · {t.agendaLimit}</span></summary>
                <div className="pt-3"><Fd30Agenda owner={owner} time={missionTime} /></div>
              </details>
              <section className="border-b border-fd-rule py-6" aria-labelledby="fd-exercise-card-h"><p className="text-fd-quiet text-[12px] font-semibold uppercase tracking-[.13em] leading-[1.6]">{t.exercise}</p><h2 id="fd-exercise-card-h" className="font-serif text-[30px] font-normal my-2.5">{exerciseStatus}</h2><p className="text-fs1 text-fd-quiet">{owner === OWNER ? t.exercisePlan : t.exerciseEmpty}</p><strong className="block text-fs1 text-fd-quiet">{t.exerciseMetrics}</strong><p className="text-fs1 text-fd-quiet">{t.simulated} · {exercise ? 'demo-exercise' : owner === OWNER ? 'demo-plan' : t.noRecord}</p>{personalLink('exercise', t.openExercise)}</section>
              <section className="border-b border-fd-rule py-6" aria-labelledby="fd-lab-card-h"><p className="text-fd-quiet text-[12px] font-semibold uppercase tracking-[.13em] leading-[1.6]">{t.laboratory} · {t.labBlood}</p><h2 id="fd-lab-card-h" className="font-serif text-[30px] font-normal my-2.5">{owner === OWNER ? labLabels[bloodStatus] : t.labEmpty}</h2><strong className="block text-fs1 text-fd-quiet leading-[1.65]">{t.labNoValues}</strong><p className="text-fs1 text-fd-quiet leading-[1.65]">{t.labFuture}</p>{personalLink('laboratory', t.openLaboratory)}</section>
              <section className="py-7 pb-[22px]"><p className="text-fd-quiet text-[12px] font-semibold uppercase tracking-[.13em] leading-[1.6]">{t.nextAction}</p><h2 className="font-serif font-normal text-[29px] my-2">{t.review}</h2><p className="text-fd-quiet text-[15px]">{t.reviewBody}</p>{sleepLink(t.openSleep, `${fdLink} mt-3`)}</section>
              <section className="flex items-baseline flex-wrap gap-y-2 gap-x-5 border-t border-fd-rule py-5"><h2 className="text-fs2 font-semibold m-0">{t.observations}</h2><p className="text-fs1 text-fd-quiet m-0">{t.noObservations}</p></section>
            </> : page === 'laboratory' ? <LaboratoryDetail state={state} owner={owner} /> : page === 'exercise' ? <ExerciseDetail state={state} owner={owner} time={missionTime} asTable={telemetryAsTable} onToggle={() => setTelemetryAsTable(v => !v)} highlight={showing} /> : page === 'catalog' ? <ModuleCatalog perspective="onboard" /> : page === 'evidence' ? <EvidenceSuite perspective="onboard" /> : page === 'ground-agenda' ? <Fd30GroundAgenda time={missionTime} /> : page === 'ground-catalog' ? <ModuleCatalog perspective="ground" role={groundRole} /> : page === 'ground-evidence' ? <EvidenceSuite perspective="ground" /> : page === 'ground' || page === 'crew' || page === 'wellbeing' || page === 'requests' ? <OpsPanel page={page} session={state} time={missionTime} journal={journal.state} onAction={journal.dispatch} role={groundRole} onRole={setGroundRole} onSkip={() => navigate(PAGE_PATHS.today)} /> : <>
              <div className="mt-[34px] mb-7"><p className="text-fd-quiet text-[12px] font-semibold uppercase tracking-[.13em] leading-[1.6]">{t.personal} / {t.sleep}</p><h1 id="fd-view-h" tabIndex={-1} className="font-serif text-[clamp(32px,5vw,46px)] font-normal tracking-[-.035em] leading-[1.12] my-2 mb-3">{t.sleepTitle}</h1><p className="text-fd-quiet text-fs1">{t.sleepIntro}</p></div>
              <section className="bg-fd-sage p-[26px] rounded-[4px_40px_4px_4px]" aria-labelledby="fd-plan-h"><p className="text-fd-quiet text-[12px] font-semibold uppercase tracking-[.13em] leading-[1.6]">{t.planLane}</p><h2 id="fd-plan-h" className="text-lg font-[550] my-3">{t.planned}</h2><strong className="block font-serif text-[clamp(30px,4.5vw,40px)] font-normal tabular-nums tracking-[-.05em]">{t.planTime}</strong><p className="text-fd-quiet text-fs1">{t.planDates} <span aria-hidden="true">·</span> {t.planDuration}</p><div className="bg-fd-line h-1 relative mx-1 my-[23px]" aria-hidden="true"><span className="absolute w-2.5 h-2.5 rounded-full bg-fd-line-dark -top-[3px]" /><span className="absolute w-2.5 h-2.5 rounded-full bg-fd-line-dark -top-[3px] right-0" /></div><p className="text-fd-quiet text-fs1">{t.calculated}</p><small className="block text-fd-quiet text-[12px] overflow-wrap-anywhere">{REST.sourceId} · {`iss:fd30:${owner.slice(-2)}:planned-rest`}</small></section>
              <section className="py-7" aria-labelledby="fd-record-h"><div className="flex flex-wrap items-center gap-3"><h2 id="fd-record-h" className="m-0 text-lg font-[550]">{t.recorded}</h2><span className="text-[12px] px-[7px] py-[3px] border border-[#c4cabb] rounded">{t.simulated}</span></div><p className="block font-serif font-normal text-[clamp(28px,4.5vw,38px)] my-3">{t.noRecord}</p><p className="text-fd-quiet text-[15px] max-w-[620px]">{t.noRecordBody}</p><div className="flex gap-3.5 py-[17px] mt-5 border-t border-fd-rule text-fs1"><span className="text-[20px] text-fd-rust" aria-hidden="true">{received ? '↳' : '—'}</span><div><strong className="font-[550]">{received ? t.received : t.waiting}</strong><p className="text-fd-quiet mt-1.5">{t.reportLimit}</p></div></div>
                {received && <details className="text-fs1 border-t border-fd-rule pt-3.5"><summary className="cursor-pointer font-[550]">{t.details}</summary><dl className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-2 gap-x-4 mb-0"><dt>{t.instrument}</dt><dd className="m-0 overflow-wrap-anywhere">{t.deviceSource}</dd><dt>{t.variable}</dt><dd className="m-0 overflow-wrap-anywhere">{t.variableValue}</dd><dt>{t.nature}</dt><dd className="m-0 overflow-wrap-anywhere">{t.natureValue}</dd><dt>{t.availability}</dt><dd className="m-0 overflow-wrap-anywhere">{t.availabilityValue}</dd><dt>{t.attribution}</dt><dd className="m-0 overflow-wrap-anywhere">{t.attributionValue}</dd><dt>{t.source}</dt><dd className="m-0 overflow-wrap-anywhere">{WAKE_EVENT.sourceId} · {WAKE_EVENT.id} · {WAKE_EVENT.episodeId}</dd><dt>{t.timing}</dt><dd className="m-0 overflow-wrap-anywhere">{WAKE_EVENT.occurredAt} / {WAKE_EVENT.receivedAt}</dd><dt>{t.version}</dt><dd className="m-0 overflow-wrap-anywhere">{HISTORY.version}</dd></dl></details>}
              </section>
              <section className="border-t border-fd-rule py-6"><p className="text-fd-quiet text-[12px] font-semibold uppercase tracking-[.13em] leading-[1.6]">{t.history}</p><h2 className="text-xl font-medium">{t.historyTitle}</h2><p className="text-fd-quiet text-[15px]">{t.historyBody}</p><strong className="text-fs1 font-[550]">{t.recorded} · {t.noRecord}</strong><small className="block text-fd-quiet text-[12px] overflow-wrap-anywhere mt-2">{t.historySource} · {HISTORY.sourceId} · {history.id} · {HISTORY.version}</small><small className="block text-fd-quiet text-[12px] overflow-wrap-anywhere mt-2">{crew.name} · {owner} · {history.date}</small></section>
            </>}
            <section className="border-t border-fd-rule pt-5 mt-3.5" aria-labelledby="fd-provenance-h"><h2 id="fd-provenance-h" className="text-fs2 font-semibold m-0">{t.provenance}</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-[22px] py-3 pb-[18px]"><article className="border-l-2 border-[#c4cebd] pl-3"><h3 className="text-fs1 leading-[1.6] font-semibold my-1.5">{t.planLane}</h3><p className="text-fs1 leading-[1.65] text-fd-quiet">{page === 'laboratory' ? t.labPlanBody : page === 'exercise' ? t.exercisePlanLimit : t.planSource}</p></article><article className="border-l-2 border-[#c9ad94] pl-3"><h3 className="text-fs1 leading-[1.6] font-semibold my-1.5">{t.deviceLane}</h3><p className="text-fs1 leading-[1.65] text-fd-quiet">{page === 'laboratory' ? t.labAdapter : page === 'exercise' ? t.exerciseAdapter : t.deviceSource}</p></article><article className="border-l-2 border-[#a8b9c4] pl-3"><h3 className="text-fs1 leading-[1.6] font-semibold my-1.5">{t.evidenceLane}</h3><p className="text-fs1 leading-[1.65] text-fd-quiet">{t.evidenceBody}</p></article></div><p className="flex flex-col gap-1.5 pt-3 border-t border-fd-rule"><a href="https://ntrs.nasa.gov/citations/20230014025" target="_blank" rel="noreferrer" className="text-fd-ink underline underline-offset-[3px]">{t.research}<span aria-hidden="true"> ↗</span></a><span className="text-fs1 text-fd-quiet">{t.researchBody}</span></p></section>
            {!!state.diagnostics.length && <details className="text-xs border-t border-fd-rule pt-3.5"><summary className="cursor-pointer font-[550]">{t.diagnostics}</summary>{state.diagnostics.map(d => <p key={d.eventId}>{d.eventId} · {d.sourceId} · {d.status === 'rejected' ? t.rejected : t.unassigned}</p>)}</details>}
            <footer className="text-fd-quiet text-[10px] pt-6">{t.scope} <span aria-hidden="true">·</span> {crew.name}</footer>
          </div>
        </main>
        {chatOpen && <aside className="p-5 pb-6 pl-1.5 flex-col justify-end min-h-0 min-w-0 lg:p-4 lg:pl-0" aria-label={t.characterDescription}>
          <Fd30Conversation profile={profile} character={crew.character} logRef={logRef}
            onAsk={text => dispatch({ type: 'ask', owner, text, lang: locale })}
            onDraft={text => dispatch({ type: 'draft', owner, text })}
            onOpen={openDetail} />
        </aside>}
        <FloatingCompanion key={owner} crew={crew} preference={profile.position} pose={pose} news={news} hasSummary={!!summaryEvent} newsText={newsText} chatOpen={chatOpen}
          onPosition={position => dispatch({ type: 'position', owner, position })} onChat={() => setChatOpen(true)} onSleep={openSleep} onExercise={openExercise} onLaboratory={openLaboratory} onSummary={openSummary} characterRef={characterRef} />
      </div>
      <div className="sr-only" role="status">{announcement}</div>
    </div>
  );
}
