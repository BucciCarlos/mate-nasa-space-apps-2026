// Optional HIST01 acceptance; set FD30_BASE_URL to the local Vite preview of a build.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_BIN ? { executablePath: process.env.BROWSER_BIN } : {}), args: ['--no-sandbox'] });
const base = process.env.FD30_BASE_URL || 'http://127.0.0.1:5173/';
const key = 'mate:fd30:imp02:v1', owners = ['iss:crew-lf','iss:crew-ti','iss:crew-mo'];
const at = h => Date.parse(`2027-03-10T${h}:00Z`);
const results = [];
try {
  for (const locale of ['en','es']) for (const width of [1440,390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base); await page.getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
    await page.getByRole('button', { name: locale === 'es' ? 'Pausar' : 'Pause', exact: true }).click();
    const saved = () => page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), key);
    const seek = async h => {
      await page.getByRole('slider').evaluate((el, value) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
      }, at(h));
      assert.equal(Number(await page.getByRole('slider').inputValue()), at(h));
    };
    const sameTime = async h => assert.equal(Number(await page.getByRole('slider').inputValue()), at(h));
    const openSleep = async () => { await page.locator('.fd-nav a[href="#/onboard/personal/sleep"]').click(); await page.locator('.sleep-history').waitFor(); };
    const switchPerspective = () => page.locator('.fd-perspective-switch').click();
    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i];
      await page.locator('.fd-view-as select').selectOption(owner); await openSleep(); await seek('05:55');
      assert.equal(await page.locator('.sleep-history').getAttribute('data-sleep-owner'), owner);
      assert.equal(await page.locator('[data-sleep-day]').count(), 7);
      assert.equal(await page.locator('[data-sleep-point]').count(), [6,6,5][i]);
      const beforeRange = await saved();
      await page.getByRole('button', { name: 'FD01–FD30', exact: true }).click();
      assert.equal(await page.locator('[data-sleep-day]').count(), 30);
      assert.equal(await page.locator('[data-sleep-point]').count(), [27,29,28][i]);
      assert.equal(await page.locator('[data-sleep-point="30"]').count(), 0);
      const afterRange = await saved();
      assert.equal(afterRange.offsetMs, beforeRange.offsetMs); assert.deepEqual(afterRange.processedIds, beforeRange.processedIds);
      await page.locator('[data-sleep-day="1"]').click();
      assert.match(await page.locator('.sleep-detail').innerText(), /2027-02-09/);
      if (i === 2) {
        await page.locator('[data-sleep-day="27"]').click();
        assert.equal(await page.locator('[data-sleep-point="27"]').count(), 0);
        assert.equal(await page.locator('[data-sleep-segment]').evaluateAll(nodes => nodes.some(n => {
          const days = n.dataset.sleepSegment.split(',').map(Number); return days.some(fd => fd < 27) && days.some(fd => fd > 27);
        })), false);
        assert.match(await page.locator('[data-sleep-duration]').innerText(), locale === 'es' ? /Sin registro/ : /No record/);
      }
      if (process.env.FD30_SCREENSHOTS) await page.locator('.sleep-trend').screenshot({ path: `${process.env.FD30_SCREENSHOTS}/${locale}-${width}-${i}-trend.png` });
      await page.locator('[data-sleep-day="29"]').click();
      assert.match(await page.locator('[data-sleep-duration]').innerText(), new RegExp(['6:35','7:10','7:25'][i]));
      if (process.env.FD30_SCREENSHOTS) await page.locator('.sleep-detail').screenshot({ path: `${process.env.FD30_SCREENSHOTS}/${locale}-${width}-${i}-detail.png` });
      await sameTime('05:55');
      await page.getByRole('button', { name: locale === 'es' ? 'Últimos 7 días' : 'Last 7 days', exact: true }).click();
      await page.locator('[data-sleep-day="30"]').click();
      await seek('00:00');
      assert.equal(await page.locator('[data-sleep-point="30"]').count(), 0);
      assert.match(await page.locator('.sleep-plan').innerText(), /2027-03-09 · 21:30 UTC/);
      await page.reload(); await page.locator('.sleep-history').waitFor(); await sameTime('00:00');
      assert.equal(await page.locator('[data-sleep-point="30"]').count(), 0);
      await seek('06:00');
      assert.equal(await page.locator('[data-sleep-point="30"]').count(), i === 0 ? 1 : 0);
      const announcements = (await saved()).profiles[owner].announcedIds;
      await seek('05:59'); assert.equal(await page.locator('[data-sleep-point="30"]').count(), 0);
      await seek('06:00'); assert.equal(await page.locator('[data-sleep-point="30"]').count(), i === 0 ? 1 : 0);
      assert.deepEqual((await saved()).profiles[owner].announcedIds, announcements);
      await page.locator('.fd-nav a[href="#/demo/fd30"]').click();
      const summary = await page.locator('[data-sleep-latest]').innerText();
      const fd = i === 0 ? 'FD30' : 'FD29', duration = ['6:25','7:10','7:25'][i];
      assert.ok(summary.includes(fd) && summary.includes(duration));
      await page.locator('.fd-character').click(); await page.locator('#fd-ask').fill(locale === 'es' ? 'mi sueño' : 'my sleep');
      await page.locator('#fd-ask').press('Enter');
      const reply = await page.locator('.fd-chat-answer p').last().innerText();
      assert.ok(reply.includes(fd) && reply.includes(duration));
      await page.locator('#fd-ask').fill(`private-${i}`);
      const beforeGround = await saved();
      await switchPerspective(); await page.locator('[data-ops-card]').first().waitFor();
      await page.locator('.ops-role select').selectOption('mission_operator');
      await page.locator('[data-ops-card]').first().locator('button').click();
      assert.equal(await page.locator('.sleep-history,.sleep-summary,.fd-chat,.fd-character').count(), 0);
      assert.doesNotMatch(await page.locator('.ops').innerText(), /h:min|iss:sleep:|fd30-sleep|durationMinutes/);
      await page.locator('.ops-role select').selectOption('medical_professional');
      assert.equal(await page.locator('.ops-medical-empty').count(), 1);
      assert.equal((await saved()).activeCrewId, owner); await sameTime('06:00');
      await switchPerspective(); await page.locator('#fd-ask').waitFor();
      assert.equal(await page.locator('#fd-ask').inputValue(), `private-${i}`);
      assert.deepEqual((await saved()).profiles, beforeGround.profiles);
      await page.locator('#fd-ask').press('Escape'); await openSleep();
      await seek('23:59');
      assert.equal(await page.locator('[data-sleep-point="30"]').count(), i === 0 ? 1 : 0);
      assert.equal((await saved()).version, 6);
    }
    // Sources is documentation only, identical across perspectives, and holds no private rows.
    await page.locator('.fd-demo .fd-secondary-link').click();
    await page.getByRole('tab', { name: locale === 'es' ? 'Fuentes' : 'Sources', exact: true }).click();
    const onboardSource = await page.locator('[data-fd30-sleep-source]').innerText();
    assert.ok(onboardSource.includes('fd30-sleep.1'));
    assert.doesNotMatch(onboardSource, /iss:sleep:|6:25|FD27|Mei Okada|Lucía Ferraro/);
    await switchPerspective(); await page.locator('[data-ops-card]').first().waitFor();
    await page.locator('.fd-demo .fd-secondary-link').click();
    await page.getByRole('tab', { name: locale === 'es' ? 'Fuentes' : 'Sources', exact: true }).click();
    assert.equal(await page.locator('[data-fd30-sleep-source]').innerText(), onboardSource);
    await switchPerspective(); await sameTime('23:59');
    assert.equal((await saved()).activeCrewId, owners[2]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(errors, []);
    results.push({ locale, width, profiles: 3, ranges: '7/30', midnight: true, replay: true, sameSummary: true, privacy: true });
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify(results, null, 2));
