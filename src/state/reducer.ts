// Event engine ("coordinator"): docs/specs/02-architecture-contracts.md §6–§7
import type { Action } from './actions';
import type {
  AppState, CompanionTurn, CrewSummaryMessage, LinkMessage, LogEntry, LogKind, MissionId, MissionState, Notice,
  Observation, PlanUpdateMessage, ScheduleChange, SharedSummary, Viewer,
} from './types';
import { MISSION_IDS } from './types';
import { createInitialState } from './initialState';
import { advanceTask, diffForCrew } from '../domain/agenda';
import { belongsTo, makeId } from '../domain/ids';
import { respond } from '../domain/companion/respond';
import { latestFlightSample, MONITORING_CREW_IDS } from '../domain/monitoring';
import { selectMonitoringProfile } from './selectors';

const ALL_VIEWERS: Viewer[] = ['astronaut', 'mission_operator', 'medical_professional'];
const GROUND_VIEWERS: Viewer[] = ['mission_operator', 'medical_professional'];
const ASTRONAUT: Viewer[] = ['astronaut'];

/** Stagger between consecutive deliveries when a queue drains, so the order is visible (02 §7.1, L2 allows later delivery). */
const DRAIN_STAGGER_MS = 600;

function warn(message: string): void {
  if (import.meta.env?.DEV) console.warn(`[mate] ${message}`);
}

function nextId(m: MissionState, kind: string): { m: MissionState; id: string } {
  const seq = m.seq + 1;
  return { m: { ...m, seq }, id: makeId(m.id, kind, seq) };
}

function withLog(m: MissionState, kind: LogKind, atMs: number, visibleTo: Viewer[], refs: LogEntry['refs']): MissionState {
  const r = nextId(m, 'log');
  const entry: LogEntry = { id: r.id, missionId: m.id, atMs, kind, visibleTo, refs };
  return { ...r.m, log: [...r.m.log, entry] };
}

function setMission(state: AppState, m: MissionState): AppState {
  return { ...state, missions: { ...state.missions, [m.id]: m } };
}

function lastSeq(m: MissionState): number {
  return m.messages.reduce((acc, msg) => Math.max(acc, msg.seq), 0);
}

function enqueue(m: MissionState, make: (id: string, seq: number) => LinkMessage, nowMs: number): { m: MissionState; message: LinkMessage } {
  const r = nextId(m, 'msg');
  const seq = lastSeq(r.m) + 1;
  const up = r.m.link.status === 'up';
  const base = make(r.id, seq);
  const message: LinkMessage = {
    ...base,
    status: up ? 'in_transit' : 'queued',
    statusSinceMs: nowMs,
    deliverAtMs: up ? nowMs + r.m.link.transitMs : null,
  } as LinkMessage;
  return { m: { ...r.m, messages: [...r.m.messages, message] }, message };
}

// ---- delivery effects (02 §6.2) ----

function deliverPlanUpdate(m: MissionState, msg: PlanUpdateMessage, nowMs: number): MissionState {
  let next = m;
  if (msg.plan.version > next.onboard.plan.version) {
    const user = next.onboardUserId;
    const prevPlan = next.onboard.plan;
    next = { ...next, onboard: { ...next.onboard, plan: msg.plan } };
    if (user) {
      const task = msg.plan.blocks.find((b) => b.id === next.ground.changes.find((c) => c.id === msg.changeId)?.taskId);
      const change = next.ground.changes.find((c) => c.id === msg.changeId);
      if (task && change && task.crewIds.includes(user)) {
        const diff = diffForCrew(prevPlan, msg.plan, user);
        const r = nextId(next, 'ntc');
        const notice: Notice = {
          id: r.id, missionId: next.id, crewId: user, createdAtMs: nowMs, seen: false,
          kind: 'plan_change', changeId: msg.changeId, taskId: task.id,
          moves: diff.moves, rest: diff.rest,
          trace: { ruleId: 'agenda.rest_window_delta', fromVersion: change.fromVersion, toVersion: change.toVersion, taskId: task.id, advanceMinutes: change.advanceMinutes },
        };
        next = { ...r.m, onboard: { ...r.m.onboard, notices: [...r.m.onboard.notices, notice] } };
        next = withLog(next, 'notice_created', nowMs, ASTRONAUT, { changeId: msg.changeId, noticeId: notice.id });
      }
    }
  } else {
    warn(`plan version ${msg.plan.version} ignored: onboard already at ${next.onboard.plan.version}`);
  }
  return withLog(next, 'plan_delivered', nowMs, ALL_VIEWERS, { changeId: msg.changeId, messageId: msg.id });
}

function deliverSummary(m: MissionState, msg: CrewSummaryMessage, nowMs: number): MissionState {
  const next: MissionState = { ...m, ground: { ...m.ground, inbox: [...m.ground.inbox, { messageId: msg.id, summary: msg.summary, receivedAtMs: nowMs }] } };
  return withLog(next, 'summary_received', nowMs, ALL_VIEWERS, { messageId: msg.id, summaryId: msg.summary.id });
}

/** Stable FIFO per mission (02 §7.1): deliver the oldest undelivered message while it is in transit and due. */
function tickMission(m: MissionState, nowMs: number): MissionState {
  if (m.link.status !== 'up') return m;
  const pending = m.messages.filter((x) => x.status !== 'delivered').sort((a, b) => a.seq - b.seq);
  let next = m;
  let changed = false;
  for (const msg of pending) {
    if (msg.status !== 'in_transit' || msg.deliverAtMs === null || msg.deliverAtMs > nowMs) break;
    const delivered: LinkMessage = { ...msg, status: 'delivered', statusSinceMs: nowMs, deliveredAtMs: nowMs };
    next = { ...next, messages: next.messages.map((x) => (x.id === msg.id ? delivered : x)) };
    if (delivered.kind === 'plan_update') next = deliverPlanUpdate(next, delivered, nowMs);
    if (delivered.kind === 'crew_summary') next = deliverSummary(next, delivered, nowMs);
    changed = true;
  }
  return changed ? next : m;
}

// ---- reducer ----

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'locale/set':
      return state.locale === action.locale ? state : { ...state, locale: action.locale };
    case 'ground/role_set':
      return state.groundRole === action.role ? state : { ...state, groundRole: action.role };

    case 'monitoring/profile_selected': {
      const mission = state.missions.iss;
      if (mission.onboardUserId === action.crewId || !MONITORING_CREW_IDS.includes(action.crewId) ||
        !mission.crew.some((crew) => crew.id === action.crewId)) return state;
      return {
        ...setMission(state, { ...mission, onboardUserId: action.crewId }),
        ui: { ...state.ui, agendaRange: null, highlight: null, observationPrefill: null, openSourceId: null },
      };
    }

    case 'monitoring/stage_set':
    case 'monitoring/companion_saved':
    case 'monitoring/activity_saved':
    case 'monitoring/review_requested': {
      const mission = state.missions.iss;
      const crewId = mission.onboardUserId;
      if (!crewId || !MONITORING_CREW_IDS.includes(crewId)) return state;
      const profile = selectMonitoringProfile(state, crewId);
      let updated = profile;
      let next = mission;
      if (action.type === 'monitoring/stage_set') {
        updated = { ...profile, stage: action.stage };
      } else if (action.type === 'monitoring/companion_saved') {
        const name = action.preferences.name.trim();
        if (!name || name.length > 24) return state;
        updated = { ...profile, companion: { ...action.preferences, name } };
      } else {
        if (action.crewId !== crewId) return state;
        const activity = nextId(mission, 'activity');
        next = activity.m;
        if (action.type === 'monitoring/review_requested') {
          const sample = latestFlightSample(crewId, action.metric);
          if (!sample || action.consent !== true) return state;
          next = enqueue(next, (id, seq) => ({
            id, seq, missionId: mission.id, status: 'queued', createdAtMs: action.nowMs, statusSinceMs: action.nowMs,
            deliverAtMs: null, deliveredAtMs: null, direction: 'downlink', kind: 'medical_review', crewId, sample,
          }), action.nowMs).m;
        }
        updated = { ...profile, activities: [...profile.activities, {
          id: activity.id, atMs: action.nowMs, metric: action.metric,
          kind: action.type === 'monitoring/review_requested' ? 'medical_review' : action.kind,
          ...(action.type === 'monitoring/activity_saved' && action.note ? { note: action.note } : {}),
        }] };
      }
      return { ...setMission(state, next), monitoring: { profiles: { ...state.monitoring?.profiles, [crewId]: updated } } };
    }
    case 'wellbeing/check_in':
    case 'wellbeing/hobby':
    case 'wellbeing/decision':
    case 'wellbeing/note':
    case 'wellbeing/family_read': {
      const mission = state.missions.iss;
      const { crewId } = action;
      if (mission.onboardUserId !== crewId || !MONITORING_CREW_IDS.includes(crewId)) return state;
      const profile = selectMonitoringProfile(state, crewId);
      let wellbeing = profile.wellbeing ?? { checkIns: [], decisions: [] };
      switch (action.type) {
        case 'wellbeing/check_in': {
          const { entry } = action;
          if (![entry.stress, entry.satisfaction, entry.fatigue].every((n) =>
            n === undefined || (Number.isInteger(n) && n >= 1 && n <= 5))) return state;
          if (entry.taskId && !mission.onboard.plan.blocks.some((block) =>
            block.id === entry.taskId && block.kind === 'task' && block.crewIds.includes(crewId))) return state;
          if (!entry.taskId && (entry.satisfaction !== undefined || entry.fatigue !== undefined)) return state;
          if (!entry.feeling && entry.stress === undefined && entry.satisfaction === undefined && entry.fatigue === undefined) return state;
          wellbeing = { ...wellbeing, checkIns: [...wellbeing.checkIns, entry] };
          break;
        }
        case 'wellbeing/hobby':
          wellbeing = { ...wellbeing, hobby: action.hobby };
          break;
        case 'wellbeing/decision':
          wellbeing = { ...wellbeing, decisions: [...wellbeing.decisions, {
            atMs: action.atMs, activity: action.activity, decision: action.decision,
          }] };
          break;
        case 'wellbeing/family_read':
          wellbeing = { ...wellbeing, familyRead: true };
          break;
        case 'wellbeing/note': {
          const text = action.note.text.trim();
          if (!text || text.length > 600) return state;
          wellbeing = { ...wellbeing, notes: [...(wellbeing.notes ?? []), {
            atMs: action.atMs, text: { ...action.note, text },
          }] };
          break;
        }
      }
      return { ...state, monitoring: { profiles: { ...state.monitoring?.profiles, [crewId]: { ...profile, wellbeing } } } };
    }

    case 'plan/change_sent': {
      const m = state.missions[action.missionId];
      if (!m || !belongsTo(action.taskId, m.id)) { warn('change_sent: task does not belong to mission'); return state; }
      const result = advanceTask(m.ground.plan, action.taskId, action.advanceMinutes);
      if (!result.ok) return state;
      const r = nextId(m, 'chg');
      const change: ScheduleChange = {
        id: r.id, missionId: m.id, createdAtMs: action.nowMs, taskId: action.taskId, advanceMinutes: action.advanceMinutes,
        fromVersion: m.ground.plan.version, toVersion: result.plan.version, perCrew: result.perCrew,
      };
      const plan = { ...result.plan, changeId: change.id };
      let next: MissionState = { ...r.m, ground: { ...r.m.ground, plan, changes: [...r.m.ground.changes, change] } };
      const q = enqueue(next, (id, seq) => ({
        id, missionId: m.id, seq, status: 'queued', createdAtMs: action.nowMs, statusSinceMs: action.nowMs, deliverAtMs: null, deliveredAtMs: null,
        direction: 'uplink', kind: 'plan_update', changeId: change.id, plan,
      }), action.nowMs);
      next = withLog(q.m, 'change_sent', action.nowMs, GROUND_VIEWERS, { changeId: change.id, messageId: q.message.id });
      return setMission(state, next);
    }

    case 'link/status_set': {
      const m = state.missions[action.missionId];
      if (!m || m.link.status === action.status) return state;
      let next: MissionState;
      if (action.status === 'down') {
        next = {
          ...m,
          link: { ...m.link, status: 'down', downSinceMs: action.nowMs },
          messages: m.messages.map((x) => (x.status === 'in_transit' ? { ...x, status: 'queued', statusSinceMs: action.nowMs, deliverAtMs: null } : x)),
        };
        next = withLog(next, 'link_down', action.nowMs, ALL_VIEWERS, {});
      } else {
        const queued = m.messages.filter((x) => x.status === 'queued').sort((a, b) => a.seq - b.seq);
        const due = new Map<string, number>();
        queued.forEach((x, i) => due.set(x.id, action.nowMs + m.link.transitMs + i * DRAIN_STAGGER_MS));
        next = {
          ...m,
          link: { ...m.link, status: 'up', downSinceMs: null },
          messages: m.messages.map((x) => (due.has(x.id) ? { ...x, status: 'in_transit', statusSinceMs: action.nowMs, deliverAtMs: due.get(x.id)! } : x)),
        };
        next = withLog(next, 'link_up', action.nowMs, ALL_VIEWERS, {});
      }
      return setMission(state, next);
    }

    case 'clock/tick': {
      let next = state;
      for (const id of MISSION_IDS) {
        const m = next.missions[id];
        const t = tickMission(m, action.nowMs);
        if (t !== m) next = setMission(next, t);
      }
      return next;
    }

    case 'notice/seen': {
      const m = state.missions[action.missionId];
      if (!m || !m.onboard.notices.some((n) => n.id === action.noticeId && n.crewId === m.onboardUserId && !n.seen)) return state;
      return setMission(state, { ...m, onboard: { ...m.onboard, notices: m.onboard.notices.map((n) => (n.id === action.noticeId ? { ...n, seen: true } : n)) } });
    }

    case 'companion/asked': {
      const m = state.missions[action.missionId];
      if (!m || m.onboardUserId === null) return state;
      const u = nextId(m, 'turn');
      const userTurn: CompanionTurn = { id: u.id, atMs: action.nowMs, speaker: 'user', input: action.input, crewId: m.onboardUserId };
      const c = nextId(u.m, 'turn');
      const reply = respond(state, m.id, action.input.intent, action.input.metric);
      const companionTurn: CompanionTurn = { id: c.id, atMs: action.nowMs, speaker: 'companion', reply, crewId: m.onboardUserId };
      return setMission(state, { ...c.m, onboard: { ...c.m.onboard, conversation: [...c.m.onboard.conversation, userTurn, companionTurn] } });
    }

    case 'companion/actions_executed': {
      const m = state.missions[action.missionId];
      const turn = m?.onboard.conversation.find((t) => t.id === action.turnId);
      if (!m || !turn?.reply || (turn.crewId ?? MONITORING_CREW_IDS[0]) !== m.onboardUserId || turn.reply.executed) return state;
      return setMission(state, {
        ...m,
        onboard: { ...m.onboard, conversation: m.onboard.conversation.map((t) => (t.id === action.turnId && t.reply ? { ...t, reply: { ...t.reply, executed: true } } : t)) },
      });
    }

    case 'observation/saved': {
      const m = state.missions[action.missionId];
      if (!m || m.onboardUserId !== action.crewId || !m.crew.some((c) => c.id === action.crewId) || action.topics.length === 0) return state;
      if (action.relatedChangeId && !belongsTo(action.relatedChangeId, m.id)) { warn('observation: related change of another mission'); return state; }
      const o = nextId(m, 'obs');
      const observation: Observation = {
        id: o.id, missionId: m.id, crewId: action.crewId, createdAtMs: action.nowMs,
        topics: [...action.topics], privateNote: action.privateNote, relatedChangeId: action.relatedChangeId, sharedSummaryId: null,
      };
      let next = o.m;
      let saved = observation;
      if (action.share) {
        const s = nextId(next, 'sum');
        const summary: SharedSummary = {
          id: s.id, missionId: m.id, crewId: action.crewId, createdAtMs: action.nowMs,
          topics: [...action.topics], relatedChangeId: action.relatedChangeId, comment: action.share.comment, audience: 'medical_professional',
        };
        saved = { ...observation, sharedSummaryId: summary.id };
        const q = enqueue(s.m, (id, seq) => ({
          id, missionId: m.id, seq, status: 'queued', createdAtMs: action.nowMs, statusSinceMs: action.nowMs, deliverAtMs: null, deliveredAtMs: null,
          direction: 'downlink', kind: 'crew_summary', summary,
        }), action.nowMs);
        next = { ...q.m, onboard: { ...q.m.onboard, observations: [...q.m.onboard.observations, saved] } };
        next = withLog(next, 'observation_saved', action.nowMs, ASTRONAUT, { observationId: saved.id });
        next = withLog(next, 'summary_queued', action.nowMs, ASTRONAUT, { summaryId: summary.id, messageId: q.message.id });
      } else {
        next = { ...next, onboard: { ...next.onboard, observations: [...next.onboard.observations, saved] } };
        next = withLog(next, 'observation_saved', action.nowMs, ASTRONAUT, { observationId: saved.id });
      }
      return setMission(state, next);
    }

    case 'ui/range_set':
      return { ...state, ui: { ...state.ui, agendaRange: action.range } };
    case 'ui/highlight_set':
      return { ...state, ui: { ...state.ui, highlight: action.target } };
    case 'ui/companion_toggle':
      return { ...state, ui: { ...state.ui, companionOpen: action.open ?? !state.ui.companionOpen } };
    case 'ui/source_open':
      return { ...state, ui: { ...state.ui, openSourceId: action.sourceId } };
    case 'ui/observation_prefill':
      return { ...state, ui: { ...state.ui, observationPrefill: action.prefill } };
    case 'ui/last_route': {
      const r = action.route;
      if (r.view === 'onboard') return { ...state, ui: { ...state.ui, lastRoute: { ...state.ui.lastRoute, onboard: r } } };
      if (r.view === 'ground') return { ...state, ui: { ...state.ui, lastRoute: { ...state.ui.lastRoute, ground: r } } };
      return state;
    }
    case 'companion/customized': {
      const name = action.name.trim();
      if (name.length < 1 || name.length > 24) return state;
      return { ...state, companion: { name, color: action.color } };
    }
    case 'scenario/reset':
      return createInitialState(action.nowMs, state.locale);
    default:
      return state;
  }
}

export function missionOf(state: AppState, id: MissionId): MissionState {
  return state.missions[id];
}
