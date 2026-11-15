// Browser-test helper (UX02): Demo mode controls live in a floating panel that starts folded.
// `demo(page, action)` opens it, runs the action and folds it again so the page stays clickable.
export async function demo(page, action) {
  const panel = page.locator('#fd-demo-panel');
  const wasOpen = await panel.isVisible();
  if (!wasOpen) { await page.locator('.fd-demo-fab').click(); await panel.waitFor({ state: 'visible' }); }
  try { return await action(); }
  finally { if (!wasOpen && await panel.isVisible()) await page.locator('.fd-demo-close').click(); }
}
