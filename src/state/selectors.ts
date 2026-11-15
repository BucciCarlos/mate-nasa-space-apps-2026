// Selectors. Ground selectors take (state, missionId, role) and never expose onboard-private data (02 §9).
import type {
  AppState, CrewMember, GroundRole, InboxItem, LinkMessage, LogEntry, MessageStatus, MissionId, ObservationTopic, ScheduleBlock,
  ScheduleChange, SharedSummary, UserText, MonitoringProfile, CompanionPreferences, MedicalReviewMessage,
} from './types';
import { ONBOARD_MISSION_ID } from './types';
import { defaultAgendaRange, toMs } from '../domain/time';
import { MONITORING_CREW_IDS } from '../domain/monitoring';

// ---- Ground: link rows (02 §9.4) ----

export interface GroundUplinkRow {
  id: string; direction: 'uplink'; seq: number; status: MessageStatus; statusSinceMs: number; createdAtMs: number;
  deliveredAtMs: number | null; changeId: string; planVersion: number;
}
export interface GroundDownlinkRow {
  id: string; direction: 'downlink'; seq: number; status: MessageStatus; statusSinceMs: number; createdAtMs: number;
  deliveredAtMs: number | null;
}
export type GroundLinkRow = GroundUplinkRow | GroundDownlinkRow;

/** The only projection of a downlink message that Ground views may receive. Never includes summary content. */
export function toGroundDownlinkRow(message: LinkMessage, _role: GroundRole): GroundDownlinkRow {
  return {
    id: message.id, direction: 'downlink', seq: message.seq, status: message.status, statusSinceMs: message.statusSinceMs,
    createdAtMs: message.createdAtMs, deliveredAtMs: message.deliveredAtMs,
  };
}

export function selectGroundLinkRows(state: AppState, missionId: MissionId, role: GroundRole): GroundLinkRow[] {
  const m = state.missions[missionId];
  return [...m.messages]
    .sort((a, b) => a.seq - b.seq)
    .map((msg): GroundLinkRow => msg.kind === 'plan_update'
      ? { id: msg.id, direction: 'uplink', seq: msg.seq, status: msg.status, statusSinceMs: msg.statusSinceMs, createdAtMs: msg.createdAtMs, deliveredAtMs: msg.deliveredAtMs, changeId: msg.changeId, planVersion: msg.plan.version }
      : toGroundDownlinkRow(msg, role));
}

// ---- Ground: crew and inbox (02 §9.3) ----

export interface GroundInboxRowMedical {
  kind: 'medical'; messageId: string; summaryId: string; crewId: string; receivedAtMs: number; topics: ObservationTopic[];
  relatedChangeId: string | null; comment: UserText | null;
}
export interface GroundInboxRowRestricted { kind: 'restricted'; messageId: string; crewId: string; receivedAtMs: number }
export type GroundInboxRow = GroundInboxRowMedical | GroundInboxRowRestricted;

function projectInbox(item: InboxItem, role: GroundRole): GroundInboxRow {
  const s: SharedSummary = item.summary;
  if (role === 'medical_professional') {
    return { kind: 'medical', messageId: item.messageId, summaryId: s.id, crewId: s.crewId, receivedAtMs: item.receivedAtMs, topics: [...s.topics], relatedChangeId: s.relatedChangeId, comment: s.comment };
  }
  return { kind: 'restricted', messageId: item.messageId, crewId: s.crewId, receivedAtMs: item.receivedAtMs };
}

export function selectGroundInbox(state: AppState, missionId: MissionId, role: GroundRole): GroundInboxRow[] {
  return state.missions[missionId].ground.inbox.map((i) => projectInbox(i, role)).sort((a, b) => b.receivedAtMs - a.receivedAtMs);
}

export function selectGroundCrew(state: AppState, missionId: MissionId, _role: GroundRole): { crew: CrewMember[]; linkDownSinceMs: number | null } {
  const m = state.missions[missionId];
  return { crew: m.crew, linkDownSinceMs: m.link.downSinceMs };
}

export function selectCommander(state: AppState, missionId: MissionId) {
  const mission = state.missions[missionId];
  return { plan: mission.onboard.plan, crew: mission.crew, linkStatus: mission.link.status, clockStart: mission.clockStart };
}

// ---- Ground: agenda and log ----

export function selectGroundPlan(state: AppState, missionId: MissionId, _role: GroundRole) {
  const m = state.missions[missionId];
  return { plan: m.ground.plan, crew: m.crew, changes: m.ground.changes, messages: selectGroundLinkRows(state, missionId, _role) };
}

export function selectGroundLog(state: AppState, missionId: MissionId, role: GroundRole): LogEntry[] {
  return state.missions[missionId].log.filter((e) => e.visibleTo.includes(role)).slice().reverse();
}

export function selectChange(state: AppState, missionId: MissionId, changeId: string | null): ScheduleChange | null {
  if (!changeId) return null;
  return state.missions[missionId].ground.changes.find((c) => c.id === changeId) ?? null;
}

// ---- Onboard (always the ISS mission) ----

export function selectOnboard(state: AppState) {
  const m = state.missions[ONBOARD_MISSION_ID];
  const user = m.crew.find((c) => c.id === m.onboardUserId) ?? m.crew[0];
  return {
    mission: m, user, plan: m.onboard.plan, link: m.link,
    notices: m.onboard.notices.filter((notice) => notice.crewId === user.id),
    observations: m.onboard.observations.filter((observation) => observation.crewId === user.id),
    conversation: m.onboard.conversation.filter((turn) => (turn.crewId ?? MONITORING_CREW_IDS[0]) === user.id),
  };
}

export function selectMonitoringProfile(state: AppState, crewId: string): MonitoringProfile {
  return state.monitoring?.profiles[crewId] ?? { activities: [] };
}

export function selectCompanionPreferences(state: AppState, crewId: string): CompanionPreferences {
  return selectMonitoringProfile(state, crewId).companion ?? {
    ...(crewId === MONITORING_CREW_IDS[0] ? state.companion : { name: 'Mate', color: 'teal' as const }),
    avatar: 'isotype', style: 'guided',
  };
}

export function selectOwnMedicalReviews(state: AppState): MedicalReviewMessage[] {
  const mission = state.missions.iss;
  return mission.messages.filter((message): message is MedicalReviewMessage =>
    message.kind === 'medical_review' && message.crewId === mission.onboardUserId);
}

export function selectDeliveredMedicalReviews(state: AppState, missionId: MissionId, role: GroundRole) {
  if (role !== 'medical_professional') return [];
  const mission = state.missions[missionId];
  return mission.messages.flatMap((message) =>
    message.kind === 'medical_review' && message.status === 'delivered' && message.deliveredAtMs !== null &&
    mission.crew.some((crew) => crew.id === message.crewId)
      ? [{ id: message.id, crewId: message.crewId, sample: message.sample, receivedAtMs: message.deliveredAtMs }]
      : []);
}

export function selectOnboardLog(state: AppState): LogEntry[] {
  return state.missions[ONBOARD_MISSION_ID].log.filter((e) => e.visibleTo.includes('astronaut'));
}

export function selectAgendaRange(state: AppState) {
  return state.ui.agendaRange ?? defaultAgendaRange(state.missions[ONBOARD_MISSION_ID].clockStart);
}

export function selectSummaryStatus(state: AppState, summaryId: string | null): MessageStatus | null {
  if (!summaryId) return null;
  const msg = state.missions[ONBOARD_MISSION_ID].messages.find((x) => x.kind === 'crew_summary' && x.summary.id === summaryId);
  return msg ? msg.status : null;
}

export function upcomingBlocks(plan: { blocks: ScheduleBlock[] }, crewId: string, missionNowMs: number, count: number): ScheduleBlock[] {
  return plan.blocks
    .filter((b) => b.crewIds.includes(crewId) && toMs(b.end) > missionNowMs)
    .sort((a, b) => toMs(a.start) - toMs(b.start))
    .slice(0, count);
}
