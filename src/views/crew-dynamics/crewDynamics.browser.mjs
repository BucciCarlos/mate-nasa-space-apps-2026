// Run against the standalone Vite example; no application route or persistent state is used.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_BIN ? { executablePath: process.env.BROWSER_BIN } : {}), args: ['--no-sandbox'] });
const base = process.env.CREW_BASE_URL || 'http://127.0.0.1:5184';
let checks = 0;
try {
  for (const locale of ['en', 'es']) for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/examples/crew-dynamics.html`);
    await page.getByLabel(/Idioma|Language/).selectOption(locale);
    await page.getByRole('heading', { name: locale === 'es' ? 'Dinámica de tripulación' : 'Crew dynamics', exact: true }).waitFor();
    const storage = () => page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage } }));
    const before = await storage();
    assert.equal(await page.locator('[data-crew-day]').count(), 7);
    await page.getByRole('button', { name: 'FD01–FD30', exact: true }).click();
    assert.equal(await page.locator('[data-crew-day]').count(), 30);
    assert.equal(await page.locator('[data-crew-day="1"]').textContent(), `FD01 · ${locale === 'es' ? 'Sin plan disponible' : 'No plan available'}`);
    for (const owner of ['iss:crew-lf', 'iss:crew-ti', 'iss:crew-mo']) {
      await page.getByLabel(locale === 'es' ? 'Perfil a bordo' : 'Onboard profile').selectOption(owner);
      await page.getByRole('button', { name: locale === 'es' ? 'Mi parte' : 'My part', exact: true }).click();
      assert.deepEqual(await page.locator('[data-crew-owner]').evaluateAll(rows => [...new Set(rows.map(r => r.dataset.crewOwner))]), [owner]);
      await page.getByRole('button', { name: locale === 'es' ? 'Tabla de misión' : 'Mission table', exact: true }).click();
    }
    const perspective = page.getByLabel(locale === 'es' ? 'Perspectiva' : 'Perspective', { exact: true });
    await perspective.selectOption('mission_operator');
    const ops = await page.locator('section.crew-dynamics').innerText();
    await perspective.selectOption('medical_professional');
    assert.equal(await page.locator('section.crew-dynamics').innerText(), ops);
    assert.equal(await page.getByRole('button', { name: locale === 'es' ? 'Mi parte' : 'My part', exact: true }).count(), 0);
    assert.deepEqual(await storage(), before);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    // Keyboard reachable scroll region keeps wide tables within the narrow viewport.
    assert.equal(await page.locator('section.crew-dynamics [role="region"][tabindex="0"]').count(), 2);
    assert.deepEqual(errors, []);
    if (process.env.CREW_SCREENSHOTS) await page.screenshot({ path: `${process.env.CREW_SCREENSHOTS}/crew-${locale}-${width}.png`, fullPage: true });
    await page.close(); checks++;
  }
  console.log(`CAT04: ${checks} locale/viewport combinations passed; filters, owner changes, roles, coverage and storage checked.`);
} finally { await browser.close(); }
