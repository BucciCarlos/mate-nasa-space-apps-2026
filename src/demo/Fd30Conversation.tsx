import type { RefObject } from 'react';
import { toHash } from '../app/routes';
import { useLocale, useT } from '../i18n/I18nProvider';
import { CHAT_QUESTIONS, FD30_CHAT_TEXT } from '../i18n/fd30Chat';
import type { ProfileState } from './fd30';
import type { ChatDetail } from './fd30Chat';
import '../styles/fd30-chat.css';

export function Fd30Conversation({ profile, character, logRef, onAsk, onDraft, onOpen }: {
  profile: ProfileState; character: string; logRef: RefObject<HTMLDivElement>;
  onAsk: (text: string, input?: 'text' | 'simulated_voice') => void;
  onDraft: (text: string) => void; onOpen: (detail: ChatDetail) => void;
}) {
  const lang = useLocale(), messages = useT(), t = messages.fd30, c = FD30_CHAT_TEXT[lang];
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
      {profile.turns.map((turn, i) => {
        const text = FD30_CHAT_TEXT[turn.lang];
        const detail = turn.answer?.detail;
        return <div className="fd-chat-pair" key={i} lang={turn.lang}>
          <p className="fd-chat-user"><small>{turn.input === 'simulated_voice' ? text.transcription : t.you}</small>{turn.text}</p>
          <div className="fd-chat-answer"><small>{character}</small>
            {turn.answer && <small>{text.at(new Date(turn.answer.at).toISOString().slice(11, 16))}</small>}
            <p>{turn.answer?.body ?? (turn.reply === 'laboratory' ? t.labChatReply : turn.reply === 'exercise' ? t.exerciseChatReply : turn.reply === 'sleep' ? t.chatReply : t.fallback)}</p>
            {detail && <a className="fd-link" href={toHash({ view: 'fd30', page: detail })} onClick={e => { e.preventDefault(); onOpen(detail); }}>{text.detail[detail]}</a>}
          </div>
        </div>;
      })}
    </div>
    <div className="fd-chat-tools">
      <form onSubmit={e => { e.preventDefault(); onAsk(profile.draft); }}>
        <label className="sr-only" htmlFor="fd-ask">{t.ask}</label>
        <input id="fd-ask" value={profile.draft} placeholder={t.ask} onChange={e => onDraft(e.target.value)} />
        <button type="submit" disabled={!profile.draft.trim()} aria-label={t.send}>{t.send}</button>
      </form>
    </div>
  </>;
}
