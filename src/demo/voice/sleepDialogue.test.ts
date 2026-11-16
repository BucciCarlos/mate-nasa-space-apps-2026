import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { SLEEP_SCORE_TEXT } from '../../views/history/sleep/sleepScoreText';
import { SleepDetail } from '../../views/history/sleep/SleepDetail';
import { Fd30Conversation } from '../Fd30Conversation';
import { OWNER, freshPreview, previewReduce } from '../fd30';
import type { CrewId } from '../fd30';
import { scriptedAnswer } from '../fd30Chat';
import { dialogueClips } from './dialogueClips';
import { latestNightAt, sleepClipFile, sleepDialogueClips } from './sleepDialogue';

const TI = 'iss:crew-ti' as const, MO = 'iss:crew-mo' as const;
const wall = 1000;
const at = (iso: string) => Date.parse(iso.length === 5 ? `2027-03-10T${iso}:00Z` : `${iso}:00Z`);
const turnAt = (when: string) => ({ reply: 'sleep' as const, answer: { at: at(when), body: '', detail: 'sleep' as const } });
const stateAt = (when: string, crew: CrewId) => previewReduce(previewReduce(freshPreview(wall, 1), { type: 'seek', target: at(when), now: wall }), { type: 'select', crewId: crew });
const APPROVED: [CrewId, string, string, number][] = [[OWNER, 'lucia', '6:35', 71], [TI, 'tomas', '7:10', 82], [MO, 'mei', '7:25', 93]];

describe('SLEEP-VOICE03 spoken Sleep dialogues', () => {
  it('enables each approved pair at 05:55 UTC only through profile + latest received night, all FD29', () => {
    for (const [crew, profile] of APPROVED) {
      const clips = sleepDialogueClips(crew, turnAt('05:55'));
      expect(clips, crew).toMatchObject({ question: { voice: 'crew' }, answer: { voice: 'mate' }, highlight: 'sleep', opensSleepFd: 29 });
      expect(clips!.question.url.endsWith(sleepClipFile(profile as 'lucia', 'question'))).toBe(true);
      expect(clips!.answer.url.endsWith(sleepClipFile(profile as 'lucia', 'answer'))).toBe(true);
      expect(latestNightAt(crew, at('05:55'))!.fd).toBe(29);
      expect(dialogueClips(crew, turnAt('05:55'))).toEqual(clips); // the shared entry point routes Sleep turns here
    }
  });
  it('is decided by the received night, not by a fixed hour', () => {
    // Lucía: FD29 from its receipt (2027-03-09 05:56) until FD30 arrives at 06:00; before that her latest night is FD28.
    expect(sleepDialogueClips(OWNER, turnAt('2027-03-09T05:55'))).toBeNull();
    expect(sleepDialogueClips(OWNER, turnAt('2027-03-09T05:56'))).not.toBeNull();
    for (const when of ['00:00', '05:59']) expect(sleepDialogueClips(OWNER, turnAt(when)), when).not.toBeNull();
    // Tomás and Mei: FD29 from their own receipts, for the whole demo day; they never get FD30.
    expect(sleepDialogueClips(TI, turnAt('2027-03-09T06:02'))).toBeNull(); expect(sleepDialogueClips(TI, turnAt('2027-03-09T06:03'))).not.toBeNull();
    expect(sleepDialogueClips(MO, turnAt('2027-03-09T05:57'))).toBeNull(); expect(sleepDialogueClips(MO, turnAt('2027-03-09T05:58'))).not.toBeNull();
    for (const crew of [TI, MO]) for (const when of ['00:00', '05:55', '06:00', '23:59']) expect(sleepDialogueClips(crew, turnAt(when)), `${crew} ${when}`).not.toBeNull();
  });
  it('has no clip when Lucía receives FD30 at 06:00 (6:25 without score): text only, not even the question', () => {
    for (const when of ['06:00', '06:01', '11:50', '23:59']) {
      expect(latestNightAt(OWNER, at(when))).toMatchObject({ fd: 30, durationMinutes: 385 });
      expect(sleepDialogueClips(OWNER, turnAt(when)), when).toBeNull();
    }
  });
  it('requires the exact profile, intent and answer detail', () => {
    expect(sleepDialogueClips(OWNER, { reply: 'laboratory', answer: { at: at('05:55'), body: '', detail: 'laboratory' } })).toBeNull();
    expect(sleepDialogueClips(OWNER, { reply: 'sleep', answer: { at: at('05:55'), body: '' } })).toBeNull();
    expect(sleepDialogueClips(OWNER, { reply: 'sleep' })).toBeNull();
    expect(sleepDialogueClips('iss:crew-xx' as CrewId, turnAt('05:55'))).toBeNull();
    // Lab turns keep their own selector through the shared entry point.
    expect(dialogueClips(OWNER, { reply: 'laboratory', answer: { at: at('11:45'), body: '', detail: 'laboratory' } })?.answer.id).toBe('blood-result');
  });

  for (const lang of ['en', 'es'] as const) describe(lang, () => {
    const st = SLEEP_SCORE_TEXT[lang];
    const render = (state: ReturnType<typeof freshPreview>, time: number) => renderToStaticMarkup(createElement(I18nProvider, { locale: lang,
      children: createElement(Fd30Conversation, { profile: state.profiles[state.activeCrewId], character: 'Mate', time, owner: state.activeCrewId,
        voice: { state: { status: 'idle', stage: null, key: null, error: null }, toggle: () => {} },
        logRef: { current: null }, onAsk: () => {}, onDraft: () => {}, onOpen: () => {} }) }));
    it('writes the same night, duration and score as the detail, and the approved text matches the audio summary', () => {
      for (const [crew, , length, score] of APPROVED) {
        const state = stateAt('05:55', crew);
        const body = scriptedAnswer(state, crew, at('05:55'), 'sleep', lang).body;
        expect(body.split('\n')[0], crew).toBe(st.chatScore('FD29', length, score));
        const detail = renderToStaticMarkup(createElement(I18nProvider, { locale: lang, children: createElement(SleepDetail, { state, owner: crew, time: at('05:55') }) }));
        expect(detail).toContain(`data-sleep-score="${score}"`); // the detail's own calculation
        expect(detail).toContain(`data-sleep-score-fd="29"`);
      }
    });
    it('shows 6:25 without score for Lucía at 06:00 and never borrows another night\'s 71', () => {
      const state = stateAt('06:00', OWNER), body = scriptedAnswer(state, OWNER, at('06:00'), 'sleep', lang).body;
      expect(body.split('\n')[0]).toBe(st.chatNoScore('FD30', '6:25', st.chatReason.missingBed));
      expect(body).not.toMatch(/71/);
      expect(body).not.toContain(lang === 'es' ? 'Puntaje de demostración' : 'Demonstration score');
    });
    it('offers the audio control at 05:55 for the three profiles, and none for the 06:00 query', () => {
      for (const [crew] of APPROVED) {
        const state = previewReduce(stateAt('05:55', crew), { type: 'ask', owner: crew, text: lang === 'es' ? '¿Cómo dormí anoche?' : 'How did I sleep last night?', lang, now: wall });
        expect(state.profiles[crew].turns.at(-1)!.reply).toBe('sleep');
        const html = render(state, at('23:59'));
        expect(html, crew).toContain(lang === 'es' ? 'Audio en inglés' : 'Play audio');
        expect(html).not.toMatch(/<audio|autoplay|getUserMedia/i);
      }
      const late = previewReduce(stateAt('06:00', OWNER), { type: 'ask', owner: OWNER, text: lang === 'es' ? '¿Cómo dormí anoche?' : 'How did I sleep last night?', lang, now: wall });
      expect(render(late, at('23:59'))).not.toContain(lang === 'es' ? 'Audio en inglés' : 'Play audio');
      expect(late.profiles[OWNER].turns.at(-1)!.answer!.body).toContain('FD30');
    });
    it('highlights the Sleep access only while the answer really plays and never rewrites the player stage', () => {
      const state = previewReduce(stateAt('05:55', TI), { type: 'ask', owner: TI, text: 'How did I sleep last night?', lang, now: wall });
      const html = (stage: 'question' | 'answer') => renderToStaticMarkup(createElement(I18nProvider, { locale: lang,
        children: createElement(Fd30Conversation, { profile: state.profiles[TI], character: 'Mate', time: at('23:59'), owner: TI,
          voice: { state: { status: 'playing', stage, key: `${TI}:0`, error: null }, toggle: () => {} },
          logRef: { current: null }, onAsk: () => {}, onDraft: () => {}, onOpen: () => {} }) }));
      expect(html('answer')).toContain('data-voice-focus="true"');
      expect(html('question')).not.toContain('data-voice-focus');
    });
  });
});
