// CAT05/CAT08: local browser matrix. Requires external Playwright and Chrome; no application dependency.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.BROWSER_BIN || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
const base = process.env.FD30_BASE_URL || 'http://127.0.0.1:5197/';
const results = [];
try {
  for (const locale of ['en', 'es']) for (const width of [1440, 390]) for (const role of ['onboard', 'mission_operator', 'medical_professional']) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}#/demo/fd30${role === 'onboard' ? '' : '/ground'}`);
    await page.getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
    if (role !== 'onboard') await page.locator('.ops-role select').selectOption(role);
    await page.locator('.fd-nav a[href$="catalog"]').click();
    await page.locator('.mcat-card').last().waitFor();
    assert.equal(await page.locator('.mcat-card').count(), 14);
    assert.equal(await page.locator('.mcat-grid > article:visible').count(), 14);
    assert.equal(await page.locator('.mcat-future,.mcat-now').count(), 0);
    assert.equal(await page.locator('.mcat-head h1').innerText(), locale === 'es' ? 'Catálogo de módulos' : 'Module catalog');
    assert.ok(await page.locator('.mcat-head p').innerText());
    const horizontalOverflow = await page.locator('.mcat').evaluate(el => el.scrollWidth > el.clientWidth + 1);
    assert.equal(horizontalOverflow, false);
    const links = await page.locator('.mcat a[href^="#"]').evaluateAll(els => els.map(el => el.getAttribute('href')));
    assert.equal(new Set(links).size, links.length);
    if (role !== 'onboard') assert.ok(links.every(h => h.startsWith('#/demo/fd30/ground/')));
    for (const href of links) {
      await page.locator(`.mcat a[href="${href}"]`).click();
      await page.waitForURL(url => url.hash === href);
      assert.equal(await page.getByText(/This view is not available|Esta vista no está disponible/, { exact: false }).count(), 0);
      await page.goBack(); await page.locator('.mcat-card').last().waitFor();
    }
    // CAT08: the dialog replaces "More details": opens, focuses its title, closes with Escape and returns focus to the card's button.
    const button = page.locator('.mcat-detail-btn').first();
    await button.focus(); await page.keyboard.press('Enter');
    await page.locator('dialog.mcat-modal[open]').waitFor();
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'H2');
    await page.keyboard.press('Escape');
    await page.locator('dialog.mcat-modal').waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('mcat-detail-btn')), true);
    assert.deepEqual(errors, []);
    if (role === 'onboard') await page.screenshot({ path: `/tmp/mate-cat05-${locale}-${width}.png`, fullPage: true });
    results.push({ locale, width, role, cards: 14, links: links.length });
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify(results, null, 2));
