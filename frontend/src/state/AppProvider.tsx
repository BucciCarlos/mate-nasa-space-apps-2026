import { createContext, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useDispatch as useRd, useSelector, Provider } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import { store, type RootState, type AppDispatch } from './store';
import { clockTick, scenarioReset } from './mateSlice';
import { useIssScenarioQuery, useCislunarScenarioQuery } from './api';
import { setScenarios } from './initialState';
import type { AppState } from './types';

export const useAppDispatch: () => AppDispatch = () => useRd() as AppDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export interface AppContextValue {
  state: AppState;
  dispatch: AppDispatch;
  ready: boolean;
  loadError: string | null;
}

const AppCtx = createContext<AppContextValue | null>(null);

function AppCtxConsumer({ children }: { children: ReactNode }) {
  const state = useAppSelector((s) => s.mate) as AppState;
  const dispatch = useAppDispatch();

  // Fetch scenarios from the backend on every mount. No sessionStorage —
  // state lives only in Redux.
  const iss = useIssScenarioQuery();
  const cislunar = useCislunarScenarioQuery();

  useEffect(() => {
    console.log('[AppProvider] Scenario query status:', {
      iss: { status: iss.status, error: iss.error },
      cislunar: { status: cislunar.status, error: cislunar.error },
    });
    if (iss.isSuccess && cislunar.isSuccess) {
      console.log('[AppProvider] Both scenarios loaded, dispatching scenarioReset');
      setScenarios(iss.data, cislunar.data);
      dispatch(scenarioReset(Date.now()));
    }
  }, [iss.isSuccess, cislunar.isSuccess, iss.data, cislunar.data, iss.status, cislunar.status, iss.error, cislunar.error, dispatch]);

  // Ticker (02 §3.4)
  useEffect(() => {
    const id = window.setInterval(() => dispatch(clockTick(Date.now())), 1000);
    return () => window.clearInterval(id);
  }, [dispatch]);

  // Ready when the state has real crew data.
  const ready = state.missions.iss.crew.length > 0;
  const rawError = iss.error ?? cislunar.error;
  const loadError = (iss.isError || cislunar.isError)
    ? (rawError instanceof Error ? rawError.message : typeof rawError === 'string' ? rawError : JSON.stringify(rawError) ?? 'API unreachable')
    : null;

  const value = useMemo<AppContextValue>(
    () => ({ state, dispatch, ready, loadError }),
    [state, dispatch, ready, loadError],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <AppCtxConsumer>{children}</AppCtxConsumer>
    </Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('AppProvider missing');
  return ctx;
}

export { store };
export type { RootState, AppDispatch };
