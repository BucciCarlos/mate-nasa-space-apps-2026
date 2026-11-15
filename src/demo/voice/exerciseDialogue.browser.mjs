// EXERCISE-VOICE02 browser regression with REAL audio (approved MP3s under public/voice). Optional, like the other *.browser.mjs files:
//   PLAYWRIGHT_MODULE=/abs/playwright/index.mjs BROWSER_BIN=/abs/chrome FD30_BASE_URL=http://127.0.0.1:5173/ node src/demo/voice/exerciseDialogue.browser.mjs
import assert from 'node:assert/strict';
import { demo } from '../demoDock.helpers.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_BIN ? { executablePath: process.env.BROWSER_BIN } : {}), args: ['--no-sandbox', '--mute-audio'] });
const base = process.env.FD30_BASE_URL || 'http://127.0.0.1:5173/';
const at = hhmm => Date.parse(`2027-03-10T${hhmm}:00Z`);
const owners = ['iss:crew-lf', 'iss:crew-ti', 'iss:crew-mo'];
const PROFILES = [['iss:crew-lf', 'lucia'], ['iss:crew-ti', 'tomas'], ['iss:crew-mo', 'mei']];
const file = (profile, role) => `mate-exercise-${profile}-${role}-en-ev01.mp3`;
const APPROVED = {
  en: { lucia: 'Your FD30 ergometer session is recorded as completed, lasting 60 min. This is a simulated session record.',
    tomas: 'For your comparable ergometer sessions, the latest 4 median is 181 W. Your earlier 9-session reference median is 200 W. Difference: −19 W (−9.5%). This compares simulated power records and does not indicate a change in physical fitness.',
    mei: 'Your latest recorded session is FD29: 60 min on the ergometer, mean power 137 W. This is a fictional history record, separate from your FD30 reservation.' },
  es: { lucia: 'Tu sesión de ergómetro de FD30 figura como finalizada y duró 60 min. Es un registro de sesión simulado.',
    tomas: 'En tus sesiones comparables de ergómetro, la mediana de las últimas 4 es 181 W. La mediana propia de referencia de las 9 anteriores es 200 W. Diferencia: −19 W (−9,5 %). La comparación es entre registros simulados de potencia y no indica un cambio en tu condición física.',
    mei: 'Tu última sesión registrada es FD29: 60 min en ergómetro, potencia media de 137 W. Es un registro histórico ficticio, separado de tu reserva de FD30.' },
};
const locales = (process.env.VOICE_LOCALES || 'en,es').split(',');
const results = [];

async function session(locale, width, { failAudio = false, mobile = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: mobile ? 780 : 900 }, hasTouch: mobile, isMobile: mobile, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    window.__audio = [];
    const Native = window.Audio;
    function Tracked(src) {
      const el = new Native(src), rec = { src, events: [], el };
      for (const type of ['play', 'playing', 'ended', 'pause', 'error']) el.addEventListener(type, () => rec.events.push(type));
      window.__audio.push(rec); return el;
    }
    Tracked.prototype = Native.prototype; window.Audio = Tracked;
  });
  if (failAudio) await context.route('**/voice/*.mp3', route => route.abort());
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}#/demo/fd30`);
  await page.getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
  await demo(page, () => page.getByRole('button', { name: locale === 'es' ? 'Pausar' : 'Pause', exact: true }).click());
  const seek = hhmm => demo(page, () => page.getByRole('slider').evaluate((el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, at(hhmm)));
  const files = () => page.evaluate(() => window.__audio.map(a => a.src.split('/').pop()));
  const playing = () => page.evaluate(() => window.__audio.some(a => !a.el.paused && !a.el.ended));
  const control = () => page.locator('.fd-chat-audio button');
  const question = locale === 'es' ? '¿Cómo va mi entrenamiento?' : 'How is my training going?';
  const ask = async () => {
    if (!(await page.locator('#fd-ask').count())) await page.locator('.fd-character').click();
    await page.locator('.fd-chat-suggestions').getByRole('button', { name: question, exact: true }).click();
    await page.locator('.fd-chat-pair').last().waitFor();
  };
  const waitStage = n => page.waitForFunction(count => window.__audio.length >= count && window.__audio[count - 1].events.includes('playing'), n, { timeout: 8000 });
  const hash = () => page.evaluate(() => location.hash);
  const setMode = mode => demo(page, () => page.locator('.fd-timebar select').selectOption(mode));
  const who = owner => demo(page, () => page.locator('.fd-view-as select').selectOption(owner));
  const written = () => page.locator('.fd-chat-answer p').last().innerText();
  return { context, page, errors, seek, files, playing, control, ask, waitStage, hash, setMode, who, written, demo: fn => demo(page, fn) };
}
const label = locale => locale === 'es' ? 'Audio en inglés' : 'Play audio';

const sel = fd => `[data-exercise-selected="${fd}"]`;
for (const locale of locales) {
  const approved = APPROVED[locale];
  // 1. Three profiles at 12:00: written answer = approved text; audio pair; highlight; Exploración libre never navigates.
  for (const [owner, profile] of PROFILES) {
    const s = await session(locale, 1440);
    await s.who(owner); await s.seek('12:00'); await s.ask();
    assert.ok((await s.written()).includes(approved[profile]), `${profile}: written answer describes the same session`);
    assert.equal((await s.control().innerText()).trim(), label(locale));
    await s.page.waitForTimeout(500);
    assert.deepEqual(await s.files(), [], `${profile}: no autoplay`);
    const start = await s.hash();
    await s.control().click(); await s.waitStage(2);
    assert.deepEqual(await s.files(), [file(profile, 'question'), file(profile, 'answer')], `${profile}: own question, then own answer`);
    assert.equal(await s.page.locator('a[data-voice-focus="true"]').count(), 1, `${profile}: access highlighted while Mate speaks`);
    await s.page.waitForFunction(() => window.__audio[1]?.events.includes('ended'), null, { timeout: 30000 });
    await s.page.waitForTimeout(400);
    assert.equal(await s.hash(), start, `${profile}: Exploración libre does not navigate`);
    assert.equal(await s.page.locator('[data-voice-focus]').count(), 0);
    await s.page.locator('.fd-chat-answer a.fd-link').last().click(); await s.page.waitForURL(/personal\/exercise/);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 2. Guided: opens Exercise once on the exact session/section, without moving the clock.
  for (const [owner, profile] of PROFILES) {
    const s = await session(locale, 1440);
    await s.who(owner); await s.seek('12:00'); await s.ask(); await s.setMode('guided');
    const before = await s.demo(() => s.page.getByRole('slider').inputValue());
    await s.control().click();
    await s.page.waitForFunction(() => location.hash.includes('personal/exercise'), null, { timeout: 40000 });
    await s.page.locator('.exercise-history').waitFor();
    const fd = profile === 'lucia' ? 30 : 29;
    await s.page.locator(`#exercise-day-detail${sel(fd)}`).waitFor();
    if (profile === 'mei') await s.page.locator('[data-exercise-record="iss:history:mo:exercise-fd29"]').waitFor();
    if (profile === 'tomas') {
      await s.page.waitForFunction(() => document.activeElement?.id === 'exercise-comparison-h', null, { timeout: 4000 });
      assert.equal(await s.page.locator('[data-exercise-difference="-19"]').count(), 1, 'his own comparison is in view');
    }
    if (profile === 'lucia') await s.page.locator('[data-exercise-record="iss:session-lf-1"]').waitFor();
    assert.equal(await s.demo(() => s.page.getByRole('slider').inputValue()), before, `${profile}: the clock did not move`);
    await s.page.locator('.fd-nav a[href="#/demo/fd30"]').click(); await s.page.waitForTimeout(1500);
    assert.match(await s.hash(), /demo\/fd30$/, `${profile}: opened only once`);
    assert.deepEqual(await s.files(), [file(profile, 'question'), file(profile, 'answer')]);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 3. A state without audio, and the 11:29 -> 11:30 crossing for Lucía.
  {
    const s = await session(locale, 1440);
    await s.seek('10:41'); await s.ask();
    assert.equal(await s.control().count(), 0, 'Lucía live at 10:41: text only');
    await s.seek('11:29'); await s.ask();
    assert.equal(await s.control().count(), 0, '11:29: not finished, text only');
    assert.ok(!(await s.written()).includes(approved.lucia));
    assert.deepEqual(await s.files(), [], 'not even the question');
    await s.seek('11:30'); await s.ask();
    assert.ok((await s.written()).includes(approved.lucia));
    assert.equal(await s.page.locator('.fd-chat-pair').last().locator('.fd-chat-audio').count(), 1, '11:30: audio offered for the new query');
    assert.deepEqual(await s.files(), [], 'no autoplay');
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 4. Rewind before the query during playback cancels audio and the pending opening (Tomás, guided).
  {
    const s = await session(locale, 1440);
    await s.who(owners[1]); await s.seek('12:00'); await s.ask(); await s.setMode('guided');
    await s.control().click(); await s.waitStage(2);
    await s.seek('11:00'); await s.page.waitForTimeout(400);
    assert.equal(await s.playing(), false, 'rewind stops the audio');
    await s.page.waitForTimeout(1500);
    assert.match(await s.hash(), /demo\/fd30$/, 'no pending opening after the rewind');
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 5. Every other cancel path (guided, so a leak would navigate).
  for (const [name, cancel] of Object.entries({
    stop: async s => { await s.control().click(); },
    'close chat': async s => { await s.page.keyboard.press('Escape'); },
    'switch profile': async s => { await s.who(owners[0]); },
    'manual navigation': async s => { await s.page.locator('.fd-nav a[href="#/onboard/personal/sleep"]').click(); },
  })) {
    const s = await session(locale, 1440);
    await s.who(owners[2]); await s.seek('12:00'); await s.ask(); await s.setMode('guided');
    await s.control().click(); await s.waitStage(1);
    await cancel(s); await s.page.waitForTimeout(500);
    assert.equal(await s.playing(), false, `${name}: audio stopped`);
    const count = (await s.files()).length;
    await s.page.waitForTimeout(4500);
    assert.equal((await s.files()).length, count, `${name}: the answer clip never starts`);
    assert.doesNotMatch(await s.hash(), /personal\/exercise/, `${name}: no pending Exercise opening`);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 6. Audio failure keeps the text and the manual link.
  {
    const s = await session(locale, 1440, { failAudio: true });
    await s.who(owners[1]); await s.seek('12:00'); await s.ask(); await s.setMode('guided');
    await s.control().click();
    await s.page.locator('.fd-chat-audio-error').waitFor();
    assert.ok((await s.written()).includes(approved.tomas));
    await s.page.waitForTimeout(800);
    assert.doesNotMatch(await s.hash(), /personal\/exercise/);
    await s.page.locator('.fd-chat-answer a.fd-link').last().click(); await s.page.waitForURL(/personal\/exercise/);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 7. Mobile: press and stop for the three profiles without losing the written answer.
  for (const [owner, profile] of PROFILES) {
    const s = await session(locale, 390, { mobile: true });
    await s.who(owner); await s.seek('12:00'); await s.ask();
    const before = await s.written();
    assert.ok(before.includes(approved[profile]), `${profile}: mobile text`);
    await s.control().click(); await s.waitStage(1);
    assert.equal(await s.control().getAttribute('aria-pressed'), 'true');
    await s.control().click(); await s.page.waitForTimeout(500);
    assert.equal(await s.playing(), false);
    assert.equal(await s.written(), before, `${profile}: text kept after stopping`);
    await s.page.waitForTimeout(4000);
    assert.deepEqual(await s.files(), [file(profile, 'question')], `${profile}: the answer never started after Stop`);
    assert.equal(await s.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  results.push({ locale, ok: 'three profiles at 12:00; guided opens the exact session/section once; no-audio states; 11:29→11:30; rewind; cancel paths; failure; mobile' });
}
console.log(JSON.stringify(results, null, 2));
await browser.close();
