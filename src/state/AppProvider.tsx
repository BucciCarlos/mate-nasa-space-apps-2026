import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import type { Dispatch, ReactNode } from 'react';
import type { Action } from './actions';
import type { AppState } from './types';
import { reduce } from './reducer';
import { createInitialState } from './initialState';
import { loadSnapshot, saveSnapshot, sessionStorageOrNull } from './persistence';

interface AppContextValue { state: AppState; dispatch: Dispatch<Action> }

const AppContext = createContext<AppContextValue | null>(null);

function initState(): AppState {
  return loadSnapshot(sessionStorageOrNull()) ?? createInitialState(Date.now(), 'en');
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, undefined, initState);
  const timer = useRef<number | null>(null);

  // Persist at most every 500 ms (02 §3.3)
  useEffect(() => {
    if (timer.current !== null) return;
    timer.current = window.setTimeout(() => {
      timer.current = null;
      saveSnapshot(sessionStorageOrNull(), stateRef.current);
    }, 500);
  }, [state]);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Flush the snapshot when the page is about to unload, so a reload within the debounce window keeps the journey
  useEffect(() => {
    const flush = () => saveSnapshot(sessionStorageOrNull(), stateRef.current);
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => { window.removeEventListener('pagehide', flush); window.removeEventListener('beforeunload', flush); };
  }, []);

  // Ticker (02 §3.4)
  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: 'clock/tick', nowMs: Date.now() }), 1000);
    return () => window.clearInterval(id);
  }, []);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('AppProvider missing');
  return ctx;
}
