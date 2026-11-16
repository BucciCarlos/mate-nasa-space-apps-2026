import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useLocale, useT } from '../i18n/I18nProvider';
import { CHAT_QUESTIONS, FD30_CHAT_TEXT } from '../i18n/fd30Chat';
import { useSpeechToText } from './useSpeechToText';
// Clean React Router paths (this app uses BrowserRouter, not upstream hash routes).
const DETAIL_PATH: Record<string, string> = { agenda: '/demo/fd30/agenda', exercise: '/onboard/personal/exercise', laboratory: '/onboard/personal/laboratory', sleep: '/onboard/personal/sleep' };
import type { ProfileState } from './fd30';
import type { ChatDetail } from './fd30Chat';
import '../styles/fd30-chat.css';

export function Fd30Conversation({ profile, character, logRef, onAsk, onDraft, onOpen, onAskAgent }: {
  profile: ProfileState; character: string; logRef: RefObject<HTMLDivElement>;
  onAsk: (text: string, input?: 'text' | 'simulated_voice' | 'voice') => void;
  onDraft: (text: string) => void; onOpen: (detail: ChatDetail) => void;
  /** Typed + voice input goes through the backend agent (fresh conversation per question).
   *  Returns the reply text, or null if the agent was unreachable. */
  onAskAgent: (text: string, lang: 'en' | 'es', input: 'text' | 'voice') => Promise<string | null>;
}) {
  const lang = useLocale(), messages = useT(), t = messages.fd30, c = FD30_CHAT_TEXT[lang];
  const stt = useSpeechToText(() => lang);
  const agentBusy = useRef(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const askAgent = useCallback(async (text: string, input: 'text' | 'voice') => {
    if (agentBusy.current) return;
    agentBusy.current = true;
    setAgentError(null);
    const reply = await onAskAgent(text, lang, input);
    if (reply === null) setAgentError(FD30_CHAT_TEXT[lang].agentFallback);
    agentBusy.current = false;
  }, [lang, onAskAgent]);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const askVoice = async () => {
    setVoiceError(null);
    try {
      if (stt.phase === 'recording') {
        const text = await stt.transcribe();
        if (text) void askAgent(text, 'voice');
        return;
      }
      await stt.start();
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : c.micError('unknown error'));
    }
  };
  const micLabel = stt.phase === 'recording' ? c.micRecording : stt.phase === 'transcribing' ? c.micTranscribing : stt.phase === 'loading' ? c.micLoading : stt.phase === 'ready' ? c.micReady : c.micHint;
  const micDisabled = !stt.supported || stt.phase === 'loading' || stt.phase === 'transcribing';
  return <>
    <div className="fd-chat-log" ref={logRef} role="log" aria-label={messages.a11y.conversation}>
      <p className="fd-chat-intro">{c.simulated}</p>
      <div className="fd-chat-suggestions" role="group" aria-label={c.suggestions}>
        {CHAT_QUESTIONS.map(intent => <button type="button" key={intent} onClick={() => onAsk(c[intent])}>{c[intent]}</button>)}
      </div>
      <details className="fd-chat-voice">
        <summary>{c.voice}</summary><p>{c.voiceHint}</p>
        {CHAT_QUESTIONS.map(intent => <button type="button" key={intent} onClick={() => onAsk(c[intent], 'simulated_voice')}>{c[intent]}</button>)}
      </details>
      <div className="fd-chat-mic">
        <p>{c.mic}</p><p className="fd-chat-mic-hint">{stt.supported ? c.micHint : c.micUnsupported}</p>
        {stt.supported && <button type="button" onClick={() => { void askVoice(); }} disabled={micDisabled} aria-label={micLabel}
          className={`fd-chat-mic-btn ${stt.phase === 'recording' ? 'fd-chat-mic-btn-recording' : ''}`}>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><rect x="8" y="2.5" width="4" height="8.5" rx="2" fill="currentColor" /><path d="M5 9.5a5 5 0 0 0 10 0M10 14.5V17.5M7.5 17.5H12.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <span>{micLabel}</span>
        </button>}
        {(stt.error || voiceError) && <p className="fd-chat-mic-error" role="alert">{stt.error ?? voiceError}</p>}
        {agentError && <p className="fd-chat-mic-error" role="alert">{agentError}</p>}
      </div>
      {profile.turns.map((turn, i) => {
        const text = FD30_CHAT_TEXT[turn.lang];
        const detail = turn.answer?.detail;
        const youLabel = turn.input === 'simulated_voice' ? text.transcription : turn.input === 'voice' ? text.voiceTranscription : t.you;
        const agent = turn.input === 'voice' || turn.input === 'text' || turn.replyText !== undefined;
        const scripted = turn.answer?.body ?? (turn.reply === 'laboratory' ? t.labChatReply : turn.reply === 'exercise' ? t.exerciseChatReply : turn.reply === 'sleep' ? t.chatReply : t.fallback);
        return <div className="fd-chat-pair" key={i} lang={turn.lang}>
          <p className="fd-chat-user"><small>{youLabel}</small>{turn.text}</p>
          {agent ? <div className="fd-chat-answer"><small>{character} · {text.agent}</small>
            <p className="fd-chat-agent">{turn.replyText ?? text.agentFallback}</p>
          </div> : <div className="fd-chat-answer"><small>{character}</small>
            {turn.answer && <small>{text.at(new Date(turn.answer.at).toISOString().slice(11, 16))}</small>}
            <p>{scripted}</p>
            {detail && <a className="fd-link" href={DETAIL_PATH[detail] ?? '#'} onClick={e => { e.preventDefault(); onOpen(detail); }}>{text.detail[detail]}</a>}
          </div>}
        </div>;
      })}
    </div>
    <div className="fd-chat-tools">
      <form onSubmit={e => {
        e.preventDefault();
        const text = profile.draft.trim();
        if (!text) return;
        onDraft('');
        onAsk(text, 'text');
        void askAgent(text, 'text');
      }}>
        <label className="sr-only" htmlFor="fd-ask">{t.ask}</label>
        <input id="fd-ask" value={profile.draft} placeholder={t.ask} onChange={e => onDraft(e.target.value)} />
        <button type="submit" disabled={!profile.draft.trim()} aria-label={t.send}>{t.send}</button>
      </form>
    </div>
  </>;
}
