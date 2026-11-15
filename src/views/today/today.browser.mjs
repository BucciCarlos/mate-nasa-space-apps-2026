// HOME01 browser regression for the Onboard Today summary. Optional, like the other *.browser.mjs files:
//   PLAYWRIGHT_MODULE=/abs/playwright/index.mjs BROWSER_BIN=/abs/chrome FD30_BASE_URL=http://127.0.0.1:5173/ node src/views/today/today.browser.mjs
import assert from 'node:assert/strict';
import { demo } from '../../demo/demoDock.helpers.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_BIN ? { executablePath: process.env.BROWSER_BIN } : {}), args: ['--no-sandbox'] });
const base = process.env.FD30_BASE_URL || 'http://127.0.0.1:5173/';
const at = hhmm => Date.parse(`2027-03-10T${hhmm}:00Z`);
const owners = ['iss:crew-lf', 'iss:crew-ti', 'iss:crew-mo'];
const moments = ['05:55', '10:41', '11:50'];
const results = [];
try {
  for (const locale of ['en', 'es']) for (const width of [1440, 390]) {
    const mobile = width <= 600;
    const context = await browser.newContext({ viewport: { width, height: mobile ? 800 : 1000 }, hasTouch: mobile, isMobile: mobile, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}#/demo/fd30`);
    await page.getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
    await demo(page, () => page.getByRole('button', { name: locale === 'es' ? 'Pausar' : 'Pause', exact: true }).click());
    const seek = hhmm => demo(page, () => page.getByRole('slider').evaluate((el, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    }, at(hhmm)));
    const clock = () => demo(page, () => page.getByRole('slider').inputValue());
    const today = () => page.locator('#fd-main').evaluate(() => { location.hash = '#/demo/fd30'; });
    const backToday = async () => { await page.locator('.fd-nav a[href="#/demo/fd30"]').click(); await page.locator('.td').waitFor(); };
    const keyboardOpen = async id => { await page.locator(id).focus(); await page.keyboard.press('Enter'); };

    for (const owner of owners) for (const moment of moments) {
      await demo(page, () => page.locator('.fd-view-as select').selectOption(owner));
      await seek(moment); await backToday();
      const tag = `${locale} ${width} ${owner} ${moment}`;
      assert.equal(await page.locator('.td').getAttribute('data-today-owner'), owner, tag);
      const header = await page.locator('.td-head').innerText();
      assert.match(header, /FD30/); assert.match(header, new RegExp(moment), tag);
      // Four cards, each one link, nothing interactive nested inside.
      assert.equal(await page.locator('.td a.td-card').count(), 4, tag);
      assert.equal(await page.locator('.td .td-card a, .td .td-card button, .td .td-card input, .td .td-card select').count(), 0, tag);
      // Sleep and exercise first; stacked on mobile, side by side on desktop.
      const sb = await page.locator('#td-sleep').boundingBox(), eb = await page.locator('#td-exercise').boundingBox(), lb = await page.locator('#td-lab').boundingBox();
      assert.ok(lb.y > sb.y + sb.height - 1 && lb.y > eb.y + eb.height - 1, `labs below primary ${tag}`);
      if (mobile) assert.ok(eb.y >= sb.y + sb.height - 1, `stacked ${tag}`); else assert.ok(Math.abs(eb.y - sb.y) < 2 && eb.x > sb.x + sb.width - 1, `two columns ${tag}`);
      if (!mobile) assert.ok(sb.height <= 520 && lb.height < sb.height, `compact secondary ${tag}`);

      // Sleep card = Sleep module. Gaps are hollow markers, never zero bars.
      const sleepFd = await page.locator('#td-sleep [data-sleep-latest-fd]').getAttribute('data-sleep-latest-fd').catch(() => null);
      const sleepCaption = (await page.locator('#td-sleep .td-caption').innerText().catch(() => '')).split('·').pop().trim();
      const sleepText = await page.locator('#td-sleep').innerText();
      assert.equal(await page.locator('#td-sleep [data-gap] .td-bar, #td-exercise [data-gap] .td-bar').count(), 0, `gaps are not bars ${tag}`);
      assert.equal(await page.locator('#td-sleep .td-col-now').count(), sleepFd ? 1 : 0, `shown night highlighted ${tag}`);
      // Sleep delta vs the night right before the one shown; Lucía FD28/29/30 = 6:45/6:35/6:25.
      const deltaEl = page.locator('#td-sleep [data-sleep-delta]');
      if (owner === owners[0]) {
        assert.equal(await deltaEl.getAttribute('data-sleep-delta'), '-10', `delta ${tag}`);
        assert.match(await deltaEl.innerText(), /−10 min/); assert.match(await deltaEl.innerText(), moment === '05:55' ? /FD28/ : /FD29/);
        assert.match(sleepText, moment === '05:55' ? /FD29/ : /FD30/);
      }
      if (await deltaEl.count()) assert.match(await deltaEl.innerText(), /(\+|−)?\d+ min/, `delta format ${tag}`);
      const before = await clock();
      await keyboardOpen('#td-sleep'); await page.locator('[data-sleep-count]').waitFor();
      assert.match(page.url(), /personal\/sleep/, tag);
      assert.equal((await page.locator('[data-sleep-count]').innerText()).trim(), sleepCaption, `sleep count ${tag}`);
      if (sleepFd) assert.ok(await page.locator(`[data-sleep-point="${sleepFd}"]`).count() >= 1, `sleep latest FD in module ${tag}`);
      if (moment === '05:55' && owner === owners[0]) assert.match(sleepText, locale === 'es' ? /Aún no llegó el registro de FD30/ : /FD30 record not received yet/);
      assert.equal(await clock(), before, `opening Sleep keeps the clock ${tag}`);
      await backToday();

      // Exercise card = Exercise module.
      const exText = await page.locator('#td-exercise').innerText();
      const elapsed = await page.locator('#td-exercise [data-today-elapsed]').count() ? (await page.locator('#td-exercise [data-today-elapsed]').innerText()).slice(0, 2) : null;
      if (owner === owners[0] && moment === '10:41') assert.ok(elapsed !== null && /\d\d/.test(elapsed) && /\d+\s*(bpm|lpm)/.test(exText), `live elapsed + pulse ${tag}`);
      if (owner === owners[0] && moment === '11:50') {
        assert.match(exText, /60/, `completed duration ${tag}`);
        const mean = page.locator('#td-exercise [data-today-mean-pulse]'); assert.equal(await mean.count(), 1, tag);
        const meanText = await mean.innerText();
        assert.match(meanText, locale === 'es' ? /\d+\s*lpm/ : /\d+\s*bpm/, tag);
        assert.match(meanText, locale === 'es' ? /Frecuencia cardíaca media[\s\S]*promedio de \d+ lecturas disponibles/ : /Mean heart rate[\s\S]*average of \d+ available readings/, tag);
      } else assert.equal(await page.locator('#td-exercise [data-today-mean-pulse]').count(), 0, `mean only after finishing ${tag}`);
      if (owner === owners[0] && moment === '11:50') assert.equal(await page.locator('#td-exercise .td-last [data-exercise-latest]').count(), 0, `same session is not repeated visibly ${tag}`);
      assert.doesNotMatch(exText, /fatig|phase|fase|score|puntaje|kcal|calor/i, tag);
      if (moment === '05:55') assert.match(exText, locale === 'es' ? /Próxima reserva/ : /Next reservation/, tag);
      assert.doesNotMatch(exText, /kcal|calor|steps|pasos|goal|meta/i, tag);
      await keyboardOpen('#td-exercise'); await page.locator('.exercise-history, [data-session-phase]').first().waitFor();
      assert.match(page.url(), /personal\/exercise/, tag);
      if (elapsed !== null) assert.ok(await page.locator('[data-session-phase="live"]').count() === 1, `module shows the live session ${tag}`);
      assert.equal(await clock(), before, `opening Exercise keeps the clock ${tag}`);
      await backToday();

      // Laboratory card opens the module on the sample it shows (Lucía only has samples).
      const labs = await page.locator('#td-lab [data-lab-sample]').evaluateAll(n => n.map(e => e.getAttribute('data-lab-sample')));
      if (owner !== owners[0]) assert.deepEqual(labs, [], tag); else assert.ok(labs.length >= 1, tag);
      await keyboardOpen('#td-lab'); await page.waitForURL(/personal\/laboratory/); await page.locator('#fd-view-h').waitFor();
      assert.match(page.url(), /personal\/laboratory/, tag);
      // INT01: the module lists each received sample in its history and opens the selected one in detail.
      for (const id of labs) await page.locator(`[data-laboratory-record="${id}"]`).waitFor();
      if (labs.length && moment === '11:50') assert.ok(await page.locator('.fd-session-highlight[data-sample-id]').count() >= 1, `highlighted sample ${tag}`);
      assert.equal(await clock(), before, `opening Laboratory keeps the clock ${tag}`);
      await backToday();

      // Wellbeing: no check-in yet, link to the existing module, no scores.
      const wb = await page.locator('#td-wellbeing').innerText();
      assert.doesNotMatch(wb, /score|puntaje|\d+\s*\/\s*10/i, tag);
      await keyboardOpen('#td-wellbeing'); await page.locator('.ops-wellbeing').waitFor();
      assert.match(page.url(), /personal\/wellbeing/, tag);
      await backToday();
    }
    // A saved private check-in appears on the card (owner only).
    await demo(page, () => page.locator('.fd-view-as select').selectOption(owners[0])); await seek('10:41');
    await page.goto(`${base}#/onboard/personal/wellbeing`); await page.locator('.ops-form textarea').fill('private sample note');
    await page.locator('.ops-form button[type="submit"]').click(); await backToday();
    const saved = await page.locator('#td-wellbeing').innerText();
    assert.match(saved, locale === 'es' ? /Último check-in privado/ : /Last private check-in/); assert.doesNotMatch(saved, /private sample note/);
    await demo(page, () => page.locator('.fd-view-as select').selectOption(owners[1])); await backToday();
    assert.doesNotMatch(await page.locator('#td-wellbeing').innerText(), locale === 'es' ? /Último check-in privado/ : /Last private check-in/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'no horizontal overflow');
    assert.deepEqual(errors, []);
    results.push({ locale, width, ok: '3 profiles × 3 moments: cards, keyboard, module match, clock kept' });
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
