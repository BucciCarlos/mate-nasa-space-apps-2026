import type {
  AdvanceMinutes, CompanionColor, CompanionInput, GroundRole, HighlightTarget, Interval, Locale, MissionId,
  ObservationPrefill, ObservationTopic, Route, UserText,
  CompanionPreferences, FlightMetric, TrajectoryStage, WellbeingActivity, WellbeingCheckIn, WellbeingProfile,
} from './types';

export type Action =
  | { type: 'wellbeing/check_in'; crewId: string; entry: WellbeingCheckIn }
  | { type: 'wellbeing/hobby'; crewId: string; hobby: WellbeingProfile['hobby'] }
  | { type: 'wellbeing/decision'; crewId: string; activity: WellbeingActivity; decision: 'completed' | 'dismissed'; atMs: number }
  | { type: 'wellbeing/family_read'; crewId: string }
  | { type: 'wellbeing/note'; crewId: string; note: UserText; atMs: number }
  | { type: 'locale/set'; locale: Locale }
  | { type: 'ground/role_set'; role: GroundRole }
  | { type: 'monitoring/profile_selected'; crewId: string }
  | { type: 'monitoring/stage_set'; stage: TrajectoryStage }
  | { type: 'monitoring/companion_saved'; preferences: CompanionPreferences }
  | { type: 'monitoring/activity_saved'; crewId: string; metric: FlightMetric; kind: 'personal_break' | 'journal'; note?: UserText; nowMs: number }
  | { type: 'monitoring/review_requested'; crewId: string; metric: FlightMetric; consent: true; nowMs: number }
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
