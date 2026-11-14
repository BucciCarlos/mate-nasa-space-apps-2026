import { MateAvatar } from './MateAvatar';
import { useEffect, useRef, useState } from 'react';
import type { CompanionTurn, IntentId, InputMode, UiAction } from '../../state/types';
import { ONBOARD_MISSION_ID } from '../../state/types';
import { useApp } from '../../state/AppProvider';
import { selectCompanionPreferences, selectMonitoringProfile, selectOnboard } from '../../state/selectors';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { renderReply } from '../../i18n/companionText';
import { matchIntent } from '../../domain/companion/intents';
import { suggestedIntents, ALL_CHIPS, NOTICE_CHIPS } from '../../domain/companion/suggestions';
import { navigate } from '../../app/routes';
import { NoticeCard } from './NoticeCard';
import { SourceCard } from '../shared/SourceCard';
import { UserTextView } from '../shared/UserTextView';

export function CompanionPanel({ announce }: { announce: (text: string) => void }) {
  const { state, dispatch } = useApp();
  const t = useT();
  const locale = useLocale();
  const { conversation, notices, user } = selectOnboard(state);
  const preferences = selectCompanionPreferences(state, user.id);
  const stage = selectMonitoringProfile(state, user.id).stage ?? 'flight';
  const open = state.ui.companionOpen;
  const [text, setText] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const executedRef = useRef<Set<string>>(new Set());
  const latestNotice = notices.length > 0 ? notices[notices.length - 1] : null;
  const chips = suggestedIntents(state, ONBOARD_MISSION_ID);

  const ask = (intent: IntentId, mode: InputMode, raw: string | null) => {
    dispatch({ type: 'companion/asked', missionId: ONBOARD_MISSION_ID, input: { mode, text: raw ? { text: raw, lang: locale } : null, intent }, nowMs: Date.now() });
  };
  const submit = () => {
    const raw = text.trim();
    if (!raw) return;
    ask(matchIntent(raw), 'text', raw);
    setText('');
  };

  // Execute reply actions once, in order (02 §8.4)
  useEffect(() => {
    const pending = conversation.filter((c) => c.speaker === 'companion' && c.reply && !c.reply.executed && !executedRef.current.has(c.id));
    for (const turn of pending) {
      executedRef.current.add(turn.id);
      const reply = turn.reply!;
      let opened: string | null = null;
      for (const a of reply.actions) {
        switch (a.type) {
          case 'navigate': navigate(a.route); opened = a.route.view === 'onboard' ? t.shell.nav[a.route.page] : t.shell.perspective.ground; break;
          case 'select_range': dispatch({ type: 'ui/range_set', range: a.range }); break;
          case 'highlight': dispatch({ type: 'ui/highlight_set', target: a.target }); break;
          case 'clear_highlight': dispatch({ type: 'ui/highlight_set', target: null }); break;
          case 'open_source': dispatch({ type: 'ui/source_open', sourceId: a.sourceId }); break;
          case 'open_observation_form': dispatch({ type: 'ui/observation_prefill', prefill: a.prefill }); navigate({ view: 'onboard', page: 'observations' }); opened = t.shell.nav.observations; break;
        }
      }
      dispatch({ type: 'companion/actions_executed', missionId: ONBOARD_MISSION_ID, turnId: turn.id });
      if (reply.actions.length > 0) {
        announce(`${t.companion.actionsDone} ${reply.actions.map((a) => t.companion.action[a.type]).join(', ')}`);
        if (opened) window.setTimeout(() => document.getElementById('view-h')?.focus(), 50);
      }
    }
  }, [conversation, dispatch, announce, t]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [conversation.length, open]);

  const actionLabel = (a: UiAction) => t.companion.action[a.type];
  const chipButtons = (list: IntentId[], mode: InputMode, after?: () => void) => (
    <div className="chips" role="group" aria-label={t.a11y.chips}>
      {list.map((i) => (
        <button key={i} type="button" className="chip" onClick={() => { ask(i, mode, t.intents[i]); after?.(); }}>{t.intents[i]}</button>
      ))}
    </div>
  );

  const renderTurn = (c: CompanionTurn) => {
    if (c.speaker === 'user' && c.input) {
      return (
        <div key={c.id} className="turn turn-user">
          <span className="turn-who">{t.companion.you}</span>
          {c.input.mode === 'simulated_voice' && <span className="tag">🎙 {t.companion.voiceTag}</span>}
          {c.input.mode === 'chip' && <span className="tag">{t.companion.chipTag}</span>}
          <p>{c.input.text ? <UserTextView text={c.input.text} /> : t.intents[c.input.intent]}</p>
        </div>
      );
    }
    if (c.speaker === 'companion' && c.reply) {
      const r = c.reply;
      return (
        <div key={c.id} className={`turn turn-companion status-${r.status}`}>
          <span className="turn-who">{preferences.name}</span>
          {r.status === 'no_evidence' && <span className="status status-noEvidence">{t.companion.noEvidence}</span>}
          {r.status === 'unavailable' && <span className="status status-noEvidence">{t.companion.unavailable}</span>}
          <p>{renderReply(r, state, ONBOARD_MISSION_ID, locale, t)}</p>
          {r.status === 'not_understood' && chipButtons(ALL_CHIPS, 'chip')}
          {r.templateId === 'noComparableRecords' && chipButtons(['observation.start'], 'chip')}
          {r.sourceIds.length > 0 && (
            <div className="turn-sources">
              <span className="muted small">{t.companion.sources}:</span>
              {r.sourceIds.map((id) => (
                <button key={id} type="button" className="badge badge-nasaResource" onClick={() => dispatch({ type: 'ui/source_open', sourceId: id })}><span aria-hidden="true">◆</span> {t.provenance.nasaResource}</button>
              ))}
            </div>
          )}
          {r.executed && r.actions.length > 0 && (
            <p className="muted small turn-actions">{t.companion.actionsDone} {r.actions.map(actionLabel).join(' · ')}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <aside className={`companion${open ? ' is-open' : ' is-collapsed'} color-${preferences.color}`} aria-label={t.companion.panelTitle({ name: preferences.name })}>
      <div className="companion-heading">
        <MateAvatar preferences={preferences} stage={stage} />
        <span className="companion-toggle-text">{t.companion.panelTitle({ name: preferences.name })}</span>
        <button type="button" id="companion-toggle" className="companion-toggle" aria-expanded={open} aria-controls={open ? 'companion-body' : undefined} aria-label={open ? t.companion.closePanel : t.companion.openPanel} onClick={() => dispatch({ type: 'ui/companion_toggle' })}>
          <span aria-hidden="true">{open ? '⌄' : '⌃'}</span>
        </button>
      </div>
      {open && (
        <div className="companion-body" id="companion-body">
          <details className="companion-info">
            <summary>{t.companion.about}</summary>
            <p className="small">{t.monitoring.guided} · {t.monitoring.stages[stage]}</p>
            <p className="small">{t.companion.limitations}</p>
          </details>
          {conversation.length === 0 && <p className="companion-welcome">{t.companion.intro({ name: user.name.split(/\s+/)[0] || user.name })}</p>}
          <div className="companion-scroll" ref={scrollRef} role="log" aria-label={t.a11y.conversation}>
            {latestNotice && !latestNotice.seen && <NoticeCard notice={latestNotice} chips={chipButtons(NOTICE_CHIPS, 'chip')} />}
            {conversation.map(renderTurn)}
          </div>
          {state.ui.openSourceId && (
            <div className="companion-source">
              <SourceCard sourceId={state.ui.openSourceId} autoFocus onClose={() => dispatch({ type: 'ui/source_open', sourceId: null })} />
            </div>
          )}
          <div className="companion-input">
            <span className="muted small">{t.companion.suggestions}</span>
            {chipButtons(chips, 'chip')}
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="ask-row">
              <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.companion.askPlaceholder({ name: preferences.name })} aria-label={t.companion.askPlaceholder({ name: preferences.name })} lang={locale} />
              <button type="button" className="btn btn-ghost" aria-label={t.companion.micButton} aria-expanded={voiceOpen} onClick={() => setVoiceOpen(true)}><span aria-hidden="true">🎙</span></button>
              <button type="submit" className="btn btn-primary">{t.companion.send}</button>
            </form>
          </div>
          {voiceOpen && (
            <div className="voice-sheet" role="dialog" aria-modal="true" aria-labelledby="voice-h">
              <h3 id="voice-h">{t.companion.voiceSheetTitle}</h3>
              <p className="muted small">{t.companion.voiceSheetBody}</p>
              <div className="wave" aria-hidden="true"><span /><span /><span /><span /><span /></div>
              {chipButtons(chips.slice(0, 4), 'simulated_voice', () => setVoiceOpen(false))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVoiceOpen(false)}>{t.common.cancel}</button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
