// Optional browser regression; no runtime dependency or application fixture is changed.
// See CONTRACT.md for the local Playwright/Chrome command.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_BIN ? { executablePath: process.env.BROWSER_BIN } : {}), args: ['--no-sandbox'] });
const base = process.env.FD30_BASE_URL || 'http://127.0.0.1:5173/';
const key = 'mate:fd30:imp02:v1', target = Date.parse('2027-03-10T10:41:00Z');
const results = [];
try {
  for (const locale of ['en', 'es']) for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}#/demo/fd30`);
    await page.getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
    await page.getByRole('button', { name: locale === 'es' ? 'Pausar' : 'Pause', exact: true }).click();
    await page.getByRole('slider').evaluate((el, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    }, target);
    await page.locator('.fd-nav a').filter({ hasText: locale === 'es' ? 'Ejercicio' : 'Exercise' }).click();
    await page.locator('.fd-exercise-detail').waitFor();
    await page.getByRole('button', { name: locale === 'es' ? 'Mostrar como tabla' : 'Show as table', exact: true }).click();
    await page.locator('.fd-character').focus();
    await page.keyboard.press('m'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Enter');
    await page.locator('.fd-character').click(); await page.locator('#fd-ask').fill('private continuity draft');
    const saved = () => page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), key);
    const before = await saved();
    await page.locator('.ops-perspective').click(); await page.locator('[data-surface="ground"]').waitFor();
    assert.equal(await page.getByRole('slider').inputValue(), String(target));
    assert.equal(await page.locator('.fd-chat,.fd-character,.fd-view-as,[role="status"]').count(), 0);
    await page.locator('.ops-role select').selectOption('medical_professional');
    await page.locator('[data-ops-card="iss:crew-mo"] button').click();
    assert.equal((await saved()).activeCrewId, before.activeCrewId);
    assert.equal(await page.locator('.ops-medical-empty').count(), 1);
    await page.locator('.fd-nav a[href="#/onboard/personal/exercise"]').click();
    await page.locator('#fd-ask').waitFor();
    assert.equal(await page.getByRole('slider').inputValue(), String(target));
    assert.equal(await page.locator('#fd-ask').inputValue(), 'private continuity draft');
    assert.equal(await page.locator('.fd-telemetry tbody tr').count(), 12);
    const after = await saved();
    assert.equal(after.activeCrewId, before.activeCrewId);
    assert.deepEqual(after.profiles, before.profiles);
    assert.equal(after.offsetMs, before.offsetMs); assert.equal(after.running, false);
    // A Ground detail for Lucía must also leave a non-Lucía Onboard identity untouched.
    await page.locator('#fd-ask').press('Escape');
    await page.locator('.fd-view-as select').selectOption('iss:crew-ti');
    await page.locator('.ops-navigation a[href$="/crew"]').click();
    await page.locator('[data-commander-person]').first().waitFor();
    await page.locator('.ops-perspective').click(); await page.locator('[data-surface="ground"]').waitFor();
    await page.locator('[data-ops-card="iss:crew-lf"] button').click();
    assert.equal((await saved()).activeCrewId, 'iss:crew-ti');
    await page.locator('.fd-nav a[href="#/onboard/personal/crew"]').click();
    await page.locator('[data-commander-person]').first().waitFor();
    assert.equal(await page.getByRole('slider').inputValue(), String(target));
    assert.equal(await page.locator('.fd-view-as select').inputValue(), 'iss:crew-ti');
    assert.deepEqual(errors, []);
    results.push({ locale, width, preserved: 'clock, profile, private draft, position, open chat and Exercise table' });
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify(results, null, 2));
