/**
 * MATE-THEME01: theme for FD30, a plain switch between Claro and Oscuro.
 *
 * The default is Claro; the operating system's color scheme is never followed. The choice is saved locally
 * (`mate:fd30:theme:v1`); every storage access is guarded, and if saving fails the theme still changes for the session. The theme lives outside the FD30 session state: switching never touches the clock, the profile, the route or
 * the chat. It is applied as `<html data-fd30-theme="light|dark">`, which only `.fd30[data-surface]` selectors read.
 */
export type ThemePreference = 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'mate:fd30:theme:v1';
export const DEFAULT_PREFERENCE: ThemePreference = 'light';
export const PREFERENCES: readonly ThemePreference[] = ['light', 'dark'];

const isPreference = (value: unknown): value is ThemePreference => PREFERENCES.includes(value as ThemePreference);

/** A missing, unreadable or invalid saved value (including a legacy "system") falls back to Claro. */
export function readPreference(storage: Pick<Storage, 'getItem'> | null): ThemePreference {
  try {
    const saved = storage?.getItem(THEME_KEY);
    return isPreference(saved) ? saved : DEFAULT_PREFERENCE;
  } catch { return DEFAULT_PREFERENCE; }
}

export interface ThemeEnv {
  storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  root: { dataset: Record<string, string | undefined> } | null;
}

export interface ThemeSnapshot { preference: ThemePreference; resolved: ResolvedTheme; persisted: boolean }

export function createThemeStore(env: ThemeEnv) {
  let preference = readPreference(env.storage);
  let persisted = true;
  const listeners = new Set<() => void>();
  let snapshot: ThemeSnapshot = { preference, resolved: preference, persisted };
  const apply = () => {
    if (env.root) { env.root.dataset.fd30Theme = snapshot.resolved; env.root.dataset.fd30Pref = snapshot.preference; }
  };
  const refresh = () => {
    const next: ThemeSnapshot = { preference, resolved: preference, persisted };
    if (next.preference !== snapshot.preference || next.resolved !== snapshot.resolved || next.persisted !== snapshot.persisted) {
      snapshot = next; apply(); listeners.forEach(l => l());
    }
  };
  apply();
  const set = (next: ThemePreference) => {
    if (!isPreference(next)) return;
    preference = next;
    try { env.storage?.setItem(THEME_KEY, next); persisted = true; } catch { persisted = false; }
    refresh();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    set,
    /** Closure, not `this`: safe to pass directly as an event handler. */
    toggle: () => set(preference === 'dark' ? 'light' : 'dark'),
    dispose() { listeners.clear(); },
  };
}

function browserEnv(): ThemeEnv {
  if (typeof window === 'undefined') return { storage: null, root: null };
  let storage: ThemeEnv['storage'] = null;
  try { storage = window.localStorage; } catch { storage = null; }
  return { storage, root: document.documentElement };
}

/** The single store of the running app. It applies the saved theme as soon as this module is imported. */
export const fd30Theme = createThemeStore(browserEnv());
