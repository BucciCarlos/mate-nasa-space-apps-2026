import { configureStore } from '@reduxjs/toolkit';
import { loadSnapshot, saveSnapshot, sessionStorageOrNull } from './persistence';
import { mateApi } from './api';
import { createInitialState, SCENARIOS } from './initialState';
import mateReducer from './mateSlice';
import type { AppState } from './types';

function getInitialState(): AppState {
  return loadSnapshot(sessionStorageOrNull()) ?? createInitialState(Date.now(), SCENARIOS, 'en');
}

export const store = configureStore({
  reducer: {
    mate: mateReducer,
    [mateApi.reducerPath]: mateApi.reducer,
  },
  // Preload a sessionStorage snapshot (02 §3.3). The slice's `scenarioReset`
  // and the ticker keep the state current after hydration.
  preloadedState: { mate: getInitialState() },
  middleware: (getDefault) =>
    getDefault({ serializableCheck: false, immutableCheck: false }).concat(mateApi.middleware),
});

// Persist the mate slice at most every 500 ms and on unload (02 §3.3).
let lastSave = 0;
let pending: AppState | null = null;
store.subscribe(() => {
  const mate = store.getState().mate as AppState;
  pending = mate;
  const now = Date.now();
  if (now - lastSave >= 500) {
    lastSave = now;
    saveSnapshot(sessionStorageOrNull(), pending);
    pending = null;
  }
});
window.addEventListener('pagehide', () => {
  if (pending) saveSnapshot(sessionStorageOrNull(), pending);
});
window.addEventListener('beforeunload', () => {
  if (pending) saveSnapshot(sessionStorageOrNull(), pending);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
