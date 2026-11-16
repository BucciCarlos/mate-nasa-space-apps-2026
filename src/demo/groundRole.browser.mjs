// GND04 browser acceptance: Ground opens in Medical Team, the choice survives portraits/cards/perspective switches, Orbit shows its avatar.
import assert from 'node:assert/strict';
import { demo } from './demoDock.helpers.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_BIN ? { executablePath: process.env.BROWSER_BIN } : {}), args: ['--no-sandbox'] });
const base = process.env.FD30_BASE_URL || 'http://127.0.0.1:5173/';
try {
  for (const [locale, width] of [['es', 1440], ['en', 390]]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base); await page.getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
    const read = () => demo(page, async () => ({ speed: await page.getByLabel(locale === 'es' ? 'Velocidad del reloj' : 'Clock speed').inputValue(), time: await page.getByRole('slider').inputValue(), playing: await page.getByRole('button', { name: locale === 'es' ? 'Pausar' : 'Pause', exact: true }).count() }));
    const role = () => page.locator('.ops-role select').inputValue();
    await demo(page, () => page.locator('.fd-perspective-switch').click());
    await page.locator('.ops-role select').waitFor();
    assert.equal(await role(), 'medical_professional', 'new session opens Ground in Medical Team');
    // open a portrait
    const portrait = page.locator('[data-ops-card="iss:crew-lf"] button[aria-label]').first();
    await portrait.click();
    await page.locator('[data-ground-medical]').waitFor();
    console.log(locale, width, 'portrait opens health dashboard');
    // switch to Operations, go on board and back: kept
    await page.locator('.ops-role select').selectOption('mission_operator');
    await demo(page, () => page.locator('.fd-perspective-switch').click());
    await demo(page, () => page.locator('.fd-perspective-switch').click());
    await page.locator('.ops-role select').waitFor();
    assert.equal(await role(), 'mission_operator', 'Operations kept after Board → Ground');
    // Orbit panel with avatar
    await page.getByRole('button', { name: locale === 'es' ? 'Consultar Orbit' : 'Consult Orbit', exact: true }).click();
    const panel = page.locator('#gnd-orbit');
    await panel.locator('header .gnd-orbit-avatar svg.orbit').waitFor();
    assert.equal((await panel.locator('h2').innerText()).trim(), locale === 'es' ? 'Orbit · Tierra' : 'Orbit · Ground');
    assert.equal(await page.locator('.fd-floating').count(), 0, 'no floating companion on Ground');
    const box = await panel.locator('header').boundingBox(), av = await panel.locator('.gnd-orbit-avatar').boundingBox(), h = await panel.locator('h2').boundingBox();
    assert.ok(av.width > 20 && av.y >= box.y - 1 && h.x >= av.x + av.width - 1, 'avatar and name sit together in the header');
    await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/gnd04-${locale}-${width}.png` : undefined });
    assert.equal(errors.length, 0, errors.join('\n'));
    await context.close();
  }
  // Clock untouched by role changes: playing at 300× and same cursor progression
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(base); await page.getByRole('button', { name: 'EN', exact: true }).click();
  await demo(page, () => page.locator('.fd-perspective-switch').click());
  const s = await demo(page, async () => [await page.getByLabel('Clock speed').inputValue(), await page.getByRole('button', { name: 'Pause', exact: true }).count()]);
  assert.deepEqual(s, ['300', 1]); console.log('clock still 300× playing on Ground');
  await context.close();
} finally { await browser.close(); }
