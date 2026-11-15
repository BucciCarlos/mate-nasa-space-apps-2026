import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { CrewId } from '../../demo/fd30';
import { sessionStorageOrNull } from '../../state/persistence';
import { OPS_KEY, opsReduce, restoreOps } from './opsState';
import type { OpsAction, OpsState } from './opsState';

export function useOpsJournal(owner: CrewId, time: number) {
  const session = useRef({ owner, time }); session.current = { owner, time };
  const [state, reduce] = useReducer((previous: OpsState, envelope: { action: OpsAction; owner: CrewId; time: number }) =>
    opsReduce(previous, envelope.action, envelope.owner, envelope.time), undefined, () => {
    try { return restoreOps(sessionStorageOrNull()?.getItem(OPS_KEY) ?? null); } catch { return restoreOps(null); }
  });
  const dispatch = useCallback((action: OpsAction) => reduce({ action, ...session.current }), []);
  const latest = useRef(state); latest.current = state;
  useEffect(() => {
    const save = () => { try { sessionStorageOrNull()?.setItem(OPS_KEY, JSON.stringify(latest.current)); } catch { /* Private in-memory use remains available. */ } };
    save(); window.addEventListener('pagehide', save);
    return () => { save(); window.removeEventListener('pagehide', save); };
  }, [state]);
  return { state, dispatch };
}
