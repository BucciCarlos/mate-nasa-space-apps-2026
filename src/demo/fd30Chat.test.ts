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
      expect(answer(s).body).toBe(t.noLabs);
      expect(previewTime(s, wall)).toBe(clock);
      expect(s.profiles[OWNER]).toBe(lucia);
      const stale = previewReduce(s, { type: 'ask', owner: OWNER, text: 'private', lang, now: wall });
      expect(stale).toBe(s);
    }
    s = previewReduce(s, { type: 'select', crewId: OWNER });
    expect(s.profiles[OWNER]).toBe(lucia);
  });
});
