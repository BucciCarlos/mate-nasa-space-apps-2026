import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { Fd30Conversation } from '../Fd30Conversation';
import { ExerciseDetail } from '../ExerciseDetail';
import { OWNER, freshPreview, previewReduce } from '../fd30';
import type { CrewId } from '../fd30';
import { scriptedAnswer } from '../fd30Chat';
import { exerciseFactsAt } from '../history/exerciseFacts';
import { dialogueClips } from './dialogueClips';
import { exerciseClipFile, exerciseDialogueClips } from './exerciseDialogue';

const TI = 'iss:crew-ti' as const, MO = 'iss:crew-mo' as const;
const wall = 1000;
const at = (iso: string) => Date.parse(iso.length === 5 ? `2027-03-10T${iso}:00Z` : `${iso}:00Z`);
const turnAt = (when: string) => ({ reply: 'exercise' as const, answer: { at: at(when), body: '', detail: 'exercise' as const } });
const stateAt = (when: string, crew: CrewId) => previewReduce(previewReduce(freshPreview(wall, 1), { type: 'seek', target: at(when), now: wall }), { type: 'select', crewId: crew });
const PROFILES: [CrewId, 'lucia' | 'tomas' | 'mei'][] = [[OWNER, 'lucia'], [TI, 'tomas'], [MO, 'mei']];
const APPROVED = {
  en: {
    lucia: 'Your FD30 ergometer session is recorded as completed, lasting 60 min. This is a simulated session record.',
    tomas: 'For your comparable ergometer sessions, the latest 4 median is 181 W. Your earlier 9-session reference median is 200 W. Difference: −19 W (−9.5%). This compares simulated power records and does not indicate a change in physical fitness.',
    mei: 'Your latest recorded session is FD29: 60 min on the ergometer, mean power 137 W. This is a fictional history record, separate from your FD30 reservation.',
  },
  es: {
    lucia: 'Tu sesión de ergómetro de FD30 figura como finalizada y duró 60 min. Es un registro de sesión simulado.',
    tomas: 'En tus sesiones comparables de ergómetro, la mediana de las últimas 4 es 181 W. La mediana propia de referencia de las 9 anteriores es 200 W. Diferencia: −19 W (−9,5 %). La comparación es entre registros simulados de potencia y no indica un cambio en tu condición física.',
    mei: 'Tu última sesión registrada es FD29: 60 min en ergómetro, potencia media de 137 W. Es un registro histórico ficticio, separado de tu reserva de FD30.',
  },
} as const;

describe('EXERCISE-VOICE02 spoken Exercise dialogues', () => {
  it('derives each approved case from existing records and selectors at 12:00 UTC', () => {
    expect(exerciseFactsAt(OWNER, at('12:00'))).toEqual({ profile: 'lucia', sessionId: 'iss:session-lf-1', fd: 30, minutes: 60 });
    expect(exerciseFactsAt(TI, at('12:00'))).toMatchObject({ profile: 'tomas', fd: 29, recentW: 181, referenceW: 200, differenceW: -19, differencePercent: -9.5, recentCount: 4, referenceCount: 9, protocolId: 'demo-steady-60.1', latestId: 'iss:history:ti:exercise-fd29' });
    expect(exerciseFactsAt(MO, at('12:00'))).toEqual({ profile: 'mei', sessionId: 'iss:history:mo:exercise-fd29', fd: 29, minutes: 60, powerW: 137 });
  });
  it('enables each pair through profile + session + received data, and maps its own files and guided destination', () => {
    for (const [crew, profile] of PROFILES) {
      const clips = exerciseDialogueClips(crew, turnAt('12:00'));
      expect(clips, crew).toMatchObject({ question: { voice: 'crew' }, answer: { voice: 'mate' }, highlight: 'exercise' });
      expect(clips!.question.url.endsWith(exerciseClipFile(profile, 'question')) && clips!.answer.url.endsWith(exerciseClipFile(profile, 'answer'))).toBe(true);
      expect(dialogueClips(crew, turnAt('12:00'))).toEqual(clips);
    }
    expect(exerciseDialogueClips(OWNER, turnAt('12:00'))!.opensExercise).toEqual({ sessionId: 'iss:session-lf-1', fd: 30, focus: 'session' });
    expect(exerciseDialogueClips(TI, turnAt('12:00'))!.opensExercise).toEqual({ sessionId: 'iss:history:ti:exercise-fd29', fd: 29, focus: 'comparison' });
    expect(exerciseDialogueClips(MO, turnAt('12:00'))!.opensExercise).toEqual({ sessionId: 'iss:history:mo:exercise-fd29', fd: 29, focus: 'session' });
  });
  it('is decided by the received records, not by a fixed hour', () => {
    // Lucía: only once the confirmed finish is received (11:30); live (10:41) and 11:29 are text only.
    for (const when of ['00:00', '10:30', '10:41', '11:29']) expect(exerciseDialogueClips(OWNER, turnAt(when)), when).toBeNull();
    for (const when of ['11:30', '11:31', '12:00', '23:59']) expect(exerciseDialogueClips(OWNER, turnAt(when)), when).not.toBeNull();
    // Tomás: from the receipt of his FD29 session (2027-03-09 09:00); the cohort before it does not match the approved figures.
    expect(exerciseDialogueClips(TI, turnAt('2027-03-09T08:59'))).toBeNull(); expect(exerciseDialogueClips(TI, turnAt('2027-03-09T09:00'))).not.toBeNull();
    // Mei: from the receipt of her FD29 session (2027-03-09 14:00); none of her FD30 reservation counts as a session.
    expect(exerciseDialogueClips(MO, turnAt('2027-03-09T13:59'))).toBeNull(); expect(exerciseDialogueClips(MO, turnAt('2027-03-09T14:00'))).not.toBeNull();
    for (const crew of [TI, MO]) for (const when of ['00:00', '05:55', '10:30', '13:00', '23:59']) expect(exerciseDialogueClips(crew, turnAt(when)), `${crew} ${when}`).not.toBeNull();
  });
  it('requires the exact intent, answer detail and a known profile', () => {
    expect(exerciseDialogueClips(OWNER, { reply: 'sleep', answer: { at: at('12:00'), body: '', detail: 'sleep' } })).toBeNull();
    expect(exerciseDialogueClips(OWNER, { reply: 'exercise', answer: { at: at('12:00'), body: '' } })).toBeNull();
    expect(exerciseDialogueClips(OWNER, { reply: 'exercise' })).toBeNull();
    expect(exerciseDialogueClips('iss:crew-xx' as CrewId, turnAt('12:00'))).toBeNull();
    // Sleep and Laboratory still route to their own selectors.
    expect(dialogueClips(OWNER, { reply: 'laboratory', answer: { at: at('11:45'), body: '', detail: 'laboratory' } })?.answer.id).toBe('blood-result');
    expect(dialogueClips(OWNER, { reply: 'sleep', answer: { at: at('05:55'), body: '', detail: 'sleep' } })?.answer.id).toBe('sleep-lucia-answer');
  });

  for (const lang of ['en', 'es'] as const) describe(lang, () => {
    const render = (state: ReturnType<typeof freshPreview>) => renderToStaticMarkup(createElement(I18nProvider, { locale: lang,
      children: createElement(Fd30Conversation, { profile: state.profiles[state.activeCrewId], character: 'Mate', time: at('23:59'), owner: state.activeCrewId,
        voice: { state: { status: 'idle', stage: null, key: null, error: null }, toggle: () => {} },
        logRef: { current: null }, onAsk: () => {}, onDraft: () => {}, onOpen: () => {} }) }));
    it('writes the approved text describing the same session as the English audio, in the interface language', () => {
      for (const [crew, profile] of PROFILES) {
        const body = scriptedAnswer(stateAt('12:00', crew), crew, at('12:00'), 'exercise', lang).body;
        expect(body.split('\n')[0], crew).toBe(APPROVED[lang][profile]);
      }
      // Tomás's comparison is against his own reference and never judges fitness.
      const tomas = APPROVED[lang].tomas;
      expect(tomas).not.toMatch(/improv|worse|better|decline|mejor|empeor|deterior/i);
    });
    it('keeps the generic answer (and no audio) when the records do not match: Lucía live and before the finish', () => {
      for (const when of ['10:41', '11:29']) {
        const state = previewReduce(stateAt(when, OWNER), { type: 'ask', owner: OWNER, text: 'How is my training going?', lang, now: wall });
        const body = state.profiles[OWNER].turns.at(-1)!.answer!.body;
        expect(body, when).not.toContain(APPROVED[lang].lucia);
        expect(render(state), when).not.toContain(lang === 'es' ? 'Audio en inglés' : 'Play audio');
      }
    });
    it('offers the audio control at 12:00 for the three profiles, without autoplay', () => {
      for (const [crew] of PROFILES) {
        const state = previewReduce(stateAt('12:00', crew), { type: 'ask', owner: crew, text: lang === 'es' ? '¿Cómo va mi entrenamiento?' : 'How is my training going?', lang, now: wall });
        expect(state.profiles[crew].turns.at(-1)!.reply).toBe('exercise');
        const html = render(state);
        expect(html, crew).toContain(lang === 'es' ? 'Audio en inglés' : 'Play audio');
        expect(html).not.toMatch(/<audio|autoplay|getUserMedia/i);
      }
    });
    it('opens the exact session or section for guided playback (view support) without touching state', () => {
      const detail = (crew: CrewId, target: { fd: number; focus: 'session' | 'comparison' } | null) => {
        const state = stateAt('12:00', crew), before = JSON.stringify(state);
        const html = renderToStaticMarkup(createElement(I18nProvider, { locale: lang, children: createElement(ExerciseDetail, { state, owner: crew, time: at('12:00'), asTable: false, onToggle: () => {}, highlight: false, target }) }));
        expect(JSON.stringify(state)).toBe(before);
        return html;
      };
      expect(detail(MO, { fd: 29, focus: 'session' })).toContain('data-exercise-selected="29"');
      expect(detail(MO, { fd: 29, focus: 'session' })).toContain('data-exercise-record="iss:history:mo:exercise-fd29"');
      const tomas = detail(TI, { fd: 29, focus: 'comparison' });
      expect(tomas).toContain('data-exercise-selected="29"'); expect(tomas).toContain('data-exercise-difference="-19"'); expect(tomas).toContain('id="exercise-comparison-h"');
      expect(detail(OWNER, { fd: 30, focus: 'session' })).toContain('data-exercise-selected="30"');
    });
  });
});
