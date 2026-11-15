import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider } from '../i18n/I18nProvider';
import { Fd30Conversation } from './Fd30Conversation';
import { describe, expect, it } from 'vitest';
import { CREW, OWNER, freshPreview, previewReduce, previewTime, restorePreview } from './fd30';
import { FD30_CHAT_TEXT } from '../i18n/fd30Chat';
const wall = 1000;
const at = (hhmm: string) => Date.parse(`2027-03-10T${hhmm}:00Z`);
const seek = (s: ReturnType<typeof freshPreview>, hhmm: string) => previewReduce(s, { type: 'seek', target: at(hhmm), now: wall });
const ask = (s: ReturnType<typeof freshPreview>, text: string, lang: 'en' | 'es', input: 'text' | 'simulated_voice' = 'text') =>
  previewReduce(s, { type: 'ask', owner: s.activeCrewId, text, lang, now: wall, input });
const answer = (s: ReturnType<typeof freshPreview>) => s.profiles[s.activeCrewId].turns.at(-1)!.answer!;

for (const lang of ['en', 'es'] as const) describe(`CHAT01 ${lang}`, () => {
  const t = FD30_CHAT_TEXT[lang];
  it('renders translated suggestions, simulated transcription and a personal detail link, without exposing another conversation', () => {
    const s = ask(seek(freshPreview(wall), '10:45'), t.exercise, lang, 'simulated_voice');
    const render = (profile: typeof s.profiles[typeof OWNER]) => renderToStaticMarkup(createElement(I18nProvider, { locale: lang,
      children: createElement(Fd30Conversation, { profile, character: 'Mate', logRef: { current: null }, onAsk: () => {}, onDraft: () => {}, onOpen: () => {} }) }));
    const html = render(s.profiles[OWNER]);
    expect(html).toContain(t.agenda);
    expect(html).toContain(t.laboratory);
    expect(html).toContain(t.voice);
    expect(html).toContain(t.transcription);
    expect(html).toContain(t.at('10:45'));
    expect(html).toContain(t.exerciseLive);
    expect(html).toContain('href="#/onboard/personal/exercise"');
    expect(html).not.toContain('getUserMedia');
    expect(render(s.profiles['iss:crew-ti'])).not.toContain(t.exerciseLive);
  });
  it('answers the same typed exercise query before, during and after this owner’s current-day session', () => {
    let s = seek(freshPreview(wall), '10:00');
    s = ask(s, t.exercise, lang);
    expect(answer(s).body).toContain(t.exerciseWaiting);
    expect(answer(s).body).not.toContain(t.exerciseDone); // FD29 history is not today’s session
    s = ask(seek(s, '10:45'), t.exercise, lang);
    expect(answer(s).body).toContain(t.exerciseLive);
    expect(answer(s).at).toBe(at('10:45'));
    s = ask(seek(s, '11:30'), t.exercise, lang);
    expect(answer(s).body).toContain(t.exerciseDone);
    expect(answer(s).detail).toBe('exercise');
    expect(s.profiles[OWNER].turns[0].answer!.body).toContain(t.exerciseWaiting);
    expect(s.profiles[OWNER].turns[0].answer!.at).toBe(at('10:00'));
  });
  it('distinguishes no receipt, analysis and result availability without inventing values, including rewind', () => {
    let s = ask(seek(freshPreview(wall), '09:00'), t.laboratory, lang);
    expect(answer(s).body).toContain(t.labWaiting);
    expect(answer(s).body).not.toContain(t.labResult);
    s = ask(seek(s, '10:00'), t.laboratory, lang);
    expect(answer(s).body).toContain(t.labAnalyzing);
    expect(answer(s).body).not.toContain(t.labResult);
    s = ask(seek(s, '11:45'), t.laboratory, lang);
    expect(answer(s).body).toContain(`${t.blood}: ${t.labResult}`);
    expect(answer(s).body).toContain(`${t.urine}: ${t.labAnalyzing}`);
    expect(answer(s).detail).toBe('laboratory');
    s = ask(seek(s, '09:00'), t.laboratory, lang);
    expect(answer(s).body).not.toContain(t.labResult);
  });
  const renderAtCursor = (state: ReturnType<typeof freshPreview>) => renderToStaticMarkup(createElement(I18nProvider, { locale: lang,
    children: createElement(Fd30Conversation, { profile: state.profiles[state.activeCrewId], character: 'Mate', time: previewTime(state, wall),
      logRef: { current: null }, onAsk: () => {}, onDraft: () => {}, onOpen: () => {} }) }));
  for (const queryTime of ['11:45', '11:50']) it(`hides the ${queryTime} laboratory reply on rewind and restores it once at the query cursor`, () => {
    let state = ask(seek(freshPreview(wall), queryTime), t.laboratory, lang);
    const turns = state.profiles[OWNER].turns;
    const snapshot = JSON.stringify(turns);
    expect(answer(state).body).toContain(`${t.blood}: ${t.labResult}`);
    expect(answer(state).body).toContain(`${t.urine}: ${queryTime === '11:50' ? t.labResult : t.labAnalyzing}`);
    const visible = renderAtCursor(state);
    expect(visible).toContain(t.labResult);
    expect(visible.match(/class="fd-chat-pair"/g)).toHaveLength(1);
    state = seek(state, '09:00');
    expect(renderAtCursor(state)).not.toContain(t.labResult);
    expect(renderAtCursor(state)).not.toContain('class="fd-chat-pair"');
    expect(state.profiles[OWNER].turns).toEqual(turns);
    state = seek(state, queryTime);
    expect(renderAtCursor(state)).toBe(visible);
    expect(state.profiles[OWNER].turns).toHaveLength(1);
    expect(JSON.stringify(state.profiles[OWNER].turns)).toBe(snapshot);
    expect(previewTime(state, wall)).toBe(at(queryTime));
  });
  it('keeps Lucia laboratory results out of Tomas and Mei conversations at 11:50', () => {
    let state = ask(seek(freshPreview(wall), '11:50'), t.laboratory, lang, 'simulated_voice');
    const lucia = state.profiles[OWNER];
    for (const crew of CREW.slice(1)) {
      state = previewReduce(state, { type: 'select', crewId: crew.id });
      expect(state.profiles[crew.id].turns).toEqual([]);
      expect(renderAtCursor(state)).not.toContain(t.labResult);
      state = ask(state, t.laboratory, lang, 'simulated_voice');
      // LAB04: Tomás (blood) and Mei (urine) have their own FD30 sample. At 11:50 neither has a received event: no state is
      // deduced from the reservation, and nothing of Lucía's results or samples is shown.
      const own = crew.id === 'iss:crew-ti' ? `${t.blood}: ${t.labWaiting}.` : `${t.urineOwn}: ${t.labWaiting}.`;
      expect(answer(state).body).toBe(`${own}\n${t.labLimit}`);
      expect(answer(state).body).not.toContain(t.noLabs);
      expect(answer(state).body).not.toContain(t.urine); // Lucía's secondary urine sample
      expect(renderAtCursor(state)).toContain(own);
      expect(renderAtCursor(state)).not.toContain(t.labResult);
      expect(state.profiles[OWNER]).toBe(lucia);
      expect(previewTime(state, wall)).toBe(at('11:50'));
    }
    state = previewReduce(state, { type: 'select', crewId: OWNER });
    expect(renderAtCursor(state)).toContain(`${t.blood}: ${t.labResult}`);
    expect(state.profiles[OWNER].turns).toHaveLength(1);
  });
  it('uses the same answer path for simulated voice, retains a typed draft, and round-trips persistence', () => {
    let s = seek(freshPreview(wall), '10:45');
    s = previewReduce(s, { type: 'draft', owner: OWNER, text: 'private draft' });
    const before = s;
    const voice = ask(s, t.exercise, lang, 'simulated_voice');
    const typed = ask(s, t.exercise, lang);
    expect(answer(voice)).toEqual(answer(typed));
    expect(voice.profiles[OWNER].turns.at(-1)!.input).toBe('simulated_voice');
    expect(voice.profiles[OWNER].draft).toBe('private draft');
    expect(voice.offsetMs).toBe(before.offsetMs);
    expect(voice.processedIds).toBe(before.processedIds);
    expect(restorePreview(JSON.stringify(voice), wall).profiles).toEqual(voice.profiles);
  });
  it('answers only the active profile’s agenda, preserves private histories and the common clock', () => {
    let s = seek(freshPreview(wall), '10:45');
    s = ask(s, t.exercise, lang);
    const lucia = s.profiles[OWNER];
    const clock = previewTime(s, wall);
    for (const c of CREW.slice(1)) {
      s = previewReduce(s, { type: 'select', crewId: c.id });
      expect(s.profiles[c.id].turns).toEqual([]);
      s = ask(s, t.agenda, lang);
      expect(answer(s).detail).toBe('agenda');
      expect(answer(s).body).toContain(t.planned);
      expect(answer(s).body).toContain(c.id === 'iss:crew-ti' ? '10:30–11:30' : '13:00–14:00');
      s = ask(s, t.exercise, lang);
      expect(answer(s).body).toContain(t.exerciseWaiting);
      expect(answer(s).body).not.toContain(t.exerciseLive);
      s = ask(s, t.laboratory, lang);
      expect(answer(s).body).toBe(`${c.id === 'iss:crew-ti' ? `${t.blood}: ${t.labWaiting}.` : `${t.urineOwn}: ${t.labWaiting}.`}\n${t.labLimit}`);
      expect(previewTime(s, wall)).toBe(clock);
      expect(s.profiles[OWNER]).toBe(lucia);
      const stale = previewReduce(s, { type: 'ask', owner: OWNER, text: 'private', lang, now: wall });
      expect(stale).toBe(s);
    }
    s = previewReduce(s, { type: 'select', crewId: OWNER });
    expect(s.profiles[OWNER]).toBe(lucia);
  });
});
