import { useEffect, useRef, useState } from 'react';
import type { CompanionTurn, IntentId, InputMode, UiAction } from '../../state/types';
import { useSpeechToText } from '../../demo/useSpeechToText';
import { useTextToSpeech } from '../../demo/useTextToSpeech';
import { ONBOARD_MISSION_ID } from '../../state/types';
import { useApp } from '../../state/AppProvider';
import { companionAsked, companionActionsExecuted, companionAgentReply, uiCompanionToggle, uiHighlightSet, uiObservationPrefill, uiRangeSet, uiSourceOpen } from '../../state/mateSlice';
import { askAgent } from '../../state/api';
import { makeId } from '../../domain/ids';
import { selectOnboard } from '../../state/selectors';
import { flightDay, missionTimeMs } from '../../domain/time';
import { fmtInterval } from '../../i18n/format';
import type { AppState } from '../../state/types';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { renderReply } from '../../i18n/companionText';
import { matchIntent } from '../../domain/companion/intents';
import { suggestedIntents, ALL_CHIPS, NOTICE_CHIPS } from '../../domain/companion/suggestions';
import { useNavigate } from 'react-router-dom';
import { routePath } from '../../app/routes';
import { NoticeCard } from './NoticeCard';
import { SourceCard } from '../shared/SourceCard';
import { UserTextView } from '../shared/UserTextView';

const chipBtn = 'inline-flex items-center gap-1 px-3 py-1 rounded-full border border-line bg-bg3 text-fs1 cursor-pointer hover:bg-bg';

/**
 * Builds a compact operational context string for the companion LLM, e.g.:
 * "Day 12 of 30. Rest window 22:30–06:30 UTC. Planned exercise: 52 min.
 *  Link: up. 3 observations logged today."
 */
function buildOnboardContext(state: AppState): string {
  const m = state.missions[ONBOARD_MISSION_ID];
  if (!m) return '';
  const nowMs = Date.now();
  const missionMs = missionTimeMs(m.clockStart, state.sessionStartMs, nowMs);
  const day = flightDay(m.flightDayOne, missionMs);

  // Current user's name
  const user = m.crew.find((c) => c.id === m.onboardUserId);
  const userName = user?.name ?? 'the astronaut';

  const lines: string[] = [];
  lines.push(`Crew member: ${userName}`);
  lines.push(`Flight day: ${day}`);
  lines.push(`Link status: ${m.link.status}`);

  // Full agenda: all blocks that include the current user, sorted by start time.
  const blocks = m.onboard.plan.blocks
    .filter((b) => m.onboardUserId && b.crewIds.includes(m.onboardUserId))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

  if (blocks.length > 0) {
    lines.push('');
    lines.push('Today\'s agenda:');
    for (const b of blocks) {
      const dur = Math.round((Date.parse(b.end) - Date.parse(b.start)) / 60000);
      lines.push(`  ${fmtInterval(b, 'en')} — ${b.title.en} (${b.kind}, ${dur} min)`);
    }
  }

  // Unseen notices
  const unseen = m.onboard.notices.filter((n) => !n.seen).length;
  if (unseen > 0) lines.push(`Unread schedule changes: ${unseen}`);

  // Observations logged
  const obsCount = m.onboard.observations.length;
  if (obsCount > 0) lines.push(`Observations logged: ${obsCount}`);

  return lines.join('\n');
}

export function CompanionPanel({ announce }: { announce: (text: string) => void }) {
  const { state, dispatch } = useApp();
  const t = useT();
  const locale = useLocale();
  const { conversation, notices } = selectOnboard(state);
  const open = state.ui.companionOpen;
  const [text, setText] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const stt = useSpeechToText(() => locale);
  const tts = useTextToSpeech();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const executedRef = useRef<Set<string>>(new Set());
  const latestNotice = notices.length > 0 ? notices[notices.length - 1] : null;
  const chips = suggestedIntents(state, ONBOARD_MISSION_ID);

  const ask = (intent: IntentId, mode: InputMode, raw: string | null) => {
    dispatch(companionAsked(ONBOARD_MISSION_ID, { mode, text: raw ? { text: raw, lang: locale } : null, intent }, Date.now()));
  };

  // Free-text and voice input go through the backend LLM (same as FD30).
  // Chips use the local intent engine so actions (navigate, highlight, etc.)
  // keep working without an LLM round-trip.
  const askViaAgent = async (raw: string, mode: InputMode) => {
    // companionAsked pushes a user turn (seq+1) and a companion placeholder
    // (seq+2). The reply lives on the companion turn, so target seq+2.
    // Compute it from the current seq so we don't read the stale conversation.
    const seq = state.missions[ONBOARD_MISSION_ID]?.seq ?? 0;
    const companionTurnId = makeId(ONBOARD_MISSION_ID, 'turn', seq + 2);
    // Push user turn + placeholder reply so the UI shows the question immediately.
    ask(matchIntent(raw), mode, raw);
    try {
      const context = buildOnboardContext(state);
      const result = await askAgent(dispatch, { text: raw, lang: locale, context });
      dispatch(companionAgentReply(ONBOARD_MISSION_ID, companionTurnId, result.reply, result.model));
      // Auto-speak the reply (text-to-speech via runonweb, local synthesis).
      void tts.speak(result.reply, locale);
    } catch {
      // LLM unreachable — the placeholder reply stays (demo mode).
    }
  };

  const submit = () => {
    const raw = text.trim();
    if (!raw) return;
    setText('');
    void askViaAgent(raw, 'text');
  };

  // Real speech-to-text (same flow as FD30): tap to record, tap again to
  // transcribe in the browser (Whisper via runonweb), then ask with the
  // transcript. Audio never leaves the tab.
  const askVoice = async () => {
    setVoiceError(null);
    try {
      if (stt.phase === 'recording') {
        const transcript = await stt.transcribe();
        if (transcript) void askViaAgent(transcript, 'simulated_voice');
        return;
      }
      await stt.start();
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : t.companion.micError('unknown error'));
    }
  };
  const micLabel = stt.phase === 'recording' ? t.companion.micRecording : stt.phase === 'transcribing' ? t.companion.micTranscribing : stt.phase === 'loading' ? t.companion.micLoading : stt.phase === 'ready' ? t.companion.micReady : t.companion.micHint;
  const micDisabled = !stt.supported || stt.phase === 'loading' || stt.phase === 'transcribing';

  // Execute reply actions once, in order (02 §8.4)
  useEffect(() => {
    const pending = conversation.filter((c) => c.speaker === 'companion' && c.reply && !c.reply.executed && !executedRef.current.has(c.id));
    for (const turn of pending) {
      executedRef.current.add(turn.id);
      const reply = turn.reply!;
      let opened: string | null = null;
      for (const a of reply.actions) {
        switch (a.type) {
          case 'navigate': navigate(routePath(a.route)); opened = a.route.view === 'onboard' ? t.shell.nav[a.route.page] : t.shell.perspective.ground; break;
          case 'select_range': dispatch(uiRangeSet(a.range)); break;
          case 'highlight': dispatch(uiHighlightSet(a.target)); break;
          case 'clear_highlight': dispatch(uiHighlightSet(null)); break;
          case 'open_source': dispatch(uiSourceOpen(a.sourceId)); break;
          case 'open_observation_form': dispatch(uiObservationPrefill(a.prefill)); navigate('/onboard/observations'); opened = t.shell.nav.observations; break;
        }
      }
      dispatch(companionActionsExecuted(ONBOARD_MISSION_ID, turn.id));
      if (reply.actions.length > 0) {
        announce(`${t.companion.actionsDone} ${reply.actions.map((a) => t.companion.action[a.type]).join(', ')}`);
        if (opened) window.setTimeout(() => document.getElementById('view-h')?.focus(), 50);
      }
    }
  }, [conversation, announce, t, navigate, dispatch]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [conversation.length, open]);

  const actionLabel = (a: UiAction) => t.companion.action[a.type];
  const chipButtons = (list: IntentId[], mode: InputMode, after?: () => void) => (
    <div className="flex flex-wrap gap-2 my-1" role="group" aria-label={t.a11y.chips}>
      {list.map((i) => (
        <button key={i} type="button" className={chipBtn} onClick={() => { ask(i, mode, t.intents[i]); after?.(); }}>{t.intents[i]}</button>
      ))}
    </div>
  );

  const renderTurn = (c: CompanionTurn) => {
    if (c.speaker === 'user' && c.input) {
      return (
        <div key={c.id} className="border border-line border-l-4 border-l-accent rounded-md px-3 py-2 my-1 bg-bg3">
          <span className="font-semibold text-fs0 uppercase tracking-[0.06em] text-fg2">{t.companion.you}</span>
          {c.input.mode === 'simulated_voice' && <span className="text-[11px] text-fg2">🎙 {t.companion.voiceTranscription}</span>}
          {c.input.mode === 'chip' && <span className="text-[11px] text-fg2">{t.companion.chipTag}</span>}
          <p className="my-1">{c.input.text ? <UserTextView text={c.input.text} /> : t.intents[c.input.intent]}</p>
        </div>
      );
    }
    if (c.speaker === 'companion' && c.reply) {
      const r = c.reply;
      const statusCls = r.status === 'no_evidence' || r.status === 'unavailable' ? 'border-l-fg2' : 'border-l-companion';
      return (
        <div key={c.id} className={`border border-line border-l-4 rounded-md px-3 py-2 my-1 bg-bg2 ${statusCls}`}>
          <span className="font-semibold text-fs0 uppercase tracking-[0.06em] text-fg2">{state.companion.name}</span>
          {r.status === 'no_evidence' && <span className="inline-block ml-1 text-[11px] px-2 py-px rounded border border-current font-semibold text-fg2 border-dashed">{t.companion.noEvidence}</span>}
          {r.status === 'unavailable' && <span className="inline-block ml-1 text-[11px] px-2 py-px rounded border border-current font-semibold text-fg2 border-dashed">{t.companion.unavailable}</span>}
          <p className="my-1">{renderReply(r, state, ONBOARD_MISSION_ID, locale, t)}</p>
          {r.status === 'not_understood' && chipButtons(ALL_CHIPS, 'chip')}
          {r.templateId === 'noComparableRecords' && chipButtons(['observation.start'], 'chip')}
          {r.sourceIds.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center my-1">
              <span className="text-fg2 text-fs0">{t.companion.sources}:</span>
              {r.sourceIds.map((id) => (
                <button key={id} type="button" className="inline-flex items-center gap-1 text-[11px] px-2 py-px rounded-full border border-accent text-accent bg-transparent cursor-pointer" onClick={() => dispatch(uiSourceOpen(id))}><span aria-hidden="true">◆</span> {t.provenance.nasaResource}</button>
              ))}
            </div>
          )}
          {r.executed && r.actions.length > 0 && (
            <p className="text-fg2 text-fs0 my-1">{t.companion.actionsDone} {r.actions.map(actionLabel).join(' · ')}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <aside className={`border border-line rounded-md bg-bg2 color-${state.companion.color} ${open ? 'flex flex-col' : ''}`} aria-label={t.companion.panelTitle}>
      <button type="button" className="flex items-center gap-3 p-3 cursor-pointer bg-transparent border-0 w-full text-left" aria-expanded={open} aria-label={open ? t.companion.closePanel : t.companion.openPanel} onClick={() => dispatch(uiCompanionToggle())}>
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-companion text-white font-bold text-fs2 flex-shrink-0" aria-hidden="true">{state.companion.name.charAt(0)}</span>
        <span className="text-fs1 text-fg">{open ? t.companion.closePanel : t.companion.askPlaceholder({ name: state.companion.name })}</span>
      </button>
      {open && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-1" ref={scrollRef} role="log" aria-label={t.a11y.conversation}>
            <p className="border border-line border-l-4 border-l-companion rounded-md px-3 py-2 bg-bg2">{t.companion.intro({ name: state.companion.name })}</p>
            {latestNotice && !latestNotice.seen && <NoticeCard notice={latestNotice} chips={chipButtons(NOTICE_CHIPS, 'chip')} />}
            {conversation.map(renderTurn)}
          </div>
          {state.ui.openSourceId && (
            <div className="px-3">
              <SourceCard sourceId={state.ui.openSourceId} autoFocus onClose={() => dispatch(uiSourceOpen(null))} />
            </div>
          )}
          <div className="border-t border-line p-3">
            <span className="text-fg2 text-fs0">{t.companion.suggestions}</span>
            {chipButtons(chips, 'chip')}
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-2 mt-1">
              <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.companion.askPlaceholder({ name: state.companion.name })} aria-label={t.companion.askPlaceholder({ name: state.companion.name })} lang={locale} className="flex-1 font-inherit px-2 py-1 rounded border border-line bg-bg3 text-fg text-fs1" />
              {stt.supported && (
                <button type="button" className="px-2 py-1 rounded border border-line bg-transparent cursor-pointer" aria-label={micLabel} disabled={micDisabled} onClick={() => { void askVoice(); }}>
                  <span aria-hidden="true">🎙</span><span className="text-[11px]">{micLabel}</span>
                </button>
              )}
              <button type="button" className="px-2 py-1 rounded border border-line bg-transparent cursor-pointer" aria-label={t.companion.micButton} aria-expanded={voiceOpen} onClick={() => setVoiceOpen(true)}><span aria-hidden="true">✳</span></button>
              <button type="submit" className="px-3 py-1 rounded-md font-bold bg-accent text-accent-fg border border-transparent cursor-pointer">{t.companion.send}</button>
            </form>
          </div>
          {stt.supported && (
            <p className={`text-fs0 mt-1 ${stt.error || voiceError ? 'text-danger' : 'text-fg2'}`} role={stt.error || voiceError ? 'alert' : undefined}>
              {stt.error ?? voiceError ?? t.companion.micHint}
            </p>
          )}
          {!stt.supported && <p className="text-fs0 mt-1 text-fg2">{t.companion.micUnsupported}</p>}
          {tts.phase === 'speaking' && (
            <p className="text-fs0 mt-1 text-accent" role="status">🔊 Speaking…</p>
          )}
          {tts.phase === 'error' && (
            <p className="text-fs0 mt-1 text-danger" role="alert">TTS error: {tts.error}</p>
          )}
          {(tts.phase === 'downloading' || tts.phase === 'loading') && (
            <div className="border border-line rounded-md px-3 py-2 my-1 bg-bg3" role="alertdialog" aria-label="Loading speech model">
              <p className="text-fs1 font-semibold">🔊 Loading speech model…</p>
              <p className="text-fg2 text-fs0 mt-0.5">This happens once (~365 MB). Subsequent replies are instant.</p>
              {tts.progress && (
                <div className="mt-2">
                  <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${tts.progress.percent}%` }} />
                  </div>
                  <p className="text-fg2 text-fs0 mt-1">{tts.progress.percent}% {tts.progress.label && `· ${tts.progress.label}`}</p>
                </div>
              )}
            </div>
          )}
          {voiceOpen && (
            <div className="border border-line rounded-md px-3 py-2 my-2 bg-bg3" role="dialog" aria-modal="true" aria-labelledby="voice-h">
              <h3 id="voice-h">{t.companion.voiceSheetTitle}</h3>
              <p className="text-fg2 text-fs0">{t.companion.voiceSheetBody}</p>
              {chipButtons(chips.slice(0, 4), 'simulated_voice', () => setVoiceOpen(false))}
              <button type="button" className="inline-flex items-center gap-1 px-2 py-1 text-fs0 rounded text-accent bg-transparent hover:underline" onClick={() => setVoiceOpen(false)}>{t.common.cancel}</button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
