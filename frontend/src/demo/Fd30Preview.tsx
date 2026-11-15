import { useEffect, useReducer, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../state/AppProvider';
import { localeSet } from '../state/mateSlice';
import { useLocale, useT } from '../i18n/I18nProvider';
import { CREW, HISTORY, OWNER, REST, WAKE_EVENT, historyFor, previewReduce, previewTime, restorePreview } from './fd30';
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

export function Fd30Preview({ page }: { page: 'today' | 'sleep' }) {
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
  const characterRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const owner = state.activeCrewId;
  const crew = CREW.find(c => c.id === owner)!;
  const profile = state.profiles[owner];
  const history = historyFor(owner);
  const received = state.wakeReceived && owner === OWNER;
  const news = received && !profile.seen;
  const pose = chatOpen || showing ? 'interaction' : news ? 'news' : 'idle';
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(previewTime(state, now));

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
    document.getElementById('fd-view-h')?.focus();
    document.getElementById('fd-main')?.scrollTo(0, 0);
  }, [page]);
  useEffect(() => {
    if (!showing) return;
    const timer = window.setTimeout(() => setShowing(false), 2000);
    return () => window.clearTimeout(timer);
  }, [showing]);

  const openSleep = () => {
    dispatch({ type: 'seen', owner });
    setShowing(true);
    setAnnouncement(t.opened);
    navigate('/onboard/personal/sleep');
    if (page === 'sleep') document.getElementById('fd-view-h')?.focus();
  };
  const closeChat = () => { setChatOpen(false); characterRef.current?.focus(); };
  const reset = () => {
    if (!window.confirm(t.confirm)) return;
    const nowMs = Date.now();
    dispatch({ type: 'reset', now: nowMs }); setNow(nowMs);
    setChatOpen(false); setShowing(false); setAnnouncement('');
    navigate('/demo/fd30');
  };
  const sleepLink = (label: string, className = 'fd-link') => <Link className={className} to="/onboard/personal/sleep" onClick={e => { e.preventDefault(); openSleep(); }}>{label}<Arrow /></Link>;

  return (
    <div className={`fd30${chatOpen ? ' fd-chat-open' : ''}`} data-surface="onboard">
      <a className="skip" href="#fd-main">{messages.a11y.skipToContent}</a>
      <header className="fd-header">
        <Link className="fd-brand" to="/demo/fd30">{messages.common.appName}<span>{t.onboard}</span></Link>
        <nav className="fd-nav" aria-label={messages.a11y.missionNav}>
          <NavLink to="/demo/fd30" aria-current="page">{t.today}</NavLink>
          <NavLink to="/onboard/personal/sleep" aria-current="page" onClick={e => { e.preventDefault(); openSleep(); }}>{t.sleep}</NavLink>
        </nav>
        <div className="fd-identity"><span className="fd-profile-mark" aria-hidden="true">✳</span><span><strong>{crew.name}</strong><small>{t.crew}</small></span></div>
        <div className="fd-languages" role="group" aria-label={messages.common.language}>
          {(['en', 'es'] as const).map(lang => <button key={lang} type="button" lang={lang} aria-pressed={locale === lang} onClick={() => appDispatch(localeSet(lang))}>{lang.toUpperCase()}</button>)}
        </div>
      </header>
      <section className="fd-demo" aria-label={t.demo}>
        <div><strong>{t.demo}</strong><span>{t.demoHint}</span></div>
        <label className="fd-view-as"><span>{t.viewAs}</span><select aria-label={t.viewAs} value={owner} onChange={e => { setChatOpen(false); setShowing(false); setAnnouncement(''); dispatch({ type: 'select', crewId: e.target.value as CrewId }); }}>{CREW.map(c => <option key={c.id} value={c.id}>{c.name} · {c.character}</option>)}</select></label>
        <button className="fd-next" type="button" disabled={state.wakeReceived} onClick={() => { const n = Date.now(); setNow(n); dispatch({ type: 'next', now: n }); }}>{state.wakeReceived ? t.end : t.next}<span>{!state.wakeReceived && t.nextTime}</span>{!state.wakeReceived && <Arrow />}</button>
        <button className="fd-reset" type="button" onClick={reset}>{t.restart}</button>
        <Link className="fd-m1" to="/ground/iss/agenda">{t.m1}<span aria-hidden="true"> ↗</span></Link>
      </section>
      <div className="fd-workspace">
        <main className="fd-main" id="fd-main" tabIndex={-1}>
          <div className="fd-page">
            <div className="fd-dayline"><span>{t.mission} <span aria-hidden="true">/</span> {t.date}</span><time title={t.clock}>{time} <small>{t.clock}</small></time></div>
            {page === 'today' ? <>
              <div className="fd-page-intro"><p className="fd-eyebrow">{t.personal}</p><h1 id="fd-view-h" tabIndex={-1}>{t.day}</h1></div>
              <section className={`fd-moment${received ? ' fd-awake' : ''}`} aria-labelledby="fd-moment-h">
                <div className="fd-moment-copy"><p className="fd-eyebrow"><span className="fd-status-dot" />{t.now} · {received ? t.receivedBadge : t.beforeBadge}</p><h2 id="fd-moment-h">{received ? t.morning : t.before}</h2><p>{received ? t.afterBody : t.beforeBody}</p>{sleepLink(received ? t.summary : t.openSleep, 'fd-primary')}<p className="fd-source-inline">{t.simulated} · {received ? WAKE_EVENT.sourceId : REST.sourceId}</p></div>
                <Daybreak />
              </section>
              <section className="fd-sleep-strip" aria-label={t.sleep}>
                <div><p className="fd-eyebrow">{t.planned}</p><strong className="fd-plan-time">{t.planTime}</strong><p>{t.planDates} · {t.planDuration}</p><small>{t.planLane}</small></div>
                <div><p className="fd-eyebrow">{t.recorded}</p><strong className="fd-no-record">{t.noRecord}</strong><p>{received ? t.received : t.waiting}</p>{sleepLink(t.openSleep)}</div>
              </section>
              <section className="fd-next-step"><p className="fd-eyebrow">{t.nextAction}</p><h2>{t.review}</h2><p>{t.reviewBody}</p>{sleepLink(t.openSleep)}</section>
              <section className="fd-personal-context"><h2>{t.observations}</h2><p>{t.noObservations}</p></section>
            </> : <>
              <div className="fd-page-intro"><p className="fd-eyebrow">{t.personal} / {t.sleep}</p><h1 id="fd-view-h" tabIndex={-1}>{t.sleepTitle}</h1><p>{t.sleepIntro}</p></div>
              <section className="fd-rest-plan" aria-labelledby="fd-plan-h"><p className="fd-eyebrow">{t.planLane}</p><h2 id="fd-plan-h">{t.planned}</h2><strong className="fd-large-time">{t.planTime}</strong><p>{t.planDates} <span aria-hidden="true">·</span> {t.planDuration}</p><div className="fd-rest-line" aria-hidden="true"><span /><span /></div><p>{t.calculated}</p><small>{REST.sourceId} · {`iss:fd30:${owner.slice(-2)}:planned-rest`}</small></section>
              <section className="fd-record" aria-labelledby="fd-record-h"><div className="fd-record-heading"><h2 id="fd-record-h">{t.recorded}</h2><span className="fd-tag">{t.simulated}</span></div><p className="fd-no-record">{t.noRecord}</p><p>{t.noRecordBody}</p><div className="fd-report-status"><span aria-hidden="true">{received ? '↳' : '—'}</span><div><strong>{received ? t.received : t.waiting}</strong><p>{t.reportLimit}</p></div></div>
                {received && <details className="fd-report-details"><summary>{t.details}</summary><dl><dt>{t.instrument}</dt><dd>{t.deviceSource}</dd><dt>{t.variable}</dt><dd>{t.variableValue}</dd><dt>{t.nature}</dt><dd>{t.natureValue}</dd><dt>{t.availability}</dt><dd>{t.availabilityValue}</dd><dt>{t.attribution}</dt><dd>{t.attributionValue}</dd><dt>{t.source}</dt><dd>{WAKE_EVENT.sourceId} · {WAKE_EVENT.id} · {WAKE_EVENT.episodeId}</dd><dt>{t.timing}</dt><dd>{WAKE_EVENT.occurredAt} / {WAKE_EVENT.receivedAt}</dd><dt>{t.version}</dt><dd>{HISTORY.version}</dd></dl></details>}
              </section>
              <section className="fd-history"><p className="fd-eyebrow">{t.history}</p><h2>{t.historyTitle}</h2><p>{t.historyBody}</p><strong>{t.recorded} · {t.noRecord}</strong><small>{t.historySource} · {HISTORY.sourceId} · {history.id} · {HISTORY.version}</small><small>{crew.name} · {owner} · {history.date}</small></section>
            </>}
            <section className="fd-provenance" aria-labelledby="fd-provenance-h"><h2 id="fd-provenance-h">{t.provenance}</h2><div><article><h3>{t.planLane}</h3><p>{t.planSource}</p></article><article><h3>{t.deviceLane}</h3><p>{t.deviceSource}</p></article><article><h3>{t.evidenceLane}</h3><p>{t.evidenceBody}</p></article></div><p className="fd-research"><a href="https://ntrs.nasa.gov/citations/20230014025" target="_blank" rel="noreferrer">{t.research}<span aria-hidden="true"> ↗</span></a><span>{t.researchBody}</span></p></section>
            <footer className="fd-foot">{t.scope} <span aria-hidden="true">·</span> {crew.name}</footer>
          </div>
        </main>
        {chatOpen && <aside className="fd-dock" aria-label={t.characterDescription}>
          <section id="fd-chat-panel" className="fd-chat" aria-labelledby="fd-chat-h">
            <header><div><h2 id="fd-chat-h">{t.chatTitle} · {crew.character}</h2><small>{t.private}</small></div><button ref={closeRef} type="button" aria-label={t.closeChat} onClick={closeChat}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3L13 13M3 13L13 3" stroke="currentColor" strokeWidth="1.5" /></svg></button></header>
            <div className="fd-chat-log" ref={logRef} role="log" aria-label={messages.a11y.conversation}><p className="fd-chat-intro">{t.intro}</p>{profile.turns.map((turn, i) => <div className="fd-chat-pair" key={i}><p className="fd-chat-user" lang={turn.lang}><small>{t.you}</small>{turn.text}</p><p><small>{crew.character}</small>{turn.reply === 'sleep' ? t.chatReply : t.fallback}</p></div>)}</div>
            <div className="fd-chat-tools">{sleepLink(t.openSleep)}<form onSubmit={e => { e.preventDefault(); const text = profile.draft; dispatch({ type: 'ask', owner, text, lang: locale }); if (/sleep|rest|summary|sueño|dormi|descanso|resumen/i.test(text)) openSleep(); }}><label className="sr-only" htmlFor="fd-ask">{t.ask}</label><input id="fd-ask" value={profile.draft} placeholder={t.ask} onChange={e => dispatch({ type: 'draft', owner, text: e.target.value })} /><button type="submit" disabled={!profile.draft.trim()} aria-label={t.send}><Arrow /></button></form></div>
          </section>
        </aside>}
        <FloatingCompanion key={owner} crew={crew} preference={profile.position} pose={pose} news={news} chatOpen={chatOpen}
          onPosition={position => dispatch({ type: 'position', owner, position })} onChat={() => setChatOpen(true)} onSleep={openSleep} characterRef={characterRef} />
      </div>
      <div className="sr-only" role="status">{announcement}</div>
    </div>
  );
}
