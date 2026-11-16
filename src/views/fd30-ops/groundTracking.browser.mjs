// GND02: local-browser regression. No application dependency or persisted fixture is added.
// PLAYWRIGHT_MODULE=/abs/playwright/index.mjs BROWSER_BIN=/abs/chrome FD30_BASE_URL=http://127.0.0.1:5186/ node src/views/fd30-ops/groundTracking.browser.mjs
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { demo } from '../../demo/demoDock.helpers.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_BIN ? { executablePath: process.env.BROWSER_BIN } : {}), args: ['--no-sandbox'] });
const base = process.env.FD30_BASE_URL || 'http://127.0.0.1:5186/';
const target = Date.parse('2027-03-10T11:00:00Z'), key = 'mate:fd30:imp02:v1';
const screenshots = process.env.GND02_SCREENSHOTS;
if (screenshots) await mkdir(screenshots, { recursive: true });
const results = [];
try {
  for (const config of [
    { locale: 'es', theme: 'light', width: 1440 }, { locale: 'en', theme: 'light', width: 1440 },
    { locale: 'es', theme: 'dark', width: 1440 }, { locale: 'en', theme: 'dark', width: 1440 },
    { locale: 'es', theme: 'light', width: 390 },
    { locale: 'en', theme: 'dark', width: 390 },
  ].filter(c => !process.env.GND02_WIDTH || c.width === Number(process.env.GND02_WIDTH))) {
    const { locale, theme, width } = config;
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}#/demo/fd30`);
    await page.getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
    await demo(page, () => page.getByRole('button', { name: locale === 'es' ? 'Pausar' : 'Pause', exact: true }).click());
    await demo(page, () => page.getByRole('slider').evaluate((el, time) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, time);
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    }, target));
    // A screenshot-only Onboard identity and a private draft must not become Ground context.
    await demo(page, () => page.locator('.fd-view-as select').selectOption('iss:crew-jd'));
    await page.locator('.fd-character').click();
    await page.locator('#fd-ask').fill('GND02_PRIVATE_DRAFT');
    const saved = () => page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), key);
    const before = await saved();
    assert.equal(before.activeCrewId, 'iss:crew-jd');
    assert.ok(before.exercise.some(s => s.start)); assert.ok(before.laboratory.some(s => s.analysis));
    await demo(page, () => page.locator('.fd-perspective-switch').click());
    await page.locator('.gnd').waitFor();
    if (theme === 'dark') await page.locator('.fd-settings-button').click();
    await page.waitForFunction(theme => document.documentElement.dataset.fd30Theme === theme, theme);
    const shot = async name => {
      if (screenshots) await page.screenshot({ path: `${screenshots}/${locale}-${theme}-${width}-${name}.png` });
    };
    const equipment = () => page.getByRole('button', { name: locale === 'es' ? '¿Cómo se distribuyen los equipos?' : 'How is equipment allocated?', exact: true });
    const maintenance = () => page.getByRole('button', { name: locale === 'es' ? '¿Qué mantenimiento comparten?' : 'What maintenance is shared?', exact: true });
    const back = () => page.getByRole('button', { name: locale === 'es' ? 'Volver a la tripulación' : 'Back to crew', exact: false });
    const checkBoundary = async () => {
      assert.equal(new URL(page.url()).hash, '#/demo/fd30/ground');
      assert.equal(await page.locator('.fd-chat,.fd-character,.fd-view-as,.fd-auto-notice,.fd-telemetry,[data-session],[data-sample]').count(), 0);
      const text = await page.locator('.gnd').innerHTML();
      assert.doesNotMatch(text, /GND02_PRIVATE_DRAFT|John Doe|pulse_bpm|analysis_started|sleep\.episode|muscle-assessment|C001/);
      const selected = await page.locator('[data-ops-detail]').count() ? await page.locator('[data-ops-detail]').getAttribute('data-ops-detail') : null;
      const role = await page.locator('.ops-role select').inputValue();
      const allowed = role === 'medical_professional' && selected ? 1 : 0;
      assert.equal(await page.locator('[data-ground-medical]').count(), allowed);
      assert.equal(await page.locator('[data-ground-sleep]').count(), allowed);
      if (allowed) {
        assert.equal(await page.locator('[data-ground-sleep]').getAttribute('data-ground-sleep'), selected);
        assert.equal(await page.locator('[data-ground-sleep]').getAttribute('data-sleep-points'), selected === 'iss:crew-lf' ? '7' : selected === 'iss:crew-ti' ? '6' : '5');
      } else assert.doesNotMatch(text, /iss:sample-|data-health-metric|iss:sleep:/);
      if (await page.locator('.gnd-orbit').count()) assert.doesNotMatch(await page.locator('.gnd-orbit').innerText(), /iss:sleep:|iss:sample-|6 h 25 min|demo-body|SpO₂/);
      assert.ok(text.includes('11:00'));
      const after = await saved();
      assert.equal(after.offsetMs, before.offsetMs); assert.equal(after.running, false);
      assert.equal(after.activeCrewId, before.activeCrewId); assert.deepEqual(after.profiles, before.profiles);
      assert.equal(await demo(page, () => page.getByRole('slider').inputValue()), String(target));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    };
    assert.equal(await page.locator('[data-ops-card]').count(), 3);
    assert.equal(await page.locator('[data-gnd-lane]').count(), 3);
    assert.equal(await page.locator('.gnd-plan-cursor').count(), 3);
    assert.ok((await page.locator('[data-ops-card="iss:crew-mo"]').innerText()).includes('13:00–14:00'));
    assert.equal(await page.locator('[data-ops-card] svg.ops-portrait[role="img"]').count(), 3);
    assert.equal(await page.locator('.gnd-crew-table').count(), 0);
    await checkBoundary(); await shot('crew');
    // Judge the requested outcome: every medical block fits on the first desktop screen, before any agenda.
    await page.locator('.ops-role select').selectOption('medical_professional');
    const profiles = [];
    for (const [id, name, sleep, exerciseW, historyInterval] of [['iss:crew-lf', 'Lucía Ferraro', '6 h 25 min', '112', '10:30–11:30 UTC'], ['iss:crew-ti', 'Tomás Ibarra', '7 h 10 min', '182', '08:00–09:00 UTC'], ['iss:crew-mo', 'Mei Okada', '7 h 25 min', '137', '13:00–14:00 UTC']]) {
      await page.locator(`[data-ops-card="${id}"] svg.ops-portrait`).click();
      assert.equal(await page.locator('[data-ops-detail]').getAttribute('data-ops-detail'), id);
      assert.equal(await page.locator('.gnd-person-heading h2').innerText(), name);
      assert.ok((await page.locator('[data-health-block="sleep"]').innerText()).includes(sleep));
      assert.ok((await page.locator('[data-health-block="exercise"]').innerText()).includes(exerciseW));
      assert.equal(await page.locator('[data-exercise-record] time').innerText(), historyInterval);
      if (id !== 'iss:crew-lf') assert.ok((await page.locator('[data-health-block="laboratory"]').innerText()).includes(locale === 'es' ? 'Aún no hay muestras disponibles' : 'No samples available yet'));
      await checkBoundary();
      const bounds = await page.evaluate(() => {
        const root = document.querySelector('.fd-main');
        return { scrollTop: root.scrollTop, overflow: root.scrollWidth > root.clientWidth,
          blocks: [...document.querySelectorAll('[data-health-block]')].map(el => ({ block: el.dataset.healthBlock, top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom })),
          agenda: document.querySelector('[data-operational-summary]').getBoundingClientRect().top };
      });
      await shot(`medical-${id.slice(-2)}`);
      if (bounds.overflow) console.log(await page.evaluate(() => [...document.querySelector('.fd-main').querySelectorAll('*')].filter(el => el.scrollWidth > el.clientWidth + 1).slice(0, 30).map(el => ({ tag: el.tagName, cls: el.className, right: el.getBoundingClientRect().right, sw: el.scrollWidth, cw: el.clientWidth, overflow: getComputedStyle(el).overflowX }))));
      assert.equal(bounds.scrollTop, 0); assert.equal(bounds.overflow, false, JSON.stringify(bounds));
      if (width === 1440) for (const block of bounds.blocks) { assert.ok(block.top > 0 && block.bottom <= 900, JSON.stringify(bounds)); assert.ok(block.bottom <= bounds.agenda); }
      profiles.push({ id, pulse: await page.locator('[data-health-metric="pulse"]').getAttribute('data-value'), spo2: await page.locator('[data-health-metric="spo2"]').getAttribute('data-value'), bounds });
      await shot(`medical-${id.slice(-2)}`);
      await page.locator('.gss-records summary').click();
      assert.equal(await page.locator('.fd-main').evaluate(el => el.scrollWidth > el.clientWidth), false);
      await page.locator('.gss-records summary').click();
      await page.locator('.ops-role select').selectOption('mission_operator'); await checkBoundary();
      await page.locator('.ops-role select').selectOption('medical_professional');
      await back().click(); await checkBoundary();
      assert.equal(await page.locator('.ops-role select').inputValue(), 'medical_professional');
    }
    await page.locator('.ops-role select').selectOption('mission_operator');
    await page.locator('[data-ops-card="iss:crew-lf"] button').click();
    assert.equal(await page.locator('[data-ops-detail="iss:crew-lf"]').count(), 1);
    assert.ok((await page.locator('.gnd-person-summary').innerText()).includes('12:00–13:00'));
    assert.equal(await page.locator('[data-gnd-lane]').count(), 1);
    await shot('lucia');
    await page.getByRole('button', { name: locale === 'es' ? 'Consultar Orbit' : 'Consult Orbit', exact: true }).click();
    assert.equal(await page.locator('.gnd-orbit-context dd').first().innerText(), 'Lucía Ferraro');
    await equipment().click();
    assert.equal(await page.locator('.gnd-orbit-answer li').count(), 1);
    assert.ok((await page.locator('.gnd-orbit-answer').innerText()).includes('10:30–11:30 UTC'));
    assert.ok((await page.locator('.gnd-orbit-answer code').innerText()).includes('iss:fd30:lf:planned-exercise'));
    await shot('orbit-equipment');
    await maintenance().click();
    const answer = await page.locator('.gnd-orbit-answer').innerText();
    assert.ok(answer.includes('Lucía Ferraro · Tomás Ibarra')); assert.ok(answer.includes('14:00–16:00 UTC'));
    assert.ok(answer.includes('iss:fd30:shared:maintenance'));
    await page.locator('.gnd-orbit-answer .gnd-reference').click();
    assert.equal(await page.locator('.gnd-block-detail code').innerText(), 'iss:fd30:shared:maintenance');
    assert.equal(await page.locator('.gnd-plan-block.is-selected').count(), 1);
    await checkBoundary(); await shot('orbit-maintenance');
    for (const role of ['medical_professional', 'mission_operator']) {
      await page.locator('.ops-role select').selectOption(role);
      assert.equal(await page.locator('[data-ground-medical]').count(), role === 'medical_professional' ? 1 : 0);
      if (role === 'medical_professional') await shot('medical');
      await checkBoundary();
    }
    // Open panel follows selection and role; no saved answer from a different context.
    await back().click();
    assert.equal(await page.locator('.gnd-orbit-context dd').first().innerText(), locale === 'es' ? 'Tripulación' : 'Crew');
    await equipment().click(); assert.equal(await page.locator('.gnd-orbit-answer li').count(), 3);
    await page.locator('[data-ops-card="iss:crew-mo"] button').click();
    assert.equal(await page.locator('.gnd-orbit-context dd').first().innerText(), 'Mei Okada');
    assert.equal(await page.locator('.gnd-orbit-answer li').count(), 1);
    assert.ok((await page.locator('.gnd-orbit-answer').innerText()).includes('13:00–14:00 UTC'));
    await maintenance().click(); assert.equal(await page.locator('.gnd-orbit-answer li').count(), 0);
    await page.locator('.ops-role select').selectOption('medical_professional'); await checkBoundary();
    await back().click(); await checkBoundary();
    await page.locator('[data-ops-card="iss:crew-ti"] button').click(); await checkBoundary();
    await back().click();
    await page.locator('[data-ops-card="iss:crew-lf"] button').click(); await checkBoundary();
    // Rewind uses the same mission cursor: FD30 sleep is absent before the received wake event.
    const seek = async time => demo(page, () => page.getByRole('slider').evaluate((el, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    }, time));
    await seek(Date.parse('2027-03-10T05:59:00Z'));
    assert.equal(await page.locator('[data-ground-sleep]').getAttribute('data-sleep-points'), '6');
    assert.doesNotMatch(await page.locator('[data-ground-sleep]').innerText(), /6 h 25 min|iss:sleep:lf:fd30/);
    await seek(Date.parse('2027-03-10T06:00:00Z'));
    assert.equal(await page.locator('[data-ground-sleep]').getAttribute('data-sleep-points'), '7');
    assert.ok((await page.locator('[data-ground-sleep]').innerText()).includes('6 h 25 min'));
    await seek(target); await checkBoundary();
    await page.locator('#gnd-orbit-h').focus(); await page.keyboard.press('Escape');
    assert.equal(await page.locator('.gnd-orbit').count(), 0);
    assert.equal(await page.locator('.gnd-controls > button').evaluate(el => el === document.activeElement), true);
    await back().click(); await checkBoundary();
    // Existing Onboard chat and identity survive the entire Ground interaction.
    await demo(page, () => page.locator('.fd-perspective-switch').click());
    await page.locator('#fd-ask').waitFor();
    assert.equal(await page.locator('#fd-ask').inputValue(), 'GND02_PRIVATE_DRAFT');
    assert.equal((await saved()).activeCrewId, 'iss:crew-jd');
    assert.deepEqual(errors, []);
    results.push({ ...config, cursor: '11:00 UTC preserved', roles: 2, queries: 2, unauthorizedPersonalLeak: false, health: 'Three owners / medical only; receipt and rewind verified', profiles, errors: 0 });
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify(results, null, 2));
