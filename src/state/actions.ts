import type {
  AdvanceMinutes, CompanionColor, CompanionInput, GroundRole, HighlightTarget, Interval, Locale, MissionId,
  ObservationPrefill, ObservationTopic, Route, UserText,
} from './types';

export type Action =
  | { type: 'locale/set'; locale: Locale }
  | { type: 'ground/role_set'; role: GroundRole }
  | { type: 'plan/change_sent'; missionId: MissionId; taskId: string; advanceMinutes: AdvanceMinutes; nowMs: number }
  | { type: 'link/status_set'; missionId: MissionId; status: 'up' | 'down'; nowMs: number }
  | { type: 'clock/tick'; nowMs: number }
  | { type: 'notice/seen'; missionId: MissionId; noticeId: string }
  | { type: 'companion/asked'; missionId: MissionId; input: CompanionInput; nowMs: number }
  | { type: 'companion/actions_executed'; missionId: MissionId; turnId: string }
  | {
      type: 'observation/saved'; missionId: MissionId; crewId: string; topics: ObservationTopic[];
      privateNote: UserText | null; relatedChangeId: string | null; share: { comment: UserText | null } | null; nowMs: number;
    }
  | { type: 'ui/range_set'; range: Interval | null }
  | { type: 'ui/highlight_set'; target: HighlightTarget | null }
  | { type: 'ui/companion_toggle'; open?: boolean }
  | { type: 'ui/source_open'; sourceId: string | null }
  | { type: 'ui/observation_prefill'; prefill: ObservationPrefill | null }
  | { type: 'ui/last_route'; route: Route }
  | { type: 'companion/customized'; name: string; color: CompanionColor }
  | { type: 'scenario/reset'; nowMs: number };
