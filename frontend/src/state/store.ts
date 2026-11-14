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

// The store is created eagerly at module load. If scenarios are not yet
// loaded, createInitialState returns a safe "empty" state. AppProvider
// fetches scenarios from the backend and dispatches scenarioReset to
// replace the empty state with real data. No persistence — state lives
// only in Redux (02 §3.3 updated).
export const store: Store<RootState> = configureStore({
  reducer: {
    mate: mateReducer,
    [mateApi.reducerPath]: mateApi.reducer,
  },
  preloadedState: { mate: createInitialState(Date.now()) },
  middleware: (getDefault) =>
    getDefault({ serializableCheck: false, immutableCheck: false }).concat(mateApi.middleware),
});
