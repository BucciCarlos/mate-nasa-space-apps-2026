// Optional DAY01 browser acceptance against a local build; no application data is persisted outside its browser context.
import assert from 'node:assert/strict';
import { demo } from './demoDock.helpers.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_BIN ? { executablePath: process.env.BROWSER_BIN } : {}), args: ['--no-sandbox'] });
const base = process.env.FD30_BASE_URL || 'http://127.0.0.1:5173/';
const key = 'mate:fd30:imp02:v1', owners = ['iss:crew-lf', 'iss:crew-ti', 'iss:crew-mo'];
const at = h => Date.parse(`2027-03-10T${h}:00Z`);
const results = [];
try {
  for (const locale of ['en', 'es']) for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
    assert.ok(Math.abs(Number(await demo(page, () => page.getByRole('slider').inputValue())) - at('05:55')) < 60000);
    await demo(page, () => page.getByRole('button', { name: locale === 'es' ? 'Pausar' : 'Pause', exact: true }).click());
    const saved = () => page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), key);
    const seek = async h => {
      await demo(page, () => page.getByRole('slider').evaluate((el, value) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
      }, at(h)));
      assert.equal(Number(await demo(page, () => page.getByRole('slider').inputValue())), at(h));
    };
    const sameTime = async h => assert.equal(Number(await demo(page, () => page.getByRole('slider').inputValue())), at(h));
    const switchPerspective = () => demo(page, () => page.locator('.fd-perspective-switch').click());
    const plans = [];
    for (const owner of owners) {
      await demo(page, () => page.locator('.fd-view-as select').selectOption(owner));
      await page.locator('.fd-nav a[href="#/onboard/personal/agenda"]').click();
      await page.locator(`[data-schedule-owner="${owner}"]`).waitFor();
      plans.push(await page.locator('[data-schedule-block]').evaluateAll(nodes => nodes.map(n => n.dataset.scheduleBlock)));
      await seek('00:00');
      assert.equal(await page.locator('[data-schedule-marker]').getAttribute('data-schedule-marker'), String(at('00:00')));
      const scroll = page.locator('.fd-schedule-scroll');
      await scroll.evaluate(el => { el.scrollLeft = 0; });
      assert.equal(await page.locator('[data-schedule-block]').first().evaluate(el => parseFloat(el.style.left)), 0);
      assert.match(await page.locator('[data-schedule-block]').first().innerText(), /FD29 21:30/);
      await scroll.evaluate(el => { el.scrollLeft = el.scrollWidth; });
      const closing = await page.locator('.fd-schedule-close time').boundingBox();
      const viewport = await scroll.boundingBox();
      assert.ok(closing.x >= viewport.x && closing.x + closing.width <= viewport.x + viewport.width);
      const last = page.locator('[data-schedule-block]').last();
      await last.click();
      assert.match(await page.locator('#fd-schedule-detail').innerText(), /21:30–24:00 UTC/);
      assert.match(await last.innerText(), locale === 'es' ? /continúa después/ : /continues after/);
      await sameTime('00:00');
      assert.equal(await page.locator('[data-schedule-module]').count(), 0);
      await page.locator('.fd-schedule-toolbar button').click(); await sameTime('00:00');
      const name = await page.locator('.fd-schedule-profile strong').innerText();
      const profileBefore = (await saved()).activeCrewId;
      await switchPerspective(); await page.locator('[data-ops-card]').first().waitFor();
      await page.locator('.fd-nav a[href="#/demo/fd30/ground/agenda"]').click();
      await page.locator('.gat-now-chip').waitFor();
      await page.locator('.gat-scroll').evaluate(el => { el.scrollLeft = el.scrollWidth; });
      const boxes = await page.locator('.gat-name').evaluateAll(nodes => nodes.map(n => ({ x: n.getBoundingClientRect().x, name: n.innerText })));
      assert.equal(boxes.length, 3); assert.ok(boxes.every(b => b.x >= 0 && b.x < width));
      await page.locator('.gat-track').first().locator('.blk').last().click();
      assert.match(await page.locator('.fd-ground-plan-detail').innerText(), /21:30–24:00 UTC/);
      assert.equal(await page.locator('.fd-chat,.fd-character,[data-schedule-module]').count(), 0);
      await page.locator('.gat-tools button').click(); await sameTime('00:00');
      await page.locator('.ga-views button').nth(1).click();
      assert.equal(await page.locator('.gac-card').count(), 3);
      assert.match(await page.locator('.gac-card').first().innerText(), /21:30–24:00 UTC/);
      assert.doesNotMatch(await page.locator('.fd-ground-agenda').innerText(), /Toma de sangre|Blood collection|sample-lf|exercise.started/);
      await sameTime('00:00');
      await switchPerspective(); await page.locator('.fd-schedule-profile strong').waitFor();
      assert.equal((await saved()).activeCrewId, profileBefore);
      assert.equal(await page.locator('.fd-schedule-profile strong').innerText(), name);
      await sameTime('00:00');
      await seek('21:30');
      await scroll.evaluate(el => { el.scrollLeft = el.scrollWidth; });
      await last.click(); await sameTime('21:30');
      if (owner === 'iss:crew-mo' && process.env.FD30_SCREENSHOTS) {
        await page.locator('.fd-schedule').screenshot({ path: `${process.env.FD30_SCREENSHOTS}/${locale}-${width}-personal.png` });
        await switchPerspective(); await page.locator('.fd-nav a[href="#/demo/fd30/ground/agenda"]').click();
        await page.locator('.gat-scroll').evaluate(el => { el.scrollLeft = el.scrollWidth; });
        await page.locator('.fd-ground-agenda').screenshot({ path: `${process.env.FD30_SCREENSHOTS}/${locale}-${width}-ground.png` });
        await switchPerspective();
      }
    }
    assert.equal(new Set(plans.map(p => JSON.stringify(p))).size, 3);
    await demo(page, () => page.locator('.fd-view-as select').selectOption(owners[0]));
    await page.locator('.fd-character').click(); await page.locator('#fd-ask').fill('DAY01 private draft');
    await page.locator('#fd-ask').press('Escape');
    await page.locator('.fd-nav a[href="#/onboard/personal/laboratory"]').click();
    await seek('11:50');
    let before = await saved();
    assert.equal(before.laboratory.filter(s => s.result).length, 2);
    const announced = before.profiles[owners[0]].announcedIds;
    await seek('00:00');
    assert.equal((await saved()).laboratory.filter(s => s.result).length, 0);
    assert.equal(await page.locator('.fd-lab-timeline [data-received="true"]').count(), 0);
    await page.reload();
    await sameTime('00:00');
    assert.equal((await saved()).profiles[owners[0]].draft, 'DAY01 private draft');
    await seek('11:44'); assert.equal((await saved()).laboratory.filter(s => s.result).length, 0);
    await seek('11:45'); assert.equal((await saved()).laboratory.filter(s => s.result).length, 1);
    await seek('11:50'); before = await saved();
    assert.equal(before.laboratory.filter(s => s.result).length, 2);
    assert.equal(new Set(before.processedIds).size, before.processedIds.length);
    assert.deepEqual(before.profiles[owners[0]].announcedIds, announced);
    assert.equal(await demo(page, () => page.locator('.fd-next').isDisabled()), true);
    await demo(page, () => page.getByRole('button', { name: locale === 'es' ? 'Reproducir' : 'Play', exact: true }).click());
    assert.equal((await saved()).running, true); // end of script is not end of day
    await seek('23:59');
    assert.equal((await saved()).running, false);
    assert.equal(await demo(page, () => page.getByRole('button', { name: '+15 min', exact: true }).isDisabled()), true);
    await switchPerspective(); await page.locator('.ops-role select').selectOption('medical_professional');
    await page.locator('[data-ops-card]').first().locator('button').click();
    assert.equal(await page.locator('.ops-medical-empty').count(), 1);
    await switchPerspective(); await sameTime('23:59');
    assert.equal((await saved()).activeCrewId, owners[0]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(errors, []);
    await context.close();
    // Real browser startup migration: v5 -> v6, then a signed-offset reload.
    const migratedContext = await browser.newContext({ viewport: { width, height: 1000 } });
    const profile = () => ({ announcedIds: [], guidedOpenedIds: [], seen: false, draft: 'legacy draft',
      turns: [{ text: 'mi agenda', lang: 'es', reply: 'agenda' }], position: { x: .25, y: .7 },
      exerciseSeenIds: [], highlightedSessionId: null, labSeenIds: [], highlightedSampleId: null });
    await migratedContext.addInitScript(({ key, owners, offset }) => {
      if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify({ version: 5, playback: 'explore', running: false,
        sessionStartMs: Date.now() - 1000, offsetMs: offset, activeCrewId: owners[2], wakeReceived: false,
        processedIds: [], exercise: [], laboratory: [], diagnostics: [], profiles: Object.fromEntries(owners.map(o => [o, {
          announcedIds: [], guidedOpenedIds: [], seen: false, draft: 'legacy draft', turns: [{ text: 'mi agenda', lang: 'es', reply: 'agenda' }],
          position: { x: .25, y: .7 }, exerciseSeenIds: [], highlightedSessionId: null, labSeenIds: [], highlightedSampleId: null,
        }])) }));
    }, { key, owners, offset: at('10:41') - at('05:55') });
    const migratedPage = await migratedContext.newPage(); await migratedPage.goto(base);
    const state = await migratedPage.evaluate(key => JSON.parse(sessionStorage.getItem(key)), key);
    assert.equal(state.version, 6); assert.equal(state.activeCrewId, owners[2]);
    assert.equal(await demo(migratedPage, () => migratedPage.getByRole('slider').inputValue()), String(at('10:41')));
    assert.deepEqual(state.profiles[owners[2]], profile());
    await migratedContext.close();
    results.push({ locale, width, profiles: 3, midnight: true, perspectiveRoundTrips: true, replay: true, migration: true });
  }
} finally { await browser.close(); }
console.log(JSON.stringify(results, null, 2));
