import { configureStore } from '@reduxjs/toolkit';
import type { Middleware } from '@reduxjs/toolkit';
import { mateApi } from './api';
import { createInitialState } from './initialState';
import mateReducer from './mateSlice';
import type { AppState } from './types';

export type RootState = {
  mate: AppState;
  mateApi: ReturnType<typeof mateApi.reducer>;
};

// The hand-written slice helpers (localeSet, planChangeSent, ...) are plain
// thunks, not createAsyncThunk, so a minimal thunk middleware lets them run
// through the typed dispatch.
const thunk: Middleware = (api) => (next) => (action) => {
  if (typeof action === 'function') return action(api.dispatch, api.getState());
  return next(action);
};

export type AppDispatch = typeof store.dispatch;

// The store is the single source of truth. It starts in a safe "empty" state;
// AppProvider fetches the scenario files from the backend (the authoritative
// data source) and dispatches scenarioReset to seed the real state.
// No sessionStorage/localStorage: a page reload starts fresh from the backend.
export const store = configureStore({
  reducer: {
    mate: mateReducer,
    [mateApi.reducerPath]: mateApi.reducer,
  },
  preloadedState: { mate: createInitialState(Date.now()) },
  middleware: (getDefault) =>
    getDefault({ serializableCheck: false, immutableCheck: false }).concat(thunk, mateApi.middleware),
});
