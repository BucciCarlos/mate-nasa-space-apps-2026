import { createContext, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useDispatch as useRd, useSelector, Provider } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import { store, type RootState, type AppDispatch } from './store';
import { clockTick } from './mateSlice';
import { useIssScenarioQuery, useCislunarScenarioQuery } from './api';
import { setScenarios } from './initialState';
import { loadSnapshot, sessionStorageOrNull } from './persistence';
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

  // Bootstrap: hydrate from backend unless we restored a sessionStorage snapshot
  const hasSnapshot = useMemo(() => loadSnapshot(sessionStorageOrNull()) !== null, []);
  const iss = useIssScenarioQuery(undefined, { skip: hasSnapshot });
  const cislunar = useCislunarScenarioQuery(undefined, { skip: hasSnapshot });

  useEffect(() => {
    if (hasSnapshot) return;
    if (iss.isSuccess && cislunar.isSuccess) {
      setScenarios(iss.data, cislunar.data);
    }
  }, [hasSnapshot, iss.isSuccess, cislunar.isSuccess, iss.data, cislunar.data]);

  // Ticker (02 §3.4)
  useEffect(() => {
    const id = window.setInterval(() => dispatch(clockTick(Date.now())), 1000);
    return () => window.clearInterval(id);
  }, [dispatch]);

  const ready = hasSnapshot || (iss.isSuccess && cislunar.isSuccess);
  const loadError = !hasSnapshot && (iss.isError || cislunar.isError)
    ? (iss.error ?? cislunar.error) instanceof Error ? String(iss.error ?? cislunar.error) : 'API unreachable'
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
