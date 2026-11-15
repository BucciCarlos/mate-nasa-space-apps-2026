// UX02 browser regression for the floating Demo mode dock (button + panel). Optional, like the other *.browser.mjs files:
//   PLAYWRIGHT_MODULE=/abs/playwright/index.mjs BROWSER_BIN=/abs/chrome FD30_BASE_URL=http://127.0.0.1:5173/ node src/demo/demoDock.browser.mjs
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_BIN ? { executablePath: process.env.BROWSER_BIN } : {}), args: ['--no-sandbox'] });
const base = process.env.FD30_BASE_URL || 'http://127.0.0.1:5173/';
const DOCK = 'mate:fd30:demo-dock:v1', SNAP = 'mate:fd30:imp02:v1';
const results = [];
const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
try {
  for (const locale of ['en', 'es']) for (const width of [1440, 390]) {
    const mobile = width <= 600, height = mobile ? 780 : 900;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}#/demo/fd30`);
    await page.getByRole('button', { name: locale.toUpperCase(), exact: true }).click();
    const fab = page.locator('.fd-demo-fab'), panel = page.locator('#fd-demo-panel');
    const box = async l => l.boundingBox();
    const storedY = () => page.evaluate(k => JSON.parse(sessionStorage.getItem(k))?.y ?? null, DOCK);
    const panelBox = async () => { assert.equal(await panel.isVisible(), true); return box(panel); };
    const withinViewport = b => b.x >= 0 && b.y >= 0 && b.x + b.width <= width + 0.5 && b.y + b.height <= height + 0.5;

    // 1. Folded at start, round, on the left, bar gone from the layout.
    assert.equal(await panel.isHidden(), true);
    assert.equal(await fab.getAttribute('aria-expanded'), 'false');
    const f0 = await box(fab);
    assert.ok(f0.x <= 16 && Math.abs(f0.width - f0.height) < 1 && f0.width >= 44, 'left round button');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.fd-demo-fab')).borderRadius), '50%');
    const main0 = await box(page.locator('.fd-main')), scroll0 = await page.evaluate(() => scrollY);

    // 2. Opening neither moves nor shrinks the page; the panel stays inside the screen; clock controls are reachable.
    await fab.click();
    assert.equal(await fab.getAttribute('aria-expanded'), 'true');
    assert.deepEqual(await box(page.locator('.fd-main')), main0);
    assert.equal(await page.evaluate(() => scrollY), scroll0);
    assert.ok(withinViewport(await panelBox()), 'panel inside viewport');
    for (const target of [panel.getByRole('slider'), panel.locator('.fd-perspective-switch'), panel.locator('.fd-secondary-link'),
      panel.locator('.fd-view-as select'), panel.locator('.fd-next'), panel.locator('.fd-reset'), panel.locator('.fd-timebar-controls select'),
      panel.getByRole('button', { name: '+15 min', exact: true }), panel.getByRole('button', { name: '−15 min', exact: true })]) {
      await target.scrollIntoViewIfNeeded(); await target.click({ trial: true });
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await panel.locator('.fd-demo-close').click();
    assert.equal(await panel.isHidden(), true);
    assert.equal(await page.evaluate(() => document.activeElement?.className.includes('fd-demo-fab')), true);

    // 3. Drag is vertical only and never opens. Mouse on desktop, touch on mobile.
    const cdp = mobile ? await context.newCDPSession(page) : null;
    const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const drag = async (dx, dy) => {
      const b = await box(fab), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
      if (mobile) {
        await send('touchStart', cx, cy);
        for (let i = 1; i <= 6; i++) await send('touchMove', Math.min(width - 1, Math.max(1, cx + dx * i / 6)), Math.min(height - 1, Math.max(1, cy + dy * i / 6))); // stay on screen: off-screen touch points leave Chrome's tap recognizer stuck
        await send('touchEnd');
      } else {
        await page.mouse.move(cx, cy); await page.mouse.down();
        await page.mouse.move(cx + dx / 2, cy + dy / 2, { steps: 4 }); await page.mouse.move(cx + dx, cy + dy, { steps: 4 }); await page.mouse.up();
      }
    };
    await drag(90, 150);
    const f1 = await box(fab);
    assert.equal(f1.x, f0.x, 'x unchanged'); assert.ok(f1.y - f0.y > 100, `moved down (${f1.y - f0.y})`);
    assert.equal(await panel.isHidden(), true, 'drag does not open'); assert.equal(await fab.getAttribute('aria-expanded'), 'false');
    const y1 = await storedY(); assert.ok(typeof y1 === 'number' && y1 > 0.4);
    await drag(0, -2000); // clamps inside the screen
    const f2 = await box(fab); assert.ok(f2.y >= 60 && f2.y < f1.y); await drag(0, 4000);
    const f3 = await box(fab); assert.ok(f3.y + f3.height <= height + 0.5 && f3.y > f1.y);
    await drag(0, f1.y - f3.y); // back near f1
    // A short tap still opens.
    if (mobile) { await page.waitForTimeout(1500); const b = await box(fab); await send('touchStart', b.x + b.width / 2, b.y + b.height / 2); await send('touchEnd'); } else await fab.click(); // same input path as the drag; Chrome drops a synthetic tap issued <~1 s after a synthetic drag
    assert.equal(await fab.getAttribute('aria-expanded'), 'true');
    assert.ok(withinViewport(await panelBox()));
    await panel.locator('.fd-demo-close').click();

    // 3b. The open strip is short, spans the width and its title bar drags it vertically (never horizontally).
    await fab.click();
    const strip = await panelBox();
    assert.ok(strip.width >= width - 80 && strip.height <= (mobile ? 330 : 190), `short wide strip ${strip.width}x${strip.height}`);
    if (!mobile) {
      const head = await box(panel.locator('.fd-demo-head')), yPre = (await box(fab)).y;
      await page.mouse.move(head.x + 200, head.y + 8); await page.mouse.down();
      await page.mouse.move(head.x + 260, head.y + 80, { steps: 6 }); await page.mouse.up();
      const after = await panelBox();
      assert.equal(after.x, strip.x, 'strip does not move horizontally'); assert.ok((await box(fab)).y - yPre > 40, 'strip dragged down');
      assert.equal(await panel.isVisible(), true, 'dragging the title bar keeps it open');
    }
    await panel.locator('.fd-demo-close').click();

    // 4. Position survives perspective changes, reload and Restart simulation.
    const yBefore = (await box(fab)).y, yStored = await storedY();
    const openDemo = async () => { if (await panel.isHidden()) await fab.click(); };
    await openDemo(); await panel.locator('.fd-perspective-switch').click(); await page.locator('[data-surface="ground"]').waitFor();
    assert.ok(Math.abs((await box(fab)).y - yBefore) < 1, 'same height on Ground');
    assert.equal(await page.locator('.fd-character').count(), 0);
    assert.ok(withinViewport(await panelBox()), 'panel on Ground');
    await panel.locator('.fd-perspective-switch').click(); await page.locator('#fd-ask,.fd-character').first().waitFor();
    assert.ok(Math.abs((await box(fab)).y - yBefore) < 1, 'same height back on board');
    page.once('dialog', d => d.accept());
    await panel.locator('.fd-reset').click();
    assert.equal(await storedY(), yStored); assert.ok(Math.abs((await box(fab)).y - yBefore) < 1, 'Restart keeps the height');
    await panel.locator('.fd-demo-close').click();
    await page.reload(); await page.locator('.fd-demo-fab').waitFor();
    assert.ok(Math.abs((await box(fab)).y - yBefore) < 2, 'reload keeps the height');
    assert.equal(await panel.isHidden(), true);

    // 5. Keyboard: Enter/Space toggle, Alt+Arrows move, Escape closes the top layer and returns focus.
    await fab.focus();
    await page.keyboard.press('Enter'); assert.equal(await fab.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Space'); assert.equal(await fab.getAttribute('aria-expanded'), 'false');
    await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
    assert.equal(await fab.getAttribute('aria-expanded'), 'false');
    const k0 = (await box(fab)).y;
    await page.keyboard.press('Alt+ArrowDown'); const k1 = (await box(fab)).y; assert.ok(Math.abs(k1 - k0 - 8) < 1.5, `Alt+Down 8px (${k1 - k0}) ${locale} ${width} y=${k0} stored=${await storedY()}`);
    await page.keyboard.press('Alt+Shift+ArrowUp'); const k2 = (await box(fab)).y; assert.ok(Math.abs(k1 - k2 - 32) < 1.5, 'Alt+Shift+Up 32px');
    assert.equal(await fab.getAttribute('aria-expanded'), 'false', 'moving by keyboard does not open');
    assert.equal(await page.evaluate(() => document.activeElement?.className.includes('fd-demo-fab')), true);
    // Escape from inside the panel returns focus to the button.
    await page.keyboard.press('Enter'); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement?.closest('#fd-demo-panel')), true, 'Tab enters the panel');
    await page.keyboard.press('Escape');
    assert.equal(await panel.isHidden(), true);
    assert.equal(await page.evaluate(() => document.activeElement?.className.includes('fd-demo-fab')), true);

    // 6. Escape closes only the top layer: panel, then Mate card, then chat.
    await page.locator('.fd-character').click(); await page.locator('#fd-ask').waitFor();
    await page.locator('.fd-info').click(); await page.locator('#fd-companion-card').waitFor();
    await fab.focus(); await page.keyboard.press('Enter');
    await page.keyboard.press('Tab'); await page.keyboard.press('Escape');
    assert.equal(await panel.isHidden(), true); assert.equal(await page.locator('#fd-companion-card').count(), 1); assert.equal(await page.locator('#fd-ask').count(), 1);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#fd-companion-card').count(), 0); assert.equal(await page.locator('#fd-ask').count(), 1);
    await page.locator('#fd-ask').fill('draft kept'); await fab.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#fd-ask').inputValue(), 'draft kept');
    await page.keyboard.press('Escape');
    assert.equal(await panel.isHidden(), true); assert.equal(await page.locator('#fd-ask').count(), 1);
    await page.locator('.fd-chat header button').click(); await page.locator('#fd-ask').waitFor({ state: 'detached' });

    // 7. Mate and the button near each other, and the panel open next to Mate.
    const character = page.locator('.fd-floating .fd-character');
    const mate = await box(character);
    await fab.focus(); // park the button at Mate's height, then check neither covers the other's hit area
    const target = Math.max(80, mate.y + mate.height / 2 - 24);
    for (let i = 0; i < 40; i++) { const c = (await box(fab)).y; if (Math.abs(c - target) < 20) break; await page.keyboard.press(c < target ? 'Alt+Shift+ArrowDown' : 'Alt+Shift+ArrowUp'); }
    const fabNow = await box(fab), mateNow = await box(character);
    assert.equal(intersects(fabNow, mateNow), false, 'button and Mate do not overlap');
    await page.keyboard.press('Enter');
    const p = await panelBox(), mateOpen = await box(character);
    assert.ok(withinViewport(mateOpen), 'Mate remains on screen with the panel open');
    const overlap = intersects(p, mateOpen);
    // Mate and the panel may only share space if the screen is too small to separate them; on desktop they never do.
    if (!mobile) assert.equal(overlap, false, 'desktop: panel and Mate separate');
    await character.focus(); assert.equal(await page.evaluate(() => document.activeElement?.className.includes('fd-character')), true);
    await page.keyboard.press('Escape'); assert.equal(await panel.isHidden(), true);
    await page.keyboard.press('Home');
    // Move Mate onto the button's column: it yields instead of covering the button.
    await character.focus(); await page.keyboard.press('m');
    for (let i = 0; i < 40; i++) await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Enter');
    const mateLeft = await box(character), fabLeft = await box(fab);
    assert.equal(intersects(mateLeft, fabLeft), false, 'Mate dropped at the left edge does not cover the button');
    await character.focus(); await page.keyboard.press('Home');

    // 8. Exercise 7/30 and Immune system stay reachable with the dock around.
    const nav = href => page.locator(`.fd-nav a[href="${href}"]`);
    await nav('#/onboard/personal/exercise').click(); await page.locator('.exercise-history').waitFor();
    await page.getByRole('button', { name: locale === 'es' ? 'Últimos 7 días' : 'Last 7 days', exact: true }).click();
    assert.equal(await page.locator('[data-exercise-day]').count(), 7);
    await page.getByRole('button', { name: 'FD01–FD30', exact: true }).click();
    assert.equal(await page.locator('[data-exercise-day]').count(), 30);
    await nav('#/onboard/personal/catalog').click();
    await page.locator('.mcat-future > summary').click();
    const immune = page.locator('[data-module="MOD-IMMUNE"] h3');
    assert.equal(await immune.innerText(), locale === 'es' ? 'Sistema inmunitario' : 'Immune system');
    await immune.scrollIntoViewIfNeeded(); assert.equal(await immune.isVisible(), true);
    const ib = await box(immune); assert.equal(intersects(ib, await box(fab)), false, 'dock does not cover the Immune module');
    await page.waitForTimeout(100);
    assert.deepEqual(errors, []);
    results.push({ locale, width, ok: 'folded start, open without shift, vertical drag, persistence, keyboard, layered Escape, Mate, Exercise 7/30, Immune' });
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
