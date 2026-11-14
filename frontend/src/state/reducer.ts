// Compatibility shim: the old `reduce(state, action)` entry point, now backed by the RTK slice.
// New code should import thunks from './mateSlice' and use the Redux store.
import { mateSlice } from './mateSlice';
import type { Action } from './actions';
import type {
  AdvanceMinutes, AppState, CompanionColor, CompanionInput, HighlightTarget, Interval, Locale, MissionId,
  ObservationPrefill, ObservationTopic, Route, UserText,
} from './types';

type ObsPayload = {
  missionId: MissionId; crewId: string; topics: ObservationTopic[];
  privateNote: UserText | null; relatedChangeId: string | null;
  share: { comment: UserText | null } | null; nowMs: number;
};

const MAP: Record<string, (s: AppState, a: Action) => AppState> = {
  'locale/set': (s, a) => mateSlice.reducer(s, mateSlice.actions.localeSet((a as { locale: Locale }).locale)),
  'ground/role_set': (s, a) => mateSlice.reducer(s, mateSlice.actions.groundRoleSet((a as { role: AppState['groundRole'] }).role)),
  'plan/change_sent': (s, a) => {
    const { missionId, taskId, advanceMinutes, nowMs } = a as { missionId: MissionId; taskId: string; advanceMinutes: AdvanceMinutes; nowMs: number };
    return mateSlice.reducer(s, mateSlice.actions.planChangeSent({ missionId, taskId, advanceMinutes, nowMs }));
  },
  'link/status_set': (s, a) => {
    const { missionId, status, nowMs } = a as { missionId: MissionId; status: 'up' | 'down'; nowMs: number };
    return mateSlice.reducer(s, mateSlice.actions.linkStatusSet({ missionId, status, nowMs }));
  },
  'clock/tick': (s, a) => mateSlice.reducer(s, mateSlice.actions.clockTick((a as { nowMs: number }).nowMs)),
  'notice/seen': (s, a) => {
    const { missionId, noticeId } = a as { missionId: MissionId; noticeId: string };
    return mateSlice.reducer(s, mateSlice.actions.noticeSeen({ missionId, noticeId }));
  },
  'companion/asked': (s, a) => {
    const { missionId, input, nowMs } = a as { missionId: MissionId; input: CompanionInput; nowMs: number };
    return mateSlice.reducer(s, mateSlice.actions.companionAsked({ missionId, input, nowMs }));
  },
  'companion/actions_executed': (s, a) => {
    const { missionId, turnId } = a as { missionId: MissionId; turnId: string };
    return mateSlice.reducer(s, mateSlice.actions.companionActionsExecuted({ missionId, turnId }));
  },
  'observation/saved': (s, a) => mateSlice.reducer(s, mateSlice.actions.observationSaved(a as Omit<Action & ObsPayload, 'type'>)),
  'ui/range_set': (s, a) => mateSlice.reducer(s, mateSlice.actions.uiRangeSet((a as { range: Interval | null }).range)),
  'ui/highlight_set': (s, a) => mateSlice.reducer(s, mateSlice.actions.uiHighlightSet((a as { target: HighlightTarget | null }).target)),
  'ui/companion_toggle': (s, a) => mateSlice.reducer(s, mateSlice.actions.uiCompanionToggle((a as { open?: boolean }).open)),
  'ui/source_open': (s, a) => mateSlice.reducer(s, mateSlice.actions.uiSourceOpen((a as { sourceId: string | null }).sourceId)),
  'ui/observation_prefill': (s, a) => mateSlice.reducer(s, mateSlice.actions.uiObservationPrefill((a as { prefill: ObservationPrefill | null }).prefill)),
  'ui/last_route': (s, a) => mateSlice.reducer(s, mateSlice.actions.uiLastRoute((a as { route: Route }).route)),
  'companion/customized': (s, a) => {
    const { name, color } = a as { name: string; color: CompanionColor };
    return mateSlice.reducer(s, mateSlice.actions.companionCustomized({ name, color }));
  },
  'scenario/reset': (s, a) => mateSlice.reducer(s, mateSlice.actions.scenarioReset((a as { nowMs: number }).nowMs)),
};

export function reduce(state: AppState, action: Action): AppState {
  const fn = MAP[action.type];
  return fn ? fn(state, action) : state;
}
