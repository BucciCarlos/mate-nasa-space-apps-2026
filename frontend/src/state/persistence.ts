import type { AppState } from './types';

export const STORAGE_KEY = 'mate:v1:state';

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }

export function serialize(state: AppState): string {
  return JSON.stringify(state);
}

/** Returns the snapshot or null when it is missing, corrupt or of another schema version. */
export function deserialize(raw: string | null): AppState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (!parsed || parsed.schemaVersion !== 1 || !parsed.missions?.iss || !parsed.missions?.cislunar) return null;
    return parsed as AppState;
  } catch {
    return null;
  }
}

export function loadSnapshot(storage: StorageLike | null): AppState | null {
  try {
    return deserialize(storage?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

export function saveSnapshot(storage: StorageLike | null, state: AppState): void {
  try {
    storage?.setItem(STORAGE_KEY, serialize(state));
  } catch {
    // storage unavailable: the app keeps running in memory (02 §3.3)
  }
}

export function sessionStorageOrNull(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}
