// HIST02 acceptance against a local build. Optional PLAYWRIGHT_MODULE/BROWSER_BIN adapters.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { demo } from '../demoDock.helpers.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_BIN ? { executablePath: process.env.BROWSER_BIN } : {}), args: ['--no-sandbox'] });
const base = process.env.FD30_BASE_URL || 'http://127.0.0.1:5173/';
const shots = process.env.FD30_SCREENSHOTS;
if (shots) await mkdir(shots, { recursive: true });
const key = 'mate:fd30:imp02:v1', owners = ['iss:crew-lf','iss:crew-ti','iss:crew-mo'];
const at = h => Date.parse(`2027-03-10T${h}:00Z`), results = [];
try {
  for (const locale of ['en','es']) for (const width of [1440,390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base); await page.getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
    await demo(page, () => page.getByRole('button', { name: locale === 'es' ? 'Pausar' : 'Pause', exact: true }).click());
    const saved = () => page.evaluate(k => JSON.parse(sessionStorage.getItem(k)), key);
    const seek = async h => {
      await demo(page, () => page.getByRole('slider').evaluate((el, value) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
      }, at(h)));
      assert.equal(Number(await demo(page, () => page.getByRole('slider').inputValue())), at(h));
    };
    const open = async () => { await page.locator('.fd-nav a[href="#/onboard/personal/exercise"]').click(); await page.locator('.exercise-history').waitFor(); };
    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i]; await demo(page, () => page.locator('.fd-view-as select').selectOption(owner)); await open(); await seek('05:55');
      await page.getByRole('button', { name: locale === 'es' ? 'Últimos 7 días' : 'Last 7 days', exact: true }).click();
      assert.equal(await page.locator('.exercise-history').getAttribute('data-exercise-owner'), owner);
      assert.equal(await page.locator('[data-exercise-day]').count(), 7);
      assert.equal(await page.locator('[data-exercise-point]').count(), [3,3,3][i]);
      const before = await saved();
      await page.getByRole('button', { name: 'FD01–FD30', exact: true }).click();
      assert.equal(await page.locator('[data-exercise-day]').count(), 30);
      assert.deepEqual(await saved(), before);
      await page.locator('[data-exercise-day="1"]').click();
      assert.match(await page.locator('.exercise-day-detail').innerText(), /2027-02-09/);
      assert.equal(await page.locator('.exercise-day-detail').evaluate(el => document.activeElement === el), true);
      if (i === 0) {
        await page.locator('[data-exercise-day="17"]').click();
        assert.match(await page.locator('.exercise-day-detail').innerText(), locale === 'es' ? /Sin registro/ : /No record/);
        await page.locator('[data-exercise-day="24"]').click();
        assert.match(await page.locator('.exercise-day-detail').innerText(), locale === 'es' ? /No aplica/ : /Not applicable/);
      }
      if (i === 1) {
        assert.equal(await page.locator('[data-exercise-difference]').getAttribute('data-exercise-difference'), '-19');
        assert.match(await page.locator('.exercise-comparison').innerText(), /FD29/);
        if (shots) await page.locator('.exercise-comparison').screenshot({ path: `${shots}/${locale}-${width}-tomas-comparison.png` });
      }
      if (i === 2) {
        assert.equal(await page.locator('[data-exercise-day="26"]').getAttribute('data-status'), 'no_record');
        assert.equal(await page.locator('[data-exercise-day="27"]').getAttribute('data-status'), 'no_activity');
      }
      await page.locator('[data-exercise-day="29"]').click();
      assert.equal(await page.locator('[data-exercise-record]').count(), 1);
      if (shots) {
        await page.locator('.exercise-trend').screenshot({ path: `${shots}/${locale}-${width}-${i}-trend.png` });
        await page.locator('.exercise-day-detail').screenshot({ path: `${shots}/${locale}-${width}-${i}-detail.png` });
      }
      await page.locator('.exercise-table > summary').click(); assert.equal(await page.locator('.exercise-table tbody tr').count(), 30);
      await seek('10:29'); assert.equal(await page.locator('[data-session-phase]').count(), 0);
      await seek('10:41');
      assert.equal(await page.locator('[data-session-phase="live"]').count(), i === 0 ? 1 : 0);
      if (i === 0) assert.equal(await page.locator('[data-session-metric="power"] strong').getAttribute('data-reading-value'), '140');
      await seek('10:54');
      if (i === 0) assert.equal(await page.locator('[data-session-metric="power"] strong').getAttribute('data-reading-value'), 'missing');
      await seek('11:30'); await page.locator('[data-exercise-day="30"]').click();
      assert.equal(await page.locator('[data-exercise-record="iss:session-lf-1"]').count(), i === 0 ? 1 : 0);
      assert.equal(await page.locator('[data-session-phase]').count(), 0);
      const notices = (await saved()).profiles[owner].announcedIds;
      await seek('00:00'); assert.equal(await page.locator('[data-exercise-record="iss:session-lf-1"]').count(), 0);
      await seek('11:30'); assert.equal(await page.locator('[data-exercise-record="iss:session-lf-1"]').count(), i === 0 ? 1 : 0);
      assert.deepEqual((await saved()).profiles[owner].announcedIds, notices);
      await seek('23:59');
      assert.equal(await page.locator('[data-exercise-day="30"]').getAttribute('data-status'), i === 0 ? 'recorded' : 'no_record');
      await page.locator('.fd-nav a[href="#/demo/fd30"]').click();
      const latest = await page.locator('[data-exercise-latest]').innerText();
      assert.match(latest, i === 0 ? /FD30/ : /FD29/);
      await page.locator('.fd-character').click(); await page.locator('#fd-ask').fill(locale === 'es' ? 'mi ejercicio' : 'my exercise'); await page.locator('#fd-ask').press('Enter');
      assert.ok((await page.locator('.fd-chat-answer p').last().innerText()).includes(latest));
      await seek('23:58'); assert.equal(await page.locator('.fd-chat-pair').count(), 0);
      await seek('23:59'); assert.equal(await page.locator('.fd-chat-pair').count(), 1);
      await page.locator('#fd-ask').fill(`private-${i}`); const privateBefore = (await saved()).profiles;
      await demo(page, () => page.locator('.fd-perspective-switch').click()); await page.locator('[data-ops-card]').first().waitFor();
      await page.locator('[data-ops-card]').first().locator('button').click();
      for (const role of ['mission_operator','medical_professional']) {
        await page.locator('.ops-role select').selectOption(role);
        assert.equal(await page.locator('.exercise-history,[data-exercise-summary],.fd-chat,.fd-character').count(), 0);
        assert.doesNotMatch(await page.locator('.ops').innerText(), /powerW|cadenceRpm|fd30-exercise-history|iss:history:.*exercise/);
        if (role === 'medical_professional') assert.equal(await page.locator('.ops-medical-empty').count(), 1);
      }
      await demo(page, () => page.locator('.fd-perspective-switch').click()); await page.locator('#fd-ask').waitFor();
      assert.equal(await page.locator('#fd-ask').inputValue(), `private-${i}`); assert.deepEqual((await saved()).profiles, privateBefore);
      await page.locator('#fd-ask').press('Escape'); await open();
      assert.equal(Number(await demo(page, () => page.getByRole('slider').inputValue())), at('23:59'));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    }
    await demo(page, () => page.locator('.fd-demo .fd-secondary-link').click());
    await page.getByRole('tab', { name: locale === 'es' ? 'Fuentes' : 'Sources', exact: true }).click();
    const source = await page.locator('[data-fd30-exercise-source]').innerText();
    assert.ok(source.includes('fd30-exercise-history.1')); assert.doesNotMatch(source, /iss:history:|Lucía|Tomás|Mei|powerW/);
    await demo(page, () => page.locator('.fd-perspective-switch').click()); await page.locator('[data-ops-card]').first().waitFor();
    await demo(page, () => page.locator('.fd-demo .fd-secondary-link').click());
    await page.getByRole('tab', { name: locale === 'es' ? 'Fuentes' : 'Sources', exact: true }).click();
    assert.equal(await page.locator('[data-fd30-exercise-source]').innerText(), source);
    assert.deepEqual(errors, []); results.push({ locale, width, profiles: 3, ranges: '7/30', comparison: true, absences: true, replay: true, privacy: true });
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify(results, null, 2));
