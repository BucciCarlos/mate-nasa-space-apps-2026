// CAT08 browser regression: the 14 catalog dialogs. Optional, like the other *.browser.mjs files:
//   PLAYWRIGHT_MODULE=/abs/playwright/index.mjs BROWSER_BIN=/abs/chrome FD30_BASE_URL=http://127.0.0.1:5173/ node src/views/catalog/catalogModal.browser.mjs
import assert from 'node:assert/strict';
import { demo } from '../../demo/demoDock.helpers.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_BIN ? { executablePath: process.env.BROWSER_BIN } : {}), args: ['--no-sandbox'] });
const base = process.env.FD30_BASE_URL || 'http://127.0.0.1:5173/';
const at = hhmm => Date.parse(`2027-03-10T${hhmm}:00Z`);
const owners = ['iss:crew-lf', 'iss:crew-ti', 'iss:crew-mo'];
const results = [];
const lum = ([r, g, b]) => { const c = [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const rgb = css => css.match(/[\d.]+/g).slice(0, 3).map(Number);

async function open(locale, width, { ground = null, owner = null, hhmm = '12:00' } = {}) {
  const mobile = width <= 760;
  const context = await browser.newContext({ viewport: { width, height: mobile ? 780 : 900 }, hasTouch: mobile, isMobile: mobile, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}#/demo/fd30${ground ? '/ground' : ''}`);
  await page.getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
  await demo(page, () => page.getByRole('button', { name: locale === 'es' ? 'Pausar' : 'Pause', exact: true }).click());
  if (owner && !ground) await demo(page, () => page.locator('.fd-view-as select').selectOption(owner));
  await demo(page, () => page.getByRole('slider').evaluate((el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, at(hhmm)));
  if (ground) await page.locator('.ops-role select').selectOption(ground);
  await page.locator('.fd-nav a[href$="catalog"]').click();
  await page.locator('.mcat-card').last().waitFor();
  const dialog = page.locator('dialog.mcat-modal[open]');
  const card = id => page.locator(`[data-module="${id}"] .mcat-detail-btn`);
  const openCard = async id => { await card(id).focus(); await page.keyboard.press('Enter'); await dialog.waitFor(); };
  const text = async () => dialog.innerText();
  return { context, page, errors, dialog, card, openCard, text, mobile };
}

for (const locale of ['en', 'es']) for (const width of [1440, 390]) {
  const tag = `${locale} ${width}`;
  // 1. Grid, keyboard, focus, layout, theme: Lucía on board.
  {
    const s = await open(locale, width);
    assert.equal(await s.page.locator('.mcat-card').count(), 14, `${tag}: fourteen cards in one grid`);
    assert.equal(await s.page.locator('.mcat-grid').count(), 1);
    assert.equal(await s.page.locator('h1, h2').filter({ hasText: locale === 'es' ? 'Catálogo de módulos' : 'Module catalog' }).count(), 1, `${tag}: the catalog title is not duplicated`);
    assert.equal(await s.page.evaluate(() => document.activeElement?.id), 'fd-view-h', `${tag}: the single visible heading takes the focus`);
    // Tab order through the grid reaches each card button.
    await s.page.locator('[data-module="MOD-CARDIO"] .mcat-detail-btn').focus();
    await s.page.keyboard.press('Tab'); await s.page.keyboard.press('Tab');
    assert.ok(await s.page.evaluate(() => !!document.activeElement?.closest('.mcat-card')), `${tag}: keyboard moves through the grid`);
    await s.openCard('MOD-CREW');
    assert.equal(await s.page.evaluate(() => document.activeElement?.tagName), 'H2', `${tag}: focus on the dialog title`);
    for (let i = 0; i < 24; i++) { await s.page.keyboard.press('Tab'); assert.ok(await s.page.evaluate(() => !!document.activeElement?.closest('dialog')), `${tag}: focus trapped inside the dialog`); }
    const box = await s.dialog.boundingBox(), vp = s.page.viewportSize();
    if (s.mobile) { assert.ok(Math.abs(box.y + box.height - vp.height) < 2 && Math.abs(box.width - vp.width) < 2 && box.height <= vp.height * .92 + 1, `${tag}: bottom sheet`); }
    else { assert.ok(Math.abs(box.x + box.width / 2 - vp.width / 2) < 2 && Math.abs(box.y + box.height / 2 - vp.height / 2) < 4 && box.width <= 720, `${tag}: centered dialog`); }
    const scrollY = await s.page.evaluate(() => scrollY);
    const scroller = s.dialog.locator('.mcat-modal-scroll');
    assert.equal(await scroller.evaluate(el => getComputedStyle(el).overflowY), 'auto');
    await s.page.keyboard.press('Escape');
    await s.page.locator('dialog.mcat-modal').waitFor({ state: 'detached' });
    assert.equal(await s.page.evaluate(() => document.activeElement?.closest('.mcat-card')?.getAttribute('data-module')), 'MOD-CREW', `${tag}: focus returns to the card`);
    assert.equal(await s.page.evaluate(() => scrollY), scrollY, `${tag}: the page did not move`);
    // Backdrop click and close button also return the focus.
    await s.openCard('MOD-MSK'); await s.page.mouse.click(4, 4); await s.page.locator('dialog.mcat-modal').waitFor({ state: 'detached' });
    assert.equal(await s.page.evaluate(() => document.activeElement?.closest('.mcat-card')?.getAttribute('data-module')), 'MOD-MSK');
    await s.openCard('MOD-MSK'); await s.dialog.locator('.mcat-modal-close').click(); await s.page.locator('dialog.mcat-modal').waitFor({ state: 'detached' });
    // Content: Lucía's own seven days; own scroll on mobile for a long dialog.
    await s.openCard('MOD-MSK');
    assert.match(await s.text(), locale === 'es' ? /\d+ sesiones en 7 días/ : /\d+ sessions in 7 days/);
    assert.equal(await s.dialog.locator('.mcat-col').count(), 7, `${tag}: seven day columns`);
    await s.page.keyboard.press('Escape'); await s.page.locator('dialog.mcat-modal').waitFor({ state: 'detached' });
    // Light and dark: readable text on the dialog surface.
    for (const theme of ['light', 'dark']) {
      await s.page.evaluate(t => document.documentElement.setAttribute('data-fd30-theme', t), theme);
      await s.openCard('MOD-RAD');
      const colors = await s.dialog.evaluate(el => ({ fg: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }));
      assert.ok(contrast(rgb(colors.fg), rgb(colors.bg)) >= 4.5, `${tag} ${theme}: contrast ${colors.fg} on ${colors.bg}`);
      await s.page.keyboard.press('Escape'); await s.page.locator('dialog.mcat-modal').waitFor({ state: 'detached' });
    }
    await s.page.evaluate(() => document.documentElement.removeAttribute('data-fd30-theme'));
    // Every dialog opens with its structure, and none shows a personal value on a card without FD30 data.
    for (const id of ['MOD-CARDIO', 'MOD-MSK', 'MOD-NUTR', 'MOD-IMMUNE', 'MOD-SANS', 'MOD-SENSORI', 'MOD-COG', 'MOD-CREW', 'MOD-EVA', 'MOD-MICRO', 'MOD-LOADS', 'MOD-AUTONOMY', 'MOD-MED', 'MOD-RAD']) {
      await s.openCard(id);
      assert.ok(await s.dialog.locator('.mcat-tag').count() >= 1, `${tag} ${id}: tagged sections`);
      assert.ok(await s.dialog.locator('.mcat-first').innerText(), `${tag} ${id}: first line`);
      assert.equal(await s.dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, `${tag} ${id}: no horizontal overflow`);
      await s.page.keyboard.press('Escape'); await s.page.locator('dialog.mcat-modal').waitFor({ state: 'detached' });
    }
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 2. The three profiles on board read their own data and never another profile's.
  for (const owner of owners) {
    const s = await open(locale, width, { owner, hhmm: owner === owners[1] ? '15:45' : '16:20' });
    await s.openCard('MOD-IMMUNE');
    const text = await s.text();
    const blood = locale === 'es' ? 'Muestra de sangre' : 'Blood sample', urine = locale === 'es' ? 'Muestra de orina' : 'Urine sample';
    if (owner === owners[0]) { assert.ok(text.includes(blood) && text.includes(urine), `${tag} Lucía: both of her samples`); }
    if (owner === owners[1]) { assert.ok(text.includes(blood) && !text.includes(urine) && /resultado|result/i.test(text), `${tag} Tomás: only his blood sample`); }
    if (owner === owners[2]) { assert.ok(text.includes(urine) && !text.includes(blood), `${tag} Mei: only her urine sample`); }
    assert.match(text, locale === 'es' ? /Otra tripulación \(Inspiration4\)/ : /Another crew \(Inspiration4\)/);
    await s.page.keyboard.press('Escape'); await s.page.locator('dialog.mcat-modal').waitFor({ state: 'detached' });
    await s.openCard('MOD-CARDIO');
    assert.match(await s.text(), owner === owners[0] ? /bpm/ : (locale === 'es' ? /no tiene lectura de pulso/ : /no pulse reading/));
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 3. Ground: Operations and Medicine read only the allowlisted plan; Medicine adds the absence of summaries.
  for (const role of ['mission_operator', 'medical_professional']) {
    const s = await open(locale, width, { ground: role });
    for (const id of ['MOD-MSK', 'MOD-NUTR', 'MOD-IMMUNE', 'MOD-CREW', 'MOD-AUTONOMY', 'MOD-MED']) {
      await s.openCard(id);
      const text = await s.text();
      assert.doesNotMatch(text, /iss:sample|iss:session|Blood sample|Urine sample|Muestra de sangre|Muestra de orina|bpm/, `${tag} ${role} ${id}: no personal record`);
      const absence = locale === 'es' ? /No se recibieron resúmenes médicos/ : /No medical summaries have been received/;
      if (role === 'medical_professional' && id !== 'MOD-CREW') assert.match(text, absence, `${tag} ${id}: Medicine states the absence`);
      if (role === 'mission_operator') assert.doesNotMatch(text, absence, `${tag} ${id}: Operations does not get the medical statement`);
      if (id === 'MOD-MSK') assert.ok(await s.dialog.locator('table').count() === 1 && /Lucía Ferraro/.test(text), `${tag} ${role}: equipment reservations of the plan`);
      await s.page.keyboard.press('Escape'); await s.page.locator('dialog.mcat-modal').waitFor({ state: 'detached' });
    }
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  // 4. Radiation: direct link to the tab, from On board and from Ground (both roles).
  for (const ground of [null, 'mission_operator', 'medical_professional']) {
    const s = await open(locale, width, { ground });
    await s.openCard('MOD-RAD');
    assert.equal(await s.dialog.locator('svg[data-chart="radiation-mini"]').count(), 1, `${tag}: compact chart`);
    const text = await s.text();
    assert.match(text, /2014-03-01 00:00 → 2014-03-08 00:00/); assert.match(text, /µGy\/min/);
    assert.match(text, locale === 'es' ? /No es una dosis personal/ : /not a personal dose/);
    assert.ok(await s.dialog.locator('.mcat-gapband').count() >= 1, `${tag}: the gap is drawn, not filled`);
    const link = s.dialog.locator('.mcat-action a');
    const href = ground ? '#/demo/fd30/ground/evidence/radiation' : '#/onboard/personal/evidence/radiation';
    assert.equal(await link.getAttribute('href'), href);
    await link.click();
    await s.page.waitForURL(url => url.hash === href);
    await s.page.locator('[data-evidence="radiation"]').waitFor();
    assert.equal(await s.page.locator('[role="tab"][aria-selected="true"]').innerText(), locale === 'es' ? 'Radiación ambiental' : 'Ambient radiation', `${tag}: the Radiation tab is selected`);
    assert.equal(await s.page.locator('dialog.mcat-modal').count(), 0);
    assert.deepEqual(s.errors, []); await s.context.close();
  }
  results.push({ locale, width, ok: '14 cards, focus/Escape/backdrop, centered or bottom sheet, light/dark, three profiles, both Ground roles, Radiation link' });
}
console.log(JSON.stringify(results, null, 2));
await browser.close();
