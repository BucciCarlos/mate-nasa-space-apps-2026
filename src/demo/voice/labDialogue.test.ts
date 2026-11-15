import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { FD30_CHAT_TEXT } from '../../i18n/fd30Chat';
import { Fd30Conversation } from '../Fd30Conversation';
import { OWNER, freshPreview, previewReduce } from '../fd30';
import { labDialogueClips, labStateAt, sampleStateAt, LAB_ANALYZING_FILE, LAB_BLOOD_RESULT_FILE, LAB_BOTH_RESULTS_FILE, LAB_QUESTION_FILE, LAB_WAITING_FILE, MEI_ANSWER_FILE, MEI_QUESTION_FILE, TOMAS_ANSWER_FILE, TOMAS_QUESTION_FILE } from './labDialogue';
import { BLOOD_SAMPLE, MO_URINE_SAMPLE, TI_BLOOD_SAMPLE, URINE_SAMPLE } from '../laboratory';

const TI = 'iss:crew-ti' as const, MO = 'iss:crew-mo' as const;
const wall = 1000;
const at = (hhmm: string) => Date.parse(`2027-03-10T${hhmm}:00Z`);
const seek = (s: ReturnType<typeof freshPreview>, hhmm: string) => previewReduce(s, { type: 'seek', target: at(hhmm), now: wall });
const ask = (s: ReturnType<typeof freshPreview>, lang: 'en' | 'es') => previewReduce(s, { type: 'ask', owner: s.activeCrewId, text: FD30_CHAT_TEXT[lang].laboratory, lang, now: wall, input: 'text' });
const lastTurn = (s: ReturnType<typeof freshPreview>) => s.profiles[s.activeCrewId].turns.at(-1)!;
const turnAt = (hhmm: string) => ({ reply: 'laboratory' as const, answer: { at: at(hhmm), body: '', detail: 'laboratory' as const } });

describe('VOICE06/07 laboratory dialogue eligibility', () => {
  it('is enabled only for the pair blood result + urine analysis, by state and not by a fixed hour', () => {
    for (const hhmm of ['11:45', '11:46', '11:49']) {
      const clips = labDialogueClips(OWNER, turnAt(hhmm));
      expect(clips, hhmm).not.toBeNull();
      expect(clips!.question.url.endsWith(LAB_QUESTION_FILE)).toBe(true);
      expect(clips!.answer.url.endsWith(LAB_BLOOD_RESULT_FILE)).toBe(true);
      expect(clips).toMatchObject({ question: { voice: 'crew' }, answer: { voice: 'mate' } });
    }
    expect(labStateAt(OWNER, at('11:45'), 'blood')).toBe('result');
    expect(labStateAt(OWNER, at('11:45'), 'urine')).toBe('analyzing');
  });
  it('maps each exact (blood, urine) pair to its clip, by state and not by a fixed hour', () => {
    const expected: [string, string, string, boolean, string | undefined][] = [
      // time, state pair, file, result available, sample a guided playback may open (undefined = none)
      ['00:00', 'waiting|waiting', LAB_WAITING_FILE, false, undefined], ['05:55', 'waiting|waiting', LAB_WAITING_FILE, false, undefined], ['09:14', 'waiting|waiting', LAB_WAITING_FILE, false, undefined],
      ['09:30', 'analyzing|analyzing', LAB_ANALYZING_FILE, false, undefined], ['10:41', 'analyzing|analyzing', LAB_ANALYZING_FILE, false, undefined], ['11:44', 'analyzing|analyzing', LAB_ANALYZING_FILE, false, undefined],
      ['11:45', 'result|analyzing', LAB_BLOOD_RESULT_FILE, true, BLOOD_SAMPLE], ['11:49', 'result|analyzing', LAB_BLOOD_RESULT_FILE, true, BLOOD_SAMPLE],
      ['11:50', 'result|result', LAB_BOTH_RESULTS_FILE, true, undefined], ['23:59', 'result|result', LAB_BOTH_RESULTS_FILE, true, undefined],
    ];
    for (const [hhmm, pair, file, resultAvailable, opens] of expected) {
      const [blood, urine] = pair.split('|');
      expect([labStateAt(OWNER, at(hhmm), 'blood'), labStateAt(OWNER, at(hhmm), 'urine')], hhmm).toEqual([blood, urine]);
      const clips = labDialogueClips(OWNER, turnAt(hhmm));
      expect(clips, hhmm).toMatchObject({ question: { voice: 'crew' }, answer: { voice: 'mate' }, resultAvailable });
      expect(clips!.opensSampleId, hhmm).toBe(opens);
      expect(clips!.question.url.endsWith(LAB_QUESTION_FILE), hhmm).toBe(true); // the VOICE06 question is reused for every pair
      expect(clips!.answer.url.endsWith(file), hhmm).toBe(true);
    }
  });
  it('has no clips for intermediate pairs: text only, and not even the question', () => {
    for (const hhmm of ['09:15', '09:19', '09:20', '09:24', '09:25', '09:29']) expect(labDialogueClips(OWNER, turnAt(hhmm)), hhmm).toBeNull();
    expect([labStateAt(OWNER, at('09:15'), 'blood'), labStateAt(OWNER, at('09:15'), 'urine')]).toEqual(['collected', 'waiting']);
    expect([labStateAt(OWNER, at('09:20'), 'blood'), labStateAt(OWNER, at('09:20'), 'urine')]).toEqual(['analyzing', 'waiting']);
    expect([labStateAt(OWNER, at('09:25'), 'blood'), labStateAt(OWNER, at('09:25'), 'urine')]).toEqual(['analyzing', 'collected']);
  });
  it('never opens a sample by default: only an answer that names ONE own sample with its result may open it', () => {
    const opening = ['00:00', '09:30', '11:44', '11:45', '11:49', '11:50', '23:59'].filter(h => labDialogueClips(OWNER, turnAt(h))?.opensSampleId);
    expect(opening).toEqual(['11:45', '11:49']);
    expect(labDialogueClips(OWNER, turnAt('11:45'))!.opensSampleId).toBe(BLOOD_SAMPLE);
    expect(labDialogueClips(TI, turnAt('15:45'))!.opensSampleId).toBe(TI_BLOOD_SAMPLE);
    expect(labDialogueClips(MO, turnAt('16:20'))!.opensSampleId).toBeUndefined(); // Mei: nothing opens automatically
    // No clip may ever name a sample that is not its owner's.
    for (const [owner, ids] of [[OWNER, [BLOOD_SAMPLE]], [TI, [TI_BLOOD_SAMPLE]], [MO, []]] as const) for (const h of ['11:45', '15:45', '16:20', '23:59']) {
      const id = labDialogueClips(owner, turnAt(h))?.opensSampleId; if (id) expect(ids as readonly string[]).toContain(id);
    }
  });
  it('gives Tomás audio only when his own blood sample has result availability reported, by sample and state', () => {
    for (const hhmm of ['00:00', '05:55', '11:50', '13:14', '13:15', '13:19', '13:20', '15:44']) expect(labDialogueClips(TI, turnAt(hhmm)), hhmm).toBeNull();
    for (const hhmm of ['15:45', '15:46', '23:59']) {
      const clips = labDialogueClips(TI, turnAt(hhmm));
      expect(clips, hhmm).toMatchObject({ question: { id: 'tomas-question', voice: 'crew' }, answer: { id: 'tomas-answer', voice: 'mate' }, resultAvailable: true, opensSampleId: TI_BLOOD_SAMPLE });
      expect(clips!.question.url.endsWith(TOMAS_QUESTION_FILE) && clips!.answer.url.endsWith(TOMAS_ANSWER_FILE), hhmm).toBe(true);
    }
    expect(['13:14', '13:15', '13:20', '15:44', '15:45'].map(h => sampleStateAt(TI, at(h), TI_BLOOD_SAMPLE))).toEqual(['waiting', 'collected', 'analyzing', 'analyzing', 'result']);
  });
  it('gives Mei audio only while her own urine sample is in analysis with no result', () => {
    for (const hhmm of ['00:00', '05:55', '09:30', '11:50', '16:14', '16:15', '16:19']) expect(labDialogueClips(MO, turnAt(hhmm)), hhmm).toBeNull();
    for (const hhmm of ['16:20', '16:21', '23:59']) {
      const clips = labDialogueClips(MO, turnAt(hhmm));
      expect(clips, hhmm).toMatchObject({ question: { id: 'mei-question', voice: 'crew' }, answer: { id: 'mei-answer', voice: 'mate' }, resultAvailable: false });
      expect(clips!.question.url.endsWith(MEI_QUESTION_FILE) && clips!.answer.url.endsWith(MEI_ANSWER_FILE), hhmm).toBe(true);
    }
    expect(['16:14', '16:15', '16:20', '23:59'].map(h => sampleStateAt(MO, at(h), MO_URINE_SAMPLE))).toEqual(['waiting', 'collected', 'analyzing', 'analyzing']);
  });
  it('isolates profiles by sample: a state of another profile or of Lucía never enables a clip', () => {
    // At 11:45 Lucía has audio (her blood result), Tomás and Mei do not (their own samples are not in the required state).
    expect(labDialogueClips(OWNER, turnAt('11:45'))).not.toBeNull();
    for (const crew of [TI, MO]) expect(labDialogueClips(crew, turnAt('11:45')), crew).toBeNull();
    // At 15:45 Tomás has audio, Lucía (both results -> her own clip) and Mei (still waiting) never get Tomás's files.
    expect(labDialogueClips(OWNER, turnAt('15:45'))!.answer.url.endsWith(LAB_BOTH_RESULTS_FILE)).toBe(true);
    expect(labDialogueClips(MO, turnAt('15:45'))).toBeNull();
    // A sample ID is only ever evaluated for its owner.
    expect(sampleStateAt(OWNER, at('23:59'), TI_BLOOD_SAMPLE)).toBe('waiting');
    expect(sampleStateAt(TI, at('23:59'), BLOOD_SAMPLE)).toBe('waiting');
    expect(sampleStateAt(TI, at('23:59'), URINE_SAMPLE)).toBe('waiting');
    expect(sampleStateAt(MO, at('23:59'), TI_BLOOD_SAMPLE)).toBe('waiting');
  });
  it('has no clips for other intents or an answer without the laboratory detail', () => {
    expect(labDialogueClips(OWNER, { reply: 'exercise', answer: { at: at('11:45'), body: '', detail: 'exercise' } })).toBeNull();
    expect(labDialogueClips(OWNER, { reply: 'laboratory', answer: { at: at('11:45'), body: '' } })).toBeNull();
    expect(labDialogueClips(OWNER, { reply: 'laboratory' })).toBeNull();
  });
  for (const lang of ['en', 'es'] as const) describe(lang, () => {
    const t = FD30_CHAT_TEXT[lang];
    const render = (state: ReturnType<typeof freshPreview>, withVoice = true) => renderToStaticMarkup(createElement(I18nProvider, { locale: lang,
      children: createElement(Fd30Conversation, { profile: state.profiles[state.activeCrewId], character: 'Mate', time: at('23:59'), owner: state.activeCrewId,
        voice: withVoice ? { state: { status: 'idle', stage: null, key: null, error: null }, toggle: () => {} } : undefined,
        logRef: { current: null }, onAsk: () => {}, onDraft: () => {}, onOpen: () => {} }) }));
    it('binds the spoken pair to the written answer at the query: control present, English audio label, no autoplay', () => {
      const state = ask(seek(freshPreview(wall), '11:45'), lang);
      expect(lastTurn(state).answer!.body).toContain(`${t.blood}: ${t.labResult}`);
      expect(lastTurn(state).answer!.body).toContain(`${t.urine}: ${t.labAnalyzing}`);
      const html = render(state);
      expect(html).toContain(t.voiceNote);
      expect(html).toContain(lang === 'es' ? 'Audio en inglés' : 'Play audio'); // English audio in both languages
      expect(html).toContain(t.labResult); // the written answer stays complete and localized
      expect(html).not.toMatch(/<audio|autoplay|getUserMedia/i);
      expect(render(state, false)).not.toContain(t.voiceNote); // no voice controller -> text only
    });
    it('shows the audio control for the four exact pairs and none for intermediate states, Tomás or Mei', () => {
      for (const hhmm of ['05:55', '09:30', '11:45', '11:50']) expect(render(ask(seek(freshPreview(wall), hhmm), lang)), hhmm).toContain(t.voiceNote);
      for (const hhmm of ['09:15', '09:20', '09:25']) expect(render(ask(seek(freshPreview(wall), hhmm), lang)), hhmm).not.toContain(t.voiceNote);
      // Tomás and Mei: audio control only in their own compatible state; the written answer is their own (never Lucía's).
      const own = (crew: typeof TI | typeof MO, hhmm: string) => ask(previewReduce(seek(freshPreview(wall), hhmm), { type: 'select', crewId: crew }), lang);
      for (const [crew, hhmm, audio] of [[TI, '15:44', false], [TI, '15:45', true], [MO, '16:19', false], [MO, '16:20', true], [TI, '11:45', false], [MO, '11:45', false]] as const) {
        const state = own(crew, hhmm);
        expect(lastTurn(state).answer!.body, `${crew} ${hhmm}`).not.toContain(t.noLabs);
        expect(render(state).includes(t.voiceNote), `${crew} ${hhmm}`).toBe(audio);
        expect(!!labDialogueClips(crew, lastTurn(state)), `${crew} ${hhmm}`).toBe(audio);
      }
    });
    it('highlights the result access by the answer, not by rewriting the real player stage', () => {
      const html = (crew: typeof TI | typeof MO, hhmm: string, stage: 'question' | 'answer') => {
        const state = ask(previewReduce(seek(freshPreview(wall), hhmm), { type: 'select', crewId: crew }), lang);
        return renderToStaticMarkup(createElement(I18nProvider, { locale: lang,
          children: createElement(Fd30Conversation, { profile: state.profiles[crew], character: 'Mate', time: at('23:59'), owner: crew,
            voice: { state: { status: 'playing', stage, key: `${crew}:0`, error: null }, toggle: () => {} },
            logRef: { current: null }, onAsk: () => {}, onDraft: () => {}, onOpen: () => {} }) }));
      };
      expect(html(TI, '15:45', 'answer')).toContain('data-voice-focus="true"'); // Tomás: result availability reported
      expect(html(TI, '15:45', 'question')).not.toContain('data-voice-focus'); // the question is never marked
      expect(html(MO, '16:20', 'answer')).not.toContain('data-voice-focus'); // Mei: analysis, no result -> nothing implies one
      expect(html(MO, '16:20', 'answer')).toContain(t.voiceStopAudio); // but the control reflects the real stage
    });
    it('does not use a rewound cursor: the pair is fixed by the query time', () => {
      const state = seek(ask(seek(freshPreview(wall), '11:45'), lang), '09:00');
      expect(labDialogueClips(OWNER, lastTurn(state))).not.toBeNull();
    });
    it('marks the existing laboratory access while Mate speaks and shows an error without losing the text', () => {
      const state = ask(seek(freshPreview(wall), '11:45'), lang);
      const key = `${OWNER}:0`;
      const html = (status: 'playing' | 'error', stage: 'question' | 'answer') => renderToStaticMarkup(createElement(I18nProvider, { locale: lang,
        children: createElement(Fd30Conversation, { profile: state.profiles[OWNER], character: 'Mate', time: at('11:45'), owner: OWNER,
          voice: { state: { status, stage, key, error: status === 'error' ? 'x' : null }, toggle: () => {} },
          logRef: { current: null }, onAsk: () => {}, onDraft: () => {}, onOpen: () => {} }) }));
      expect(html('playing', 'answer')).toContain('data-voice-focus="true"');
      expect(html('playing', 'question')).not.toContain('data-voice-focus');
      expect(html('playing', 'answer')).toContain(t.voiceStopAudio);
      const failed = html('error', 'answer');
      expect(failed).toContain(t.voiceError);
      expect(failed).toContain(t.labResult);
      expect(failed).toContain('href="#/onboard/personal/laboratory"');
    });
  });
});
