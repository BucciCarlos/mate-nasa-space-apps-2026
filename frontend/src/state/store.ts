import { configureStore } from '@reduxjs/toolkit';
import type { Store } from '@reduxjs/toolkit';
import { mateApi } from './api';
import { createInitialState } from './initialState';
import mateReducer from './mateSlice';
import type { AppState } from './types';

export type RootState = {
  mate: AppState;
  mateApi: ReturnType<typeof mateApi.reducer>;
};

export type AppDispatch = Store<RootState>['dispatch'];

// The store is the single source of truth. It starts in a safe "empty" state;
// AppProvider fetches the scenario files from the backend (the authoritative
// data source) and dispatches scenarioReset to seed the real state.
// No sessionStorage/localStorage: a page reload starts fresh from the backend.
export const store: Store<RootState> = configureStore({
  reducer: {
    mate: mateReducer,
    [mateApi.reducerPath]: mateApi.reducer,
  },
  preloadedState: { mate: createInitialState(Date.now()) },
  middleware: (getDefault) =>
    getDefault({ serializableCheck: false, immutableCheck: false }).concat(mateApi.middleware),
});
