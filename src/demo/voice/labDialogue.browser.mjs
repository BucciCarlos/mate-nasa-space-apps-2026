// VOICE06/07/09 browser regression with REAL audio (the approved MP3s under public/voice). Optional, like the other *.browser.mjs files:
//   PLAYWRIGHT_MODULE=/abs/playwright/index.mjs BROWSER_BIN=/abs/chrome FD30_BASE_URL=http://127.0.0.1:5173/ node src/demo/voice/labDialogue.browser.mjs
import assert from 'node:assert/strict';
import { demo } from '../demoDock.helpers.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_BIN ? { executablePath: process.env.BROWSER_BIN } : {}),
  args: ['--no-sandbox', '--mute-audio'] });
const base = process.env.FD30_BASE_URL || 'http://127.0.0.1:5173/';
const at = hhmm => Date.parse(`2027-03-10T${hhmm}:00Z`);
const owners = ['iss:crew-lf', 'iss:crew-ti', 'iss:crew-mo'];
const QUESTION = 'mate-lab-question-en-03.mp3', ANSWER = 'mate-lab-blood-result-en-03.mp3';
const WAITING = 'mate-lab-waiting-en-02.mp3', ANALYZING = 'mate-lab-analyzing-en-02.mp3', BOTH = 'mate-lab-both-results-en-02.mp3';
const TOMAS_Q = 'mate-lab-tomas-question-en-08.mp3', TOMAS_A = 'mate-lab-tomas-answer-en-08.mp3', MEI_Q = 'mate-lab-mei-question-en-08.mp3', MEI_A = 'mate-lab-mei-answer-en-08.mp3';
const TI_SAMPLE = 'iss:sample-ti-b1', LF_SAMPLES = ['iss:sample-lf-b1', 'iss:sample-lf-u1'];
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
  const events = () => page.evaluate(() => window.__audio.map(a => a.events.join(',')));
  const playing = () => page.evaluate(() => window.__audio.some(a => !a.el.paused && !a.el.ended));
  const control = () => page.locator('.fd-chat-audio button');
  const question = locale === 'es' ? '¿Ya llegaron mis análisis?' : 'Have my lab results arrived?';
  const openChatAndAsk = async () => {
    if (!(await page.locator('#fd-ask').count())) await page.locator('.fd-character').click();
    await page.locator('.fd-chat-suggestions').getByRole('button', { name: question, exact: true }).click();
  };
  const waitStage = async n => page.waitForFunction(count => window.__audio.length >= count && window.__audio[count - 1].events.includes('playing'), n, { timeout: 8000 });
  const hash = () => page.evaluate(() => location.hash);
  const setMode = mode => demo(page, () => page.locator('.fd-timebar select').selectOption(mode));
  return { context, page, errors, seek, files, events, playing, control, openChatAndAsk, waitStage, hash, setMode, demo: fn => demo(page, fn) };
}

for (const locale of locales) {
  const label = locale === 'es' ? 'Audio en inglés' : 'Play audio';
  // 1. Explore: no autoplay, question then answer, highlight while Mate speaks, no navigation.
  {
    const s = await session(locale, 1440);
    await s.seek('11:45'); await s.openChatAndAsk();
    assert.equal((await s.control().innerText()).trim(), label);
    await s.page.waitForTimeout(600);
    assert.deepEqual(await s.files(), [], 'no audio before the explicit press');
    assert.match(await s.page.locator('.fd-chat-answer p').last().innerText(), locale === 'es' ? /resultado/i : /result/i);
    const startHash = await s.hash();
    await s.control().click(); await s.waitStage(1);
    assert.equal(await s.control().getAttribute('aria-pressed'), 'true');
    assert.equal(await s.page.locator('[data-voice-focus]').count(), 0, 'not highlighted while Lucía speaks');
    await s.waitStage(2);
    assert.deepEqual(await s.files(), [QUESTION, ANSWER], 'Lucía first, then Mate');
    assert.equal((await s.events())[0].includes('ended'), true, 'question ended before the answer started');
    assert.equal(await s.page.locator('a[data-voice-focus="true"]').count(), 1, 'access highlighted while Mate speaks');
    assert.match(await s.page.locator('a[data-voice-focus]').getAttribute('href'), /personal\/laboratory/);
    await s.page.waitForFunction(() => window.__audio[1]?.events.includes('ended'), null, { timeout: 15000 });
    await s.page.waitForTimeout(300);
    assert.equal(await s.hash(), startHash, 'Exploración libre does not navigate');
    assert.equal(await s.page.locator('[data-voice-focus]').count(), 0);
    assert.equal(await s.control().getAttribute('aria-pressed'), 'false');
    assert.deepEqual(await s.files(), [QUESTION, ANSWER], 'no replay');
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 2. Rewind 11:45 -> 09:00 during playback cancels it; forward again restores the text without replaying.
  {
    const s = await session(locale, 1440);
    await s.seek('11:45'); await s.openChatAndAsk(); await s.setMode('guided');
    await s.control().click(); await s.waitStage(2);
    await s.seek('09:00');
    await s.page.waitForTimeout(400);
    assert.equal(await s.playing(), false, 'rewind stops the audio');
    assert.equal(await s.page.locator('.fd-chat-pair').count(), 0, 'the 11:45 answer is hidden at 09:00');
    await s.page.waitForTimeout(1500);
    assert.match(await s.hash(), /demo\/fd30$/, 'no pending guided opening after the rewind');
    await s.seek('11:45'); await s.page.waitForTimeout(800);
    assert.equal(await s.page.locator('.fd-chat-pair').count(), 1, 'the answer returns once');
    assert.equal(await s.control().getAttribute('aria-pressed'), 'false');
    assert.equal(await s.playing(), false, 'no automatic replay');
    assert.equal((await s.files()).length, 2);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 3. Guided: opens the blood detail once, after a successful end.
  {
    const s = await session(locale, 1440);
    await s.seek('11:45'); await s.openChatAndAsk(); await s.setMode('guided');
    await s.control().click();
    await s.page.waitForFunction(() => location.hash.includes('personal/laboratory'), null, { timeout: 20000 });
    assert.equal(await s.page.locator('.fd-session-highlight[data-sample-id="iss:sample-lf-b1"]').count(), 1, 'blood detail highlighted');
    await s.page.locator('.fd-nav a[href="#/demo/fd30"]').click(); await s.page.waitForTimeout(1500);
    assert.match(await s.hash(), /demo\/fd30$/, 'opened only once');
    assert.deepEqual(await s.files(), [QUESTION, ANSWER]);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 4. Every cancel path stops audio and any pending opening (guided mode, so a leak would navigate).
  const paths = {
    stop: async s => { await s.control().click(); },
    'close chat': async s => { await s.page.keyboard.press('Escape'); },
    'switch profile': async s => { await s.demo(() => s.page.locator('.fd-view-as select').selectOption(owners[1])); },
    'manual navigation': async s => { await s.page.locator('.fd-nav a[href="#/onboard/personal/sleep"]').click(); },
  };
  for (const [name, cancel] of Object.entries(paths)) {
    const s = await session(locale, 1440);
    await s.seek('11:45'); await s.openChatAndAsk(); await s.setMode('guided');
    await s.control().click(); await s.waitStage(1);
    await cancel(s);
    await s.page.waitForTimeout(500);
    assert.equal(await s.playing(), false, `${name}: audio stopped`);
    const count = (await s.files()).length;
    await s.page.waitForTimeout(2500);
    assert.equal((await s.files()).length, count, `${name}: the answer clip never starts`);
    assert.doesNotMatch(await s.hash(), /laboratory/, `${name}: no pending guided opening`);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 5. Audio failure keeps the written answer and the manual access.
  {
    const s = await session(locale, 1440, { failAudio: true });
    await s.seek('11:45'); await s.openChatAndAsk(); await s.setMode('guided');
    await s.control().click();
    await s.page.locator('.fd-chat-audio-error').waitFor();
    assert.match(await s.page.locator('.fd-chat-answer').last().innerText(), locale === 'es' ? /resultado/i : /result/i);
    await s.page.waitForTimeout(800);
    assert.doesNotMatch(await s.hash(), /laboratory/, 'a failure never opens the detail automatically');
    await s.page.locator('.fd-chat-answer a.fd-link').click(); await s.page.waitForURL(/personal\/laboratory/);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 6. Tomás and Mei never play Lucía's clips; 11:50 (both results) is text only.
  {
    const s = await session(locale, 1440);
    await s.seek('11:45');
    for (const owner of owners.slice(1)) {
      await s.demo(() => s.page.locator('.fd-view-as select').selectOption(owner));
      await s.openChatAndAsk();
      await s.page.locator('.fd-chat-pair').last().waitFor();
      assert.equal(await s.control().count(), 0, `${owner}: no audio control`);
      await s.page.keyboard.press('Escape');
    }
    assert.deepEqual(await s.files(), [], 'no clip was ever created for Tomás or Mei');
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 7. The four exact pairs play their own clip (question first, English audio); intermediate pairs stay text only.
  {
    const states = [['05:55', WAITING, false, 'waiting'], ['09:30', ANALYZING, false, 'analyzing'], ['11:45', ANSWER, true, 'blood result + urine analysis'], ['11:50', BOTH, true, 'both results']];
    for (const [hhmm, file, result, name] of states) {
      const s = await session(locale, 1440);
      await s.seek(hhmm); await s.openChatAndAsk();
      assert.equal((await s.control().innerText()).trim(), label, name);
      const writtenBefore = await s.page.locator('.fd-chat-answer p').last().innerText();
      await s.control().click(); await s.waitStage(2);
      assert.deepEqual(await s.files(), [QUESTION, file], `${name}: question, then its own answer`);
      assert.equal(await s.page.locator('a[data-voice-focus="true"]').count(), result ? 1 : 0, `${name}: result access highlighted only when a result is reported`);
      await s.page.waitForFunction(() => window.__audio[1]?.events.includes('ended'), null, { timeout: 15000 });
      assert.equal(await s.page.locator('.fd-chat-answer p').last().innerText(), writtenBefore, `${name}: written answer unchanged`);
      assert.match(await s.hash(), /demo\/fd30$/, `${name}: explore never navigates`);
      assert.deepEqual(s.errors, []); await s.context.close();
    }
    for (const hhmm of ['09:15', '09:20', '09:25']) {
      const s = await session(locale, 1440);
      await s.seek(hhmm); await s.openChatAndAsk();
      await s.page.locator('.fd-chat-pair').last().waitFor();
      assert.equal(await s.control().count(), 0, `${hhmm}: intermediate pair, text only`);
      assert.deepEqual(await s.files(), [], `${hhmm}: not even the question`);
      assert.deepEqual(s.errors, []); await s.context.close();
    }
    // Guided playback opens a sample only when the answer has one unambiguous target: never for waiting/analyzing/both results.
    for (const hhmm of ['09:30', '11:50']) {
      const s = await session(locale, 1440);
      await s.seek(hhmm); await s.openChatAndAsk(); await s.setMode('guided');
      await s.control().click();
      await s.page.waitForFunction(() => window.__audio[1]?.events.includes('ended'), null, { timeout: 15000 });
      await s.page.waitForTimeout(1500);
      assert.match(await s.hash(), /demo\/fd30$/, `${hhmm}: guided mode opens no sample by default`);
      assert.equal(await s.page.locator('.fd-session-highlight').count(), 0);
      assert.deepEqual(s.errors, []); await s.context.close();
    }
  }
  // 8. Mobile: the button can be pressed and stopped without losing the written answer or the other clip starting.
  {
    const s = await session(locale, 390, { mobile: true });
    await s.seek('11:50'); await s.openChatAndAsk();
    const writtenBefore = await s.page.locator('.fd-chat-answer p').last().innerText();
    const box = await s.control().boundingBox();
    assert.ok(box.height >= 32 && box.x >= 0 && box.x + box.width <= 390, 'control fits the mobile chat');
    await s.control().click(); await s.waitStage(1);
    assert.equal(await s.control().getAttribute('aria-pressed'), 'true');
    assert.equal((await s.control().innerText()).trim(), locale === 'es' ? 'Detener audio en inglés' : 'Stop audio');
    await s.control().click();
    await s.page.waitForTimeout(500);
    assert.equal(await s.playing(), false);
    assert.equal(await s.control().getAttribute('aria-pressed'), 'false');
    assert.equal(await s.page.locator('.fd-chat-answer p').last().innerText(), writtenBefore, 'text kept after stopping');
    assert.equal(await s.page.locator('.fd-chat-pair').count(), 1);
    await s.page.waitForTimeout(2200);
    assert.deepEqual(await s.files(), [QUESTION], 'the answer clip never started after Stop');
    // Pressing again plays the whole thing.
    await s.control().click();
    await s.page.waitForFunction(() => window.__audio.length >= 3 && window.__audio[2].events.includes('ended'), null, { timeout: 20000 });
    assert.deepEqual((await s.files()).slice(1), [QUESTION, BOTH]);
    assert.equal(await s.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 9. Tomás: audio only once his own blood result availability is reported (15:44 -> 15:45). Guided opens HIS sample once.
  {
    const s = await session(locale, 1440);
    await s.demo(() => s.page.locator('.fd-view-as select').selectOption(owners[1]));
    await s.seek('15:44'); await s.openChatAndAsk(); await s.setMode('guided');
    await s.page.locator('.fd-chat-pair').last().waitFor();
    assert.equal(await s.control().count(), 0, '15:44: analysis, text only');
    assert.deepEqual(await s.files(), [], '15:44: not even the question');
    assert.doesNotMatch(await s.page.locator('.fd-chat-answer p').last().innerText(), locale === 'es' ? /Muestra secundaria/ : /Secondary urine/);
    await s.seek('15:45'); await s.openChatAndAsk();
    assert.equal((await s.control().last().innerText()).trim(), label);
    assert.deepEqual(await s.files(), [], 'no autoplay at 15:45');
    await s.control().last().click(); await s.waitStage(2);
    assert.deepEqual(await s.files(), [TOMAS_Q, TOMAS_A], 'Tomás: his question, then his answer');
    assert.equal(await s.page.locator('a[data-voice-focus="true"]').count(), 1, 'result access highlighted while Mate speaks');
    await s.page.waitForFunction(() => location.hash.includes('personal/laboratory'), null, { timeout: 15000 });
    await s.page.locator(`.fd-session-highlight[data-sample-id="${TI_SAMPLE}"]`).waitFor();
    assert.equal(await s.page.locator(LF_SAMPLES.map(id => `[data-sample-id="${id}"]`).join(',')).count(), 0, "Lucía's samples never open for Tomás");
    await s.page.locator('.fd-nav a[href="#/demo/fd30"]').click(); await s.page.waitForTimeout(1500);
    assert.match(await s.hash(), /demo\/fd30$/, 'opened only once');
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  {
    // Explore: no navigation. Rewind during playback: audio and any pending opening are cancelled.
    const s = await session(locale, 1440);
    await s.demo(() => s.page.locator('.fd-view-as select').selectOption(owners[1]));
    await s.seek('15:45'); await s.openChatAndAsk();
    await s.control().click(); await s.waitStage(2);
    await s.page.waitForFunction(() => window.__audio[1]?.events.includes('ended'), null, { timeout: 12000 });
    await s.page.waitForTimeout(500);
    assert.match(await s.hash(), /demo\/fd30$/, 'Exploración libre does not navigate');
    await s.setMode('guided'); await s.control().click(); await s.waitStage(4);
    await s.seek('09:00'); await s.page.waitForTimeout(400);
    assert.equal(await s.playing(), false, 'rewind stops Tomás audio');
    await s.page.waitForTimeout(1500);
    assert.match(await s.hash(), /demo\/fd30$/, 'no pending opening after the rewind');
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  for (const [name, cancel] of Object.entries({
    stop: async s => { await s.control().click(); },
    'close chat': async s => { await s.page.keyboard.press('Escape'); },
    'switch profile': async s => { await s.demo(() => s.page.locator('.fd-view-as select').selectOption(owners[0])); },
    'manual navigation': async s => { await s.page.locator('.fd-nav a[href="#/onboard/personal/sleep"]').click(); },
  })) {
    const s = await session(locale, 1440);
    await s.demo(() => s.page.locator('.fd-view-as select').selectOption(owners[1]));
    await s.seek('15:45'); await s.openChatAndAsk(); await s.setMode('guided');
    await s.control().click(); await s.waitStage(1);
    await cancel(s); await s.page.waitForTimeout(500);
    assert.equal(await s.playing(), false, `Tomás ${name}: audio stopped`);
    const count = (await s.files()).length;
    await s.page.waitForTimeout(4500);
    assert.equal((await s.files()).length, count, `Tomás ${name}: the answer clip never starts`);
    assert.doesNotMatch(await s.hash(), /laboratory/, `Tomás ${name}: no pending opening`);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 10. Mei: audio only while her own urine sample is in analysis (16:19 -> 16:20). Guided never opens any detail.
  {
    const s = await session(locale, 1440);
    await s.demo(() => s.page.locator('.fd-view-as select').selectOption(owners[2]));
    await s.seek('16:19'); await s.openChatAndAsk(); await s.setMode('guided');
    await s.page.locator('.fd-chat-pair').last().waitFor();
    assert.equal(await s.control().count(), 0, '16:19: collection only, text only');
    assert.deepEqual(await s.files(), [], '16:19: not even the question');
    await s.seek('16:20'); await s.openChatAndAsk();
    assert.equal((await s.control().last().innerText()).trim(), label);
    await s.control().last().click(); await s.waitStage(2);
    assert.deepEqual(await s.files(), [MEI_Q, MEI_A], 'Mei: her question, then her answer');
    assert.equal(await s.page.locator('[data-voice-focus]').count(), 0, 'no result is implied while her answer plays');
    await s.page.waitForFunction(() => window.__audio[1]?.events.includes('ended'), null, { timeout: 12000 });
    await s.page.waitForTimeout(1800);
    assert.match(await s.hash(), /demo\/fd30$/, 'Mei: guided mode opens no detail');
    assert.equal(await s.page.locator('.fd-session-highlight').count(), 0);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 11. Mobile: Tomás and Mei can press and stop; the written answers stay.
  for (const [owner, hhmm, files] of [[owners[1], '15:45', [TOMAS_Q]], [owners[2], '16:20', [MEI_Q]]]) {
    const s = await session(locale, 390, { mobile: true });
    await s.demo(() => s.page.locator('.fd-view-as select').selectOption(owner));
    await s.seek(hhmm); await s.openChatAndAsk();
    const written = await s.page.locator('.fd-chat-answer p').last().innerText();
    await s.control().click(); await s.waitStage(1);
    assert.equal(await s.control().getAttribute('aria-pressed'), 'true');
    await s.control().click(); await s.page.waitForTimeout(500);
    assert.equal(await s.playing(), false);
    assert.equal(await s.page.locator('.fd-chat-answer p').last().innerText(), written, 'text kept after stopping');
    await s.page.waitForTimeout(2800);
    assert.deepEqual(await s.files(), files, 'the answer clip never started after Stop');
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 12. Ground keeps only the generic plan blocks: no sample type, state or result, even when the result is available.
  {
    const s = await session(locale, 1440);
    await s.seek('15:45');
    for (const route of ['#/demo/fd30/ground', '#/demo/fd30/ground/agenda']) {
      await s.page.goto(`${base}${route}`); await s.page.locator('[data-surface="ground"]').waitFor(); await s.page.waitForTimeout(400);
      for (const role of ['mission_operator', 'medical_professional']) {
        const select = s.page.locator('.ops-role select'); if (await select.count()) await select.selectOption(role);
        const text = await s.page.locator('#fd-main').innerText();
        assert.doesNotMatch(text, /blood|sangre|urine|orina|sample taken|result available|resultado disponible|disponibilidad de resultado|iss:sample/i, `${route} ${role}: no sample type, state or result`);
      }
    }
    await s.page.goto(`${base}#/demo/fd30/ground/agenda`); await s.page.waitForTimeout(400);
    assert.match(await s.page.locator('#fd-main').innerText(), locale === 'es' ? /Actividad personal planificada/ : /Planned personal activity/, 'generic planned blocks are visible');
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  results.push({ locale, ok: 'Lucía four pairs; Tomás 15:44→15:45 (guided opens his sample once); Mei 16:19→16:20 (no navigation); cancel paths; mobile; Ground generic' });
}
console.log(JSON.stringify(results, null, 2));
await browser.close();
