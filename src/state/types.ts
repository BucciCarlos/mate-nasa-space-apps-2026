// Data model contract: docs/specs/02-architecture-contracts.md §5

export type MissionId = 'iss' | 'cislunar';
export type Locale = 'en' | 'es';
export type GroundRole = 'mission_operator' | 'medical_professional';
export type Viewer = GroundRole | 'astronaut';
export type IsoUtc = string;
export interface Bilingual { en: string; es: string }
export interface Interval { start: IsoUtc; end: IsoUtc }

export const ONBOARD_MISSION_ID: MissionId = 'iss';
export const MISSION_IDS: MissionId[] = ['iss', 'cislunar'];

export interface CrewMember {
  id: string;
  missionId: MissionId;
  name: string;
  roleTitle: Bilingual;
}

export type BlockKind = 'sleep' | 'pre_sleep' | 'post_sleep' | 'task' | 'exercise' | 'meal' | 'personal' | 'conference' | 'muscle-assessment';
export interface ScheduleBlock extends Interval {
  id: string;
  missionId: MissionId;
  kind: BlockKind;
  crewIds: string[];
  title: Bilingual;
  movable: boolean;
}
export interface PlanVersion { missionId: MissionId; version: number; blocks: ScheduleBlock[]; changeId: string | null }

export type AdvanceMinutes = 30 | 60 | 90 | 120;
export const ADVANCE_OPTIONS: AdvanceMinutes[] = [30, 60, 90, 120];
export interface BlockMove { blockId: string; kind: BlockKind; title: Bilingual; before: Interval; after: Interval }
export interface RestWindowChange { sleepBlockId: string; before: Interval; after: Interval; deltaMinutes: number }
export interface CrewChange { crewId: string; moves: BlockMove[]; rest: RestWindowChange | null }

export interface ScheduleChange {
  id: string; missionId: MissionId; createdAtMs: number;
  taskId: string; advanceMinutes: AdvanceMinutes;
  fromVersion: number; toVersion: number;
  perCrew: CrewChange[];
}

export type MessageStatus = 'queued' | 'in_transit' | 'delivered';
interface MessageBase {
  id: string; missionId: MissionId; status: MessageStatus;
  seq: number;
  createdAtMs: number;
  statusSinceMs: number;
  deliverAtMs: number | null;
  deliveredAtMs: number | null;
}
export interface PlanUpdateMessage extends MessageBase { direction: 'uplink'; kind: 'plan_update'; changeId: string; plan: PlanVersion }
export interface CrewSummaryMessage extends MessageBase { direction: 'downlink'; kind: 'crew_summary'; summary: SharedSummary }
export type LinkMessage = PlanUpdateMessage | CrewSummaryMessage;
export interface LinkState { status: 'up' | 'down'; transitMs: number; downSinceMs: number | null }

export type ObservationTopic = 'schedule' | 'rest' | 'workload' | 'wellbeing' | 'other';
export const OBSERVATION_TOPICS: ObservationTopic[] = ['schedule', 'rest', 'workload', 'wellbeing', 'other'];
export interface UserText { text: string; lang: Locale }
export interface Observation {
  id: string; missionId: MissionId; crewId: string; createdAtMs: number;
  topics: ObservationTopic[];
  privateNote: UserText | null;
  relatedChangeId: string | null;
  sharedSummaryId: string | null;
}
export interface SharedSummary {
  id: string; missionId: MissionId; crewId: string; createdAtMs: number;
  topics: ObservationTopic[];
  relatedChangeId: string | null;
  comment: UserText | null;
  audience: 'medical_professional';
}

export interface RuleTrace { ruleId: 'agenda.rest_window_delta'; fromVersion: number; toVersion: number; taskId: string; advanceMinutes: number }
export interface Notice {
  id: string; missionId: MissionId; crewId: string; createdAtMs: number; seen: boolean;
  kind: 'plan_change'; changeId: string; taskId: string;
  moves: BlockMove[];
  rest: RestWindowChange | null;
  trace: RuleTrace;
}

export type IntentId = 'schedule.what_changed' | 'schedule.show_change' | 'rest.how_much' | 'rest.effect_on_me'
  | 'why.it_matters' | 'observation.start' | 'privacy.who_sees' | 'link.status' | 'help' | 'unknown';
export const INTENT_PRIORITY: IntentId[] = [
  'schedule.show_change', 'rest.effect_on_me', 'rest.how_much', 'why.it_matters', 'schedule.what_changed',
  'observation.start', 'privacy.who_sees', 'link.status', 'help',
];

export type OnboardPage = 'today' | 'agenda' | 'observations';
export type GroundPage = 'agenda' | 'link' | 'crew' | 'log' | 'catalog' | 'evidence';
export type Route =
  | { view: 'fd30'; page: 'today' | 'sleep' | 'exercise' | 'laboratory' | 'catalog' | 'agenda' | 'evidence' | 'ground' | 'ground-evidence' | 'ground-agenda' | 'ground-catalog' | 'crew-dynamics' | 'ground-crew-dynamics' | 'crew' | 'wellbeing' | 'requests'; /** CAT08: Sources & evidence opens directly on this tab. */ tab?: 'radiation' }
  | { view: 'onboard'; page: OnboardPage }
  | { view: 'ground'; missionId: MissionId; page: GroundPage }
  | { view: 'settings' }
  | { view: 'notfound' };

export type HighlightTarget = { kind: 'change'; changeId: string } | { kind: 'block'; blockId: string };
export interface ObservationPrefill { relatedChangeId: string | null; topics: ObservationTopic[] }
export type UiAction =
  | { type: 'navigate'; route: Route }
  | { type: 'select_range'; range: Interval }
  | { type: 'highlight'; target: HighlightTarget }
  | { type: 'clear_highlight' }
  | { type: 'open_source'; sourceId: string }
  | { type: 'open_observation_form'; prefill: ObservationPrefill };

export type ReplyStatus = 'ok' | 'no_evidence' | 'not_understood' | 'unavailable';
export type CompanionTemplateId =
  | 'changeSummary' | 'changeNone' | 'changeNoneLinkDown' | 'showChange' | 'restDelta' | 'restUnchanged'
  | 'noComparableRecords' | 'whyItMatters' | 'observationStart' | 'whoSees' | 'linkUp' | 'linkDown' | 'help' | 'notUnderstood';
export interface CompanionReply {
  templateId: CompanionTemplateId;
  params: Record<string, string | number>;
  status: ReplyStatus;
  sourceIds: string[];
  actions: UiAction[];
  executed: boolean;
}
export type InputMode = 'text' | 'chip' | 'simulated_voice';
export interface CompanionInput { mode: InputMode; text: UserText | null; intent: IntentId }
export interface CompanionTurn {
  id: string; atMs: number; speaker: 'user' | 'companion';
  input?: CompanionInput;
  reply?: CompanionReply;
}

export type LogKind = 'change_sent' | 'plan_delivered' | 'link_down' | 'link_up' | 'summary_queued' | 'summary_received'
  | 'notice_created' | 'observation_saved';
export interface LogEntry {
  id: string; missionId: MissionId; atMs: number;
  kind: LogKind;
  visibleTo: Viewer[];
  refs: { changeId?: string; messageId?: string; summaryId?: string; observationId?: string; noticeId?: string };
}

export interface InboxItem { messageId: string; summary: SharedSummary; receivedAtMs: number }

export interface MissionState {
  id: MissionId; seq: number;
  clockStart: IsoUtc; flightDayOne: IsoUtc;
  crew: CrewMember[];
  onboardUserId: string | null;
  link: LinkState;
  ground: { plan: PlanVersion; changes: ScheduleChange[]; inbox: InboxItem[] };
  onboard: { plan: PlanVersion; notices: Notice[]; observations: Observation[]; conversation: CompanionTurn[] };
  messages: LinkMessage[];
  log: LogEntry[];
}

export type CompanionColor = 'teal' | 'blue' | 'violet' | 'amber' | 'rose' | 'green';

export interface AppState {
  schemaVersion: 1;
  locale: Locale;
  groundRole: GroundRole;
  sessionStartMs: number;
  missions: Record<MissionId, MissionState>;
  companion: { name: string; color: CompanionColor };
  ui: {
    agendaRange: Interval | null;
    highlight: HighlightTarget | null;
    companionOpen: boolean;
    openSourceId: string | null;
    observationPrefill: ObservationPrefill | null;
    lastRoute: { onboard: Route; ground: Route };
  };
}

// Scenario file shape (src/data/scenario/*.json)
export interface ScenarioFile {
  id: MissionId;
  clockStart: IsoUtc;
  flightDayOne: IsoUtc;
  onboardUserId: string | null;
  link: { transitMs: number };
  crew: CrewMember[];
  blocks: ScheduleBlock[];
}

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  kind: 'nasa_resource' | 'partner_resource' | 'dataset' | 'standard' | 'publication';
  challengeResource: boolean;
  accessedAt: string;
  supports: Bilingual;
  status: 'verified' | 'partial' | 'pending';
  reuse: Bilingual;
}
