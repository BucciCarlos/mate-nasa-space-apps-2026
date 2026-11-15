import type { AppState } from './types';

// JSON round-trip helpers for the AppState snapshot format (used by tests to
// verify the state stays serializable). The app itself does NOT persist state
// to sessionStorage/localStorage: the Redux store is the single source of
// truth and is seeded from the backend on every load.
export function serialize(state: AppState): string {
  return JSON.stringify(state);
}

export function deserialize(raw: string | null): AppState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (!parsed || parsed.schemaVersion !== 1 || !parsed.missions?.iss || !parsed.missions?.cislunar) return null;
    if (parsed.missions.iss.crew.length === 0 || parsed.missions.cislunar.crew.length === 0) return null;
    return parsed as AppState;
  } catch {
    return null;
  }
}
