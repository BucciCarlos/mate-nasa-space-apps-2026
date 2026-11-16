// CLK01 browser acceptance against a local dev/preview server: new-session autoplay, speeds, pause persistence, Tomás scene at 60×.
import assert from 'node:assert/strict';
import { demo } from './demoDock.helpers.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_BIN ? { executablePath: process.env.BROWSER_BIN } : {}), args: ['--no-sandbox'] });
const base = process.env.FD30_BASE_URL || 'http://127.0.0.1:5173/';
const at = h => Date.parse(`2027-03-10T${h}:00Z`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    const cursor = () => demo(page, async () => Number(await page.getByRole('slider').inputValue()));
    const c0 = await cursor(); const w0 = Date.now();
    assert.ok(Math.abs(c0 - at('05:50')) < 20_000, `starts near 05:50, got ${new Date(c0).toISOString()}`);
    assert.equal(await demo(page, () => page.getByRole('button', { name: 'Pause', exact: true }).count()), 1, 'Pause shown while playing');
    assert.match(await demo(page, () => page.locator('.fd-timebar-controls > span').textContent()), /300×/);
    await sleep(2000 - (Date.now() - w0));
    const c1 = await cursor(), w1 = Date.now();
    const gained = (c1 - c0) / 60_000, real = (w1 - w0) / 1000;
    console.log(width, 'gained mission minutes', gained.toFixed(2), 'in real s', real.toFixed(2));
    assert.ok(gained > 8.5 && gained < 12, 'about ten mission minutes in two real seconds');
    // speed change keeps the cursor: exact while paused, and within one display tick (≤ 1 s × speed) while playing
    await demo(page, async () => { await page.getByRole('button', { name: 'Pause', exact: true }).click(); const a = Number(await page.getByRole('slider').inputValue());
      for (const speed of ['60', '1', '300']) { await page.getByLabel('Clock speed').selectOption(speed); assert.equal(Number(await page.getByRole('slider').inputValue()), a, 'speed change must not jump'); }
      await page.getByRole('button', { name: 'Play', exact: true }).click(); });
    await demo(page, async () => { const a = Number(await page.getByRole('slider').inputValue()); await page.getByLabel('Clock speed').selectOption('60'); const b = Number(await page.getByRole('slider').inputValue()); assert.ok(b - a >= 0 && b - a <= 301_000, 'no jump while playing'); await page.getByLabel('Clock speed').selectOption('300'); });
    // pause, switch perspective, hour and pause persist
    await demo(page, () => page.getByRole('button', { name: 'Pause', exact: true }).click());
    const paused = await cursor();
    await demo(page, () => page.locator('.fd-perspective-switch').click());
    await sleep(2500);
    assert.equal(await cursor(), paused, 'time holds on Ground');
    assert.equal(await demo(page, () => page.getByRole('button', { name: 'Play', exact: true }).count()), 1, 'Play shown when stopped');
    await demo(page, () => page.locator('.fd-perspective-switch').click());
    assert.equal(await cursor(), paused, 'time holds back on board');
    assert.equal(await demo(page, () => page.getByLabel('Clock speed').inputValue()), '300');
    assert.equal(errors.length, 0, errors.join('\n'));
    await context.close();
  }
  // Restoration: a snapshot without speed adopts 300× keeping the cursor (and stays paused); an explicit 1× is respected.
  {
    const key = 'mate:fd30:imp02:v1';
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(base); await page.getByRole('button', { name: 'EN', exact: true }).click();
    const speedOf = () => demo(page, () => page.getByLabel('Clock speed').inputValue());
    const cursor = () => demo(page, async () => Number(await page.getByRole('slider').inputValue()));
    const running = () => demo(page, () => page.getByRole('button', { name: 'Pause', exact: true }).count());
    const load = async patch => { await page.evaluate(([key, patch]) => { const s = JSON.parse(sessionStorage.getItem(key)); sessionStorage.setItem(key, JSON.stringify({ ...s, ...patch })); window.addEventListener('pagehide', e => e.stopImmediatePropagation(), true); }, [key, patch]); await page.reload(); };
    const stored = () => page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), key);
    await demo(page, () => page.getByRole('button', { name: 'Pause', exact: true }).click());
    const paused = await stored();
    const { speed: _s, jump: _j, ...legacy } = paused; // a paused pre-CLK01 snapshot: no speed, offset counted from 05:55
    const cursorBefore = await cursor();
    const open = async snapshot => { // a fresh tab seeded before the app loads (a reload would let pagehide overwrite the seed)
      const p = await context.newPage();
      await p.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); sessionStorage.setItem(key, value); } }, [key, JSON.stringify(snapshot)]);
      await p.goto(base); await p.getByRole('button', { name: 'EN', exact: true }).click(); return p;
    };
    const read = async p => ({ speed: await demo(p, () => p.getByLabel('Clock speed').inputValue()), playing: await demo(p, () => p.getByRole('button', { name: 'Pause', exact: true }).count()),
      cursor: await demo(p, async () => Number(await p.getByRole('slider').inputValue())) });
    let r = await read(await open({ ...legacy, offsetMs: paused.offsetMs - 300_000 }));
    console.log('legacy paused session:', r.speed + '×', r.playing ? 'playing' : 'paused', 'cursor delta', r.cursor - cursorBefore, 'ms');
    assert.equal(r.speed, '300'); assert.equal(r.playing, 0); assert.ok(Math.abs(r.cursor - cursorBefore) <= 60_000);
    const legacyRunning = await read(await open({ ...legacy, running: true, sessionStartMs: Date.now() - 4000, offsetMs: at('09:00') - at('05:55') }));
    console.log('legacy running session (4 s old, cursor 09:00 at 1×):', legacyRunning.speed + '×', legacyRunning.playing ? 'playing' : 'paused', new Date(legacyRunning.cursor).toISOString().slice(11, 19));
    assert.equal(legacyRunning.speed, '300'); assert.equal(legacyRunning.playing, 1);
    assert.ok(Math.abs(legacyRunning.cursor - (at('09:00') + 4000)) < 60_000 + 10_000, 'running legacy cursor is not multiplied');
    for (const speed of [1, 60]) { r = await read(await open({ ...legacy, speed, jump: 0 })); console.log('explicit', speed + '× restored as', r.speed + '×'); assert.equal(r.speed, String(speed)); }
    await context.close();
  }
  // Tomás scene at 60×
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(base); await page.getByRole('button', { name: 'EN', exact: true }).click();
  await demo(page, async () => { await page.locator('.fd-view-as select').selectOption('iss:crew-ti');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByLabel('Clock speed').selectOption('60');
    await page.getByRole('slider').evaluate((el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, at('17:17'));
    await page.getByRole('button', { name: 'Play', exact: true }).click(); });
  const notice = page.locator('[data-auto-notice]');
  const t0 = Date.now();
  await notice.waitFor({ timeout: 8000 });
  const first = await notice.textContent(); const tFirst = Date.now();
  console.log('reminder after', tFirst - t0, 'ms:', first, await notice.getAttribute('data-staged'));
  assert.match(first, /haven’t logged a water intake/);
  const count = () => page.evaluate(() => document.querySelector('#td-hydration')?.dataset.hydrationCount ?? null);
  await page.locator('[data-auto-notice]', { hasText: 'Well done' }).waitFor({ timeout: 8000 });
  console.log('confirmation', Date.now() - tFirst, 'ms after reminder; staged =', await notice.getAttribute('data-staged'));
  await demo(page, () => page.getByRole('button', { name: 'Pause', exact: true }).click());
  await page.locator('[data-auto-notice] .fd-notice-actions button').first().click(); // notice action opens Today
  await page.locator('#td-hydration').waitFor();
  console.log('hydration count after confirmation:', await count());
  // After the confirmation, rewinding to just after the reminder shows one intake fewer (the glass rises on the confirmation).
  const afterConfirm = Number(await count());
  await demo(page, () => page.getByRole('slider').evaluate((el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, at('17:22')));
  assert.equal(Number(await count()), afterConfirm - 1, 'glass rises on the 17:25 intake');
  // 300× with a notice that is not replaced: central presentation lasts 5 real seconds, then rests next to the companion.
  const times = await page.evaluate(async () => { const m = await import('/src/demo/companionNotices.ts'); return m.companionNotices('iss:crew-lf').map(n => ({ at: n.at, kind: n.kind })); });
  const target = times.find(n => n.kind === 'exercise' || n.kind === 'lab-ready' || n.kind === 'sleep');
  await demo(page, async () => { await page.getByLabel('Clock speed').selectOption('300');
    await page.locator('.fd-view-as select').selectOption('iss:crew-lf');
    await page.getByRole('slider').evaluate((el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, target.at - 4 * 60_000);
    await page.getByRole('button', { name: 'Play', exact: true }).click(); });
  assert.equal(await page.locator('[data-auto-notice]').count(), 0, 'a manual jump fires nothing');
  await page.locator('[data-auto-notice][data-staged="center"]').waitFor({ timeout: 6000 });
  const tc = Date.now();
  await page.locator('[data-auto-notice][data-staged="rest"]').waitFor({ timeout: 8000 });
  const centred = Date.now() - tc;
  console.log('300×', target.kind, 'centre phase remaining', centred, 'ms; still open:', await page.locator('[data-auto-notice]').count());
  assert.ok(centred > 3500 && centred < 5600);
  await context.close();
} finally { await browser.close(); }
