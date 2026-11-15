import { describe, expect, it } from 'vitest';
import { createThemeStore, DEFAULT_PREFERENCE, readPreference, THEME_KEY } from './fd30Theme';

const memory = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return { getItem: (k: string) => (k in data ? data[k] : null), setItem: (k: string, v: string) => { data[k] = v; }, data };
};
const failing = () => ({ getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
const root = () => ({ dataset: {} as Record<string, string | undefined> });

describe('MATE-THEME01 theme store', () => {
  it('starts in Claro when nothing is saved, and never follows the system', () => {
    expect(DEFAULT_PREFERENCE).toBe('light');
    const r = root();
    const store = createThemeStore({ storage: memory(), root: r });
    expect(store.getSnapshot()).toMatchObject({ preference: 'light', resolved: 'light' });
    expect(r.dataset.fd30Theme).toBe('light');
  });

  it('falls back to Claro for an invalid, legacy "system" or unreadable saved value', () => {
    expect(readPreference(memory({ [THEME_KEY]: 'system' }))).toBe('light');
    expect(readPreference(memory({ [THEME_KEY]: 'blue' }))).toBe('light');
    expect(readPreference(failing())).toBe('light');
    expect(readPreference(null)).toBe('light');
  });

  it('restores a saved Oscuro', () => {
    const r = root();
    const store = createThemeStore({ storage: memory({ [THEME_KEY]: 'dark' }), root: r });
    expect(store.getSnapshot().resolved).toBe('dark');
    expect(r.dataset.fd30Theme).toBe('dark');
  });

  it('toggles between Claro and Oscuro, saves the choice and notifies subscribers', () => {
    const storage = memory(), r = root();
    const store = createThemeStore({ storage, root: r });
    let calls = 0;
    const off = store.subscribe(() => { calls++; });
    const toggle = store.toggle; // used as a detached event handler: it must not depend on `this`
    toggle();
    expect(store.getSnapshot().resolved).toBe('dark');
    expect(storage.data[THEME_KEY]).toBe('dark');
    expect(r.dataset.fd30Theme).toBe('dark');
    toggle();
    expect(store.getSnapshot().resolved).toBe('light');
    expect(storage.data[THEME_KEY]).toBe('light');
    expect(calls).toBe(2);
    off();
  });

  it('still changes the theme when the storage fails, and reports it was not saved', () => {
    const r = root();
    const store = createThemeStore({ storage: failing(), root: r });
    store.toggle();
    expect(store.getSnapshot()).toMatchObject({ resolved: 'dark', persisted: false });
    expect(r.dataset.fd30Theme).toBe('dark');
  });

  it('ignores a value that is not a theme', () => {
    const store = createThemeStore({ storage: memory(), root: root() });
    store.set('system' as never);
    expect(store.getSnapshot().resolved).toBe('light');
  });
});

/* ---- Palette Océano A1: real contrast of the real tokens ---- */
// Vitest runs in Node (the stylesheets are read as plain files; project root is the cwd). The specifier is a variable so
// `tsc` does not need Node typings, which this project does not install.
const fsModule = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fsModule)) as { readFileSync: (path: string, encoding: 'utf8') => string };
const readCss = (path: string): string => readFileSync(path, 'utf8');
const css = readCss('src/styles/fd30-theme.css');
const tokens = (block: string) => Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)].map(m => [m[1], m[2].toUpperCase()]));
const lightBlock = css.slice(css.indexOf('.fd30[data-surface] {'), css.indexOf('html[data-fd30-theme="dark"]'));
const darkBlock = css.slice(css.indexOf('html[data-fd30-theme="dark"]'));
const light = tokens(lightBlock);
const dark = { ...light, ...tokens(darkBlock) };
const lum = (hex: string) => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

describe('MATE-THEME01 palette Océano A1', () => {
  it('uses the approved light values', () => {
    expect(light).toMatchObject({ bg: '#E5F1EE', surface: '#FFFFFF', ink: '#15343A', muted: '#4E6568', link: '#126862', brand: '#17807B' });
  });
  it('uses the approved dark values', () => {
    expect(dark).toMatchObject({ bg: '#0E1A1D', surface: '#172A2D', ink: '#E6F0EE', muted: '#A3BAB7', link: '#3FC1B9' });
  });
  for (const [name, t] of [['light', light], ['dark', dark]] as const) {
    it(`${name}: text tokens reach 4.5:1 on every real surface`, () => {
      for (const fg of ['ink', 'muted', 'link', 'warn', 'amber']) for (const bg of ['bg', 'surface', 'tint', 'tint-strong']) {
        expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    });
    it(`${name}: filled actions keep readable text, whichever fill it is`, () => {
      expect(contrast(t['on-action'], t['action'])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t['on-action'], t['action-hover'])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t['on-warn'], t['warn-solid'])).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: borders, focus, module colors and the logo reach 3:1 on cards and page`, () => {
      for (const g of ['rule-strong', 'focus-ring', 'mod-sleep', 'mod-exercise', 'mod-lab', 'mod-crew', 'mod-wellbeing', 'brand', 'brand-body', 'brand-accent']) for (const bg of ['bg', 'surface']) {
        expect(contrast(t[g], t[bg]), `${g} on ${bg}`).toBeGreaterThanOrEqual(3);
      }
    });
  }
});

describe('MATE-THEME01 no stray colors in FD30 stylesheets', () => {
  const files = [
    'src/styles/fd30.css', 'src/styles/fd30-chat.css', 'src/styles/fd30-demo-dock.css', 'src/styles/fd30-exercise.css', 'src/styles/fd30-imp05.css',
    'src/styles/fd30-public.css', 'src/styles/fd30-schedule.css', 'src/styles/secondary-nav.css', 'src/theme/themeSettings.css',
    'src/views/crew-dynamics/crew-dynamics.css', 'src/views/evidence/evidence.css', 'src/views/fd30-ops/ops.css', 'src/views/history/exercise/exercise.css',
    'src/views/history/laboratory/laboratory.css', 'src/views/history/sleep/sleep.css', 'src/views/today/today.css', 'src/views/today/wellbeing.css', 'src/views/shared/brandMark.css',
  ];
  it('keeps every color in fd30-theme.css', () => {
    for (const f of files) {
      const text = readCss(f).replace(/\/\*[\s\S]*?\*\//g, '');
      expect(text.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], f).toEqual([]);
    }
  });
});
