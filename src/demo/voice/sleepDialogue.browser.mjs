// SLEEP-VOICE03 browser regression with REAL audio (approved MP3s under public/voice). Optional, like the other *.browser.mjs files:
//   PLAYWRIGHT_MODULE=/abs/playwright/index.mjs BROWSER_BIN=/abs/chrome FD30_BASE_URL=http://127.0.0.1:5173/ node src/demo/voice/sleepDialogue.browser.mjs
import assert from 'node:assert/strict';
import { demo } from '../demoDock.helpers.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_BIN ? { executablePath: process.env.BROWSER_BIN } : {}), args: ['--no-sandbox', '--mute-audio'] });
const base = process.env.FD30_BASE_URL || 'http://127.0.0.1:5173/';
const at = hhmm => Date.parse(`2027-03-10T${hhmm}:00Z`);
const owners = ['iss:crew-lf', 'iss:crew-ti', 'iss:crew-mo'];
const PROFILES = [['iss:crew-lf', 'lucia', '6:35', '71'], ['iss:crew-ti', 'tomas', '7:10', '82'], ['iss:crew-mo', 'mei', '7:25', '93']];
const file = (profile, role) => `mate-sleep-${profile}-${role}-en-sv02.mp3`;
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
  const question = locale === 'es' ? '¿Cómo dormí anoche?' : 'How did I sleep last night?';
  const ask = async () => {
    if (!(await page.locator('#fd-ask').count())) await page.locator('.fd-character').click();
    await page.locator('#fd-ask').fill(question); await page.locator('#fd-ask').press('Enter');
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

for (const locale of locales) {
  const text = (fd, dur, pts) => locale === 'es' ? `Tu último registro es ${fd}: ${dur} h:min. Puntaje de demostración: ${pts} puntos. No es una medición.` : `Your latest recorded night is ${fd}: ${dur} h:min. Demonstration score: ${pts} points. It is not a measurement.`;
  // 1. Three profiles at 05:55: written answer, audio pair, highlight, Exploración libre never navigates.
  for (const [owner, profile, dur, pts] of PROFILES) {
    const s = await session(locale, 1440);
    await s.who(owner); await s.seek('05:55'); await s.ask();
    assert.match(await s.written(), new RegExp(text('FD29', dur, pts).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${profile}: written answer shows night, duration and score`);
    assert.equal((await s.control().innerText()).trim(), label(locale));
    await s.page.waitForTimeout(500);
    assert.deepEqual(await s.files(), [], `${profile}: no autoplay`);
    const start = await s.hash();
    await s.control().click(); await s.waitStage(2);
    assert.deepEqual(await s.files(), [file(profile, 'question'), file(profile, 'answer')], `${profile}: own question, then own answer`);
    assert.equal(await s.page.locator('a[data-voice-focus="true"]').count(), 1, `${profile}: access highlighted while Mate speaks`);
    await s.page.waitForFunction(() => window.__audio[1]?.events.includes('ended'), null, { timeout: 15000 });
    await s.page.waitForTimeout(400);
    assert.equal(await s.hash(), start, `${profile}: Exploración libre does not navigate`);
    assert.equal(await s.page.locator('[data-voice-focus]').count(), 0);
    // The offered manual link opens the same night in Sleep.
    await s.page.locator('.fd-chat-answer a.fd-link').last().click(); await s.page.waitForURL(/personal\/sleep/);
    assert.equal(await s.page.locator('[data-sleep-score]').first().getAttribute('data-sleep-score'), pts, `${profile}: detail shows the same score`);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 2. Guided: opens Sleep once with FD29 selected, without moving the clock; the score matches.
  for (const [owner, profile, , pts] of PROFILES) {
    const s = await session(locale, 1440);
    await s.who(owner); await s.seek('05:55'); await s.ask(); await s.setMode('guided');
    const before = await s.demo(() => s.page.getByRole('slider').inputValue());
    await s.control().click();
    await s.page.waitForFunction(() => location.hash.includes('personal/sleep'), null, { timeout: 20000 });
    await s.page.locator('#sleep-night-detail[data-sleep-selected="29"]').waitFor();
    assert.equal(await s.page.locator('[data-sleep-score-fd="29"] [data-sleep-score]').getAttribute('data-sleep-score'), pts, `${profile}: FD29 score in the opened detail`);
    assert.equal(await s.demo(() => s.page.getByRole('slider').inputValue()), before, `${profile}: the clock did not move`);
    await s.page.locator('.fd-nav a[href="#/demo/fd30"]').click(); await s.page.waitForTimeout(1500);
    assert.match(await s.hash(), /demo\/fd30$/, `${profile}: opened only once`);
    assert.deepEqual(await s.files(), [file(profile, 'question'), file(profile, 'answer')]);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 3. Lucía crosses 06:00: FD30 6:25 without score; the new query is text only and plays nothing.
  {
    const s = await session(locale, 1440);
    await s.seek('05:55'); await s.ask();
    assert.equal(await s.control().count(), 1, '05:55: audio offered');
    await s.seek('06:00'); await s.ask();
    const late = await s.written();
    assert.match(late, /FD30/); assert.match(late, /6:25/);
    assert.doesNotMatch(late, /71/); assert.doesNotMatch(late, locale === 'es' ? /Puntaje de demostración/ : /Demonstration score/);
    assert.match(late, locale === 'es' ? /Puntaje no disponible: falta el tiempo en cama registrado/ : /Score unavailable: recorded time in bed is missing/);
    assert.equal(await s.control().count(), 1, 'the 06:00 query has no control (only the 05:55 turn keeps its own)');
    assert.equal(await s.page.locator('.fd-chat-pair').last().locator('.fd-chat-audio').count(), 0);
    assert.deepEqual(await s.files(), [], 'neither the question nor any clip plays for FD30');
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 4. Rewind before the query during playback cancels audio and the pending guided opening.
  {
    const s = await session(locale, 1440);
    await s.seek('05:55'); await s.ask(); await s.setMode('guided');
    await s.control().click(); await s.waitStage(2);
    await s.seek('05:00'); await s.page.waitForTimeout(400);
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
    'manual navigation': async s => { await s.page.locator('.fd-nav a[href="#/onboard/personal/laboratory"]').click(); },
  })) {
    const s = await session(locale, 1440);
    await s.who(owners[2]); await s.seek('05:55'); await s.ask(); await s.setMode('guided');
    await s.control().click(); await s.waitStage(1);
    await cancel(s); await s.page.waitForTimeout(500);
    assert.equal(await s.playing(), false, `${name}: audio stopped`);
    const count = (await s.files()).length;
    await s.page.waitForTimeout(3500);
    assert.equal((await s.files()).length, count, `${name}: the answer clip never starts`);
    assert.doesNotMatch(await s.hash(), name === 'manual navigation' ? /sleep/ : /sleep/, `${name}: no pending Sleep opening`);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 6. Audio failure keeps the text and the manual link, and never opens Sleep by itself.
  {
    const s = await session(locale, 1440, { failAudio: true });
    await s.who(owners[1]); await s.seek('05:55'); await s.ask(); await s.setMode('guided');
    await s.control().click();
    await s.page.locator('.fd-chat-audio-error').waitFor();
    assert.match(await s.written(), /FD29/);
    await s.page.waitForTimeout(800);
    assert.doesNotMatch(await s.hash(), /sleep/);
    await s.page.locator('.fd-chat-answer a.fd-link').last().click(); await s.page.waitForURL(/personal\/sleep/);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 7. Mobile: press and stop for the three profiles without losing the written answer.
  for (const [owner, profile, dur, pts] of PROFILES) {
    const s = await session(locale, 390, { mobile: true });
    await s.who(owner); await s.seek('05:55'); await s.ask();
    const before = await s.written();
    assert.ok(before.includes(`${dur} h:min`) && before.includes(pts), `${profile}: mobile text`);
    await s.control().click(); await s.waitStage(1);
    assert.equal(await s.control().getAttribute('aria-pressed'), 'true');
    await s.control().click(); await s.page.waitForTimeout(500);
    assert.equal(await s.playing(), false);
    assert.equal(await s.written(), before, `${profile}: text kept after stopping`);
    await s.page.waitForTimeout(2600);
    assert.deepEqual(await s.files(), [file(profile, 'question')], `${profile}: the answer never started after Stop`);
    assert.equal(await s.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  results.push({ locale, ok: 'Lucía 71, Tomás 82, Mei 93 (FD29) at 05:55; guided opens FD29 once; 06:00 crossing text only; rewind; cancel paths; failure; mobile' });
}
console.log(JSON.stringify(results, null, 2));
await browser.close();
