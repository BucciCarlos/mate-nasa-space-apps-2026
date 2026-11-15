// Selectors. Ground selectors take (state, missionId, role) and never expose onboard-private data (02 §9).
import type {
  AppState, CrewMember, GroundRole, InboxItem, LinkMessage, LogEntry, MessageStatus, MissionId, MissionState, ObservationTopic, ScheduleBlock,
  ScheduleChange, SharedSummary, UserText,
} from './types';
import { ONBOARD_MISSION_ID } from './types';
import { defaultAgendaRange, toMs } from '../domain/time';

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

const EMPTY_MISSION: Record<MissionId, MissionState> = {
  iss: { id: 'iss', seq: 0, clockStart: new Date(0).toISOString(), flightDayOne: new Date(0).toISOString(), crew: [], onboardUserId: null, link: { status: 'up', transitMs: 0, downSinceMs: null }, ground: { plan: { missionId: 'iss', version: 0, blocks: [], changeId: null }, changes: [], inbox: [] }, onboard: { plan: { missionId: 'iss', version: 0, blocks: [], changeId: null }, notices: [], observations: [], conversation: [] }, messages: [], log: [] },
  cislunar: { id: 'cislunar', seq: 0, clockStart: new Date(0).toISOString(), flightDayOne: new Date(0).toISOString(), crew: [], onboardUserId: null, link: { status: 'up', transitMs: 0, downSinceMs: null }, ground: { plan: { missionId: 'cislunar', version: 0, blocks: [], changeId: null }, changes: [], inbox: [] }, onboard: { plan: { missionId: 'cislunar', version: 0, blocks: [], changeId: null }, notices: [], observations: [], conversation: [] }, messages: [], log: [] },
};

const warnedMissions = new Set<string>();

/**
 * Defensive lookup: a corrupted state must never white-screen the app. Views
 * fall back to empty data instead of crashing. Logs the corruption once per
 * mission so the root cause can be identified.
 */
function missionOrEmpty(state: AppState, missionId: MissionId): MissionState {
  const m = state.missions?.[missionId];
  if (m && m.ground && m.onboard && Array.isArray(m.messages) && Array.isArray(m.log) && Array.isArray(m.crew) && m.link) {
    return m;
  }
  const key = `${missionId}:${!m ? 'missing' : Object.keys(m).filter((k) => m[k as keyof MissionState] === undefined).join(',') || 'unknown'}`;
  if (!warnedMissions.has(key)) {
    warnedMissions.add(key);
    // eslint-disable-next-line no-console
    console.error(`[mate] corrupted mission state for '${missionId}', falling back to empty state`, {
      missionId,
      missionKeys: m ? Object.keys(m) : null,
      missionsKeys: state.missions ? Object.keys(state.missions) : null,
      schemaVersion: state.schemaVersion,
      stateKeys: state ? Object.keys(state) : null,
    });
  }
  return EMPTY_MISSION[missionId];
}

export function selectGroundLinkRows(state: AppState, missionId: MissionId, role: GroundRole): GroundLinkRow[] {
  const m = missionOrEmpty(state, missionId);
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
  return missionOrEmpty(state, missionId).ground.inbox.map((i) => projectInbox(i, role)).sort((a, b) => b.receivedAtMs - a.receivedAtMs);
}

export function selectGroundCrew(state: AppState, missionId: MissionId, _role: GroundRole): { crew: CrewMember[]; linkDownSinceMs: number | null } {
  const m = missionOrEmpty(state, missionId);
  return { crew: m.crew, linkDownSinceMs: m.link.downSinceMs };
}

// ---- Ground: agenda and log ----

export function selectGroundPlan(state: AppState, missionId: MissionId, _role: GroundRole) {
  const m = missionOrEmpty(state, missionId);
  return { plan: m.ground.plan, crew: m.crew, changes: m.ground.changes, messages: selectGroundLinkRows(state, missionId, _role) };
}

export function selectGroundLog(state: AppState, missionId: MissionId, role: GroundRole): LogEntry[] {
  return missionOrEmpty(state, missionId).log.filter((e) => e.visibleTo.includes(role)).slice().reverse();
}

export function selectChange(state: AppState, missionId: MissionId, changeId: string | null): ScheduleChange | null {
  if (!changeId) return null;
  return missionOrEmpty(state, missionId).ground.changes.find((c) => c.id === changeId) ?? null;
}

// ---- Onboard (always the ISS mission) ----

export function selectOnboard(state: AppState) {
  const m = missionOrEmpty(state, ONBOARD_MISSION_ID);
  const user = m.crew.find((c) => c.id === m.onboardUserId) ?? m.crew[0];
  return { mission: m, user, plan: m.onboard.plan, notices: m.onboard.notices, observations: m.onboard.observations, conversation: m.onboard.conversation, link: m.link };
}

export function selectOnboardLog(state: AppState): LogEntry[] {
  return missionOrEmpty(state, ONBOARD_MISSION_ID).log.filter((e) => e.visibleTo.includes('astronaut'));
}

export function selectAgendaRange(state: AppState) {
  return state.ui.agendaRange ?? defaultAgendaRange(missionOrEmpty(state, ONBOARD_MISSION_ID).clockStart);
}

export function selectSummaryStatus(state: AppState, summaryId: string | null): MessageStatus | null {
  if (!summaryId) return null;
  const msg = missionOrEmpty(state, ONBOARD_MISSION_ID).messages.find((x) => x.kind === 'crew_summary' && x.summary.id === summaryId);
  return msg ? msg.status : null;
}

export function upcomingBlocks(plan: { blocks: ScheduleBlock[] }, crewId: string, missionNowMs: number, count: number): ScheduleBlock[] {
  return plan.blocks
    .filter((b) => b.crewIds.includes(crewId) && toMs(b.end) > missionNowMs)
    .sort((a, b) => toMs(a.start) - toMs(b.start))
    .slice(0, count);
}
