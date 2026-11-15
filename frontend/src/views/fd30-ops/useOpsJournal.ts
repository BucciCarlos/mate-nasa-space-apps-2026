import { useCallback, useReducer, useRef } from 'react';
import type { CrewId } from '../../demo/fd30';
import { opsReduce, restoreOps } from './opsState';
import type { OpsAction, OpsState } from './opsState';

// In-memory only (no sessionStorage): the ops journal starts fresh on every
// mount. The Redux store + backend remain the app's state sources.
export function useOpsJournal(owner: CrewId, time: number) {
  const session = useRef({ owner, time }); session.current = { owner, time };
  const [state, reduce] = useReducer((previous: OpsState, envelope: { action: OpsAction; owner: CrewId; time: number }) =>
    opsReduce(previous, envelope.action, envelope.owner, envelope.time), undefined, () => restoreOps(null));
  const dispatch = useCallback((action: OpsAction) => reduce({ action, ...session.current }), []);
  return { state, dispatch };
}
