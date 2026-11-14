import { configureStore } from '@reduxjs/toolkit';
import type { Store } from '@reduxjs/toolkit';
import { mateApi } from './api';
import { createInitialState } from './initialState';
import mateReducer from './mateSlice';
import { loadSnapshot, saveSnapshot, sessionStorageOrNull } from './persistence';
import type { AppState } from './types';

export type RootState = {
  mate: AppState;
  mateApi: ReturnType<typeof mateApi.reducer>;
};

export type AppDispatch = Store<RootState>['dispatch'];

// The store is created eagerly at module load. If a sessionStorage snapshot
// exists (02 §3.3) it is hydrated here; otherwise createInitialState returns
// a safe "empty" state. AppProvider fetches scenarios from the backend and
// dispatches scenarioReset to replace the empty state with real data.
export const store: Store<RootState> = configureStore({
  reducer: {
    mate: mateReducer,
    [mateApi.reducerPath]: mateApi.reducer,
  },
  preloadedState: { mate: loadSnapshot(sessionStorageOrNull()) ?? createInitialState(Date.now()) },
  middleware: (getDefault) =>
    getDefault({ serializableCheck: false, immutableCheck: false }).concat(mateApi.middleware),
});

// Persist the mate slice at most every 500 ms (02 §3.3).
let persistTimer: number | null = null;
store.subscribe(() => {
  if (persistTimer !== null) return;
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    saveSnapshot(sessionStorageOrNull(), store.getState().mate);
  }, 500);
});

// Flush the snapshot when the page is about to unload, so a reload within
// the debounce window keeps the journey.
window.addEventListener('pagehide', () => saveSnapshot(sessionStorageOrNull(), store.getState().mate));
window.addEventListener('beforeunload', () => saveSnapshot(sessionStorageOrNull(), store.getState().mate));
