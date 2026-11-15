// Event engine ("coordinator"): docs/specs/02-architecture-contracts.md §6–§7
// Redux Toolkit slice with multi-arg thunks (no payload wrapping).
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  AdvanceMinutes, AppState, CompanionColor, CompanionInput, CompanionTurn, CrewSummaryMessage, HighlightTarget,
  Interval, LinkMessage, Locale, LogEntry, LogKind, MissionId, MissionState, Notice, Observation, ObservationPrefill,
  ObservationTopic, PlanUpdateMessage, Route, ScheduleChange, SharedSummary, UserText, Viewer,
} from './types';
import { MISSION_IDS } from './types';
import { createInitialState, createEmptyState } from './initialState';
import { advanceTask, diffForCrew } from '../domain/agenda';
import { belongsTo, makeId } from '../domain/ids';
import { respond } from '../domain/companion/respond';

const ALL_VIEWERS: Viewer[] = ['astronaut', 'mission_operator', 'medical_professional'];
const GROUND_VIEWERS: Viewer[] = ['mission_operator', 'medical_professional'];
const ASTRONAUT: Viewer[] = ['astronaut'];

/** Stagger between consecutive deliveries when a queue drains (02 §7.1, L2 allows later delivery). */
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
      const change = next.ground.changes.find((c) => c.id === msg.changeId);
      const task = change ? msg.plan.blocks.find((b) => b.id === change.taskId) : undefined;
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
    next = delivered.kind === 'plan_update' ? deliverPlanUpdate(next, delivered, nowMs) : deliverSummary(next, delivered, nowMs);
    changed = true;
  }
  return changed ? next : m;
}

// ---- slice with multi-arg thunks ----

export const mateSlice = createSlice({
  name: 'mate',
  // The slice's initial state is an empty AppState (the store starts from it;
  // no sessionStorage). AppProvider dispatches scenarioReset() once the
  // backend scenario data arrives, seeding the store from the API.
  initialState: createEmptyState(Date.now()),
  reducers: {
    localeSet: (state, action: PayloadAction<Locale>) => {
      if (state.locale !== action.payload) state.locale = action.payload;
    },
    groundRoleSet: (state, action: PayloadAction<AppState['groundRole']>) => {
      if (state.groundRole !== action.payload) state.groundRole = action.payload;
    },
    planChangeSent: (state, action: PayloadAction<{ missionId: MissionId; taskId: string; advanceMinutes: AdvanceMinutes; nowMs: number }>) => {
      const { missionId, taskId, advanceMinutes, nowMs } = action.payload;
      const m = state.missions[missionId];
      if (!m || !belongsTo(taskId, m.id)) { warn('change_sent: task does not belong to mission'); return; }
      const result = advanceTask(m.ground.plan, taskId, advanceMinutes);
      if (!result.ok) return;
      const r = nextId(m, 'chg');
      const change: ScheduleChange = {
        id: r.id, missionId: m.id, createdAtMs: nowMs, taskId, advanceMinutes,
        fromVersion: m.ground.plan.version, toVersion: result.plan.version, perCrew: result.perCrew,
      };
      const plan = { ...result.plan, changeId: change.id };
      m.seq = r.m.seq;
      m.ground = { plan, changes: [...m.ground.changes, change], inbox: m.ground.inbox };
      const q = enqueue(m, (id, seq) => ({
        id, missionId: m.id, seq, status: 'queued' as const, createdAtMs: nowMs, statusSinceMs: nowMs, deliverAtMs: null, deliveredAtMs: null,
        direction: 'uplink' as const, kind: 'plan_update' as const, changeId: change.id, plan,
      }), nowMs);
      m.seq = q.m.seq;
      m.messages = q.m.messages;
      const logged = withLog(m, 'change_sent', nowMs, GROUND_VIEWERS, { changeId: change.id, messageId: q.message.id });
      m.log = logged.log; m.seq = logged.seq;
    },
    linkStatusSet: (state, action: PayloadAction<{ missionId: MissionId; status: 'up' | 'down'; nowMs: number }>) => {
      const { missionId, status, nowMs } = action.payload;
      const m = state.missions[missionId];
      if (!m || m.link.status === status) return;
      if (status === 'down') {
        m.link = { ...m.link, status: 'down', downSinceMs: nowMs };
        m.messages = m.messages.map((x) => (x.status === 'in_transit' ? { ...x, status: 'queued' as const, statusSinceMs: nowMs, deliverAtMs: null } : x));
        const logged = withLog(m, 'link_down', nowMs, ALL_VIEWERS, {});
        m.log = logged.log; m.seq = logged.seq;
      } else {
        const queued = m.messages.filter((x) => x.status === 'queued').sort((a, b) => a.seq - b.seq);
        const due = new Map<string, number>();
        queued.forEach((x, i) => due.set(x.id, nowMs + m.link.transitMs + i * DRAIN_STAGGER_MS));
        m.link = { ...m.link, status: 'up', downSinceMs: null };
        m.messages = m.messages.map((x) => (due.has(x.id) ? { ...x, status: 'in_transit' as const, statusSinceMs: nowMs, deliverAtMs: due.get(x.id)! } : x));
        const logged = withLog(m, 'link_up', nowMs, ALL_VIEWERS, {});
        m.log = logged.log; m.seq = logged.seq;
      }
    },
    clockTick: (state, action: PayloadAction<number>) => {
      for (const id of MISSION_IDS) {
        state.missions[id] = tickMission(state.missions[id], action.payload);
      }
    },
    noticeSeen: (state, action: PayloadAction<{ missionId: MissionId; noticeId: string }>) => {
      const { missionId, noticeId } = action.payload;
      const m = state.missions[missionId];
      if (!m || !m.onboard.notices.some((n) => n.id === noticeId && !n.seen)) return;
      m.onboard.notices = m.onboard.notices.map((n) => (n.id === noticeId ? { ...n, seen: true } : n));
    },
    companionAsked: (state, action: PayloadAction<{ missionId: MissionId; input: CompanionInput; nowMs: number }>) => {
      const { missionId, input, nowMs } = action.payload;
      const m = state.missions[missionId];
      if (!m || m.onboardUserId === null) return;
      const u = nextId(m, 'turn');
      const userTurn: CompanionTurn = { id: u.id, atMs: nowMs, speaker: 'user', input };
      const c = nextId(u.m, 'turn');
      const reply = respond(state, m.id, input.intent);
      const companionTurn: CompanionTurn = { id: c.id, atMs: nowMs, speaker: 'companion', reply };
      state.missions[missionId] = c.m;
      c.m.onboard.conversation.push(userTurn, companionTurn);
    },
    companionActionsExecuted: (state, action: PayloadAction<{ missionId: MissionId; turnId: string }>) => {
      const { missionId, turnId } = action.payload;
      const m = state.missions[missionId];
      const turn = m?.onboard.conversation.find((t) => t.id === turnId);
      if (!m || !turn?.reply || turn.reply.executed) return;
      turn.reply = { ...turn.reply, executed: true };
    },
    observationSaved: (state, action: PayloadAction<{
      missionId: MissionId; crewId: string; topics: ObservationTopic[];
      privateNote: UserText | null; relatedChangeId: string | null;
      share: { comment: UserText | null } | null; nowMs: number;
    }>) => {
      const p = action.payload;
      const m = state.missions[p.missionId];
      if (!m || !m.crew.some((c) => c.id === p.crewId) || p.topics.length === 0) return;
      if (p.relatedChangeId && !belongsTo(p.relatedChangeId, m.id)) { warn('observation: related change of another mission'); return; }
      const o = nextId(m, 'obs');
      const observation: Observation = {
        id: o.id, missionId: m.id, crewId: p.crewId, createdAtMs: p.nowMs,
        topics: [...p.topics], privateNote: p.privateNote, relatedChangeId: p.relatedChangeId, sharedSummaryId: null,
      };
      let saved = observation;
      if (p.share) {
        const s = nextId(o.m, 'sum');
        const summary: SharedSummary = {
          id: s.id, missionId: m.id, crewId: p.crewId, createdAtMs: p.nowMs,
          topics: [...p.topics], relatedChangeId: p.relatedChangeId, comment: p.share.comment, audience: 'medical_professional',
        };
        saved = { ...observation, sharedSummaryId: summary.id };
        const q = enqueue(s.m, (id, seq) => ({
          id, missionId: m.id, seq, status: 'queued' as const, createdAtMs: p.nowMs, statusSinceMs: p.nowMs, deliverAtMs: null, deliveredAtMs: null,
          direction: 'downlink' as const, kind: 'crew_summary' as const, summary,
        }), p.nowMs);
        m.seq = q.m.seq;
        m.messages = q.m.messages;
        m.onboard.observations = [...m.onboard.observations, saved];
        let logged = withLog(m, 'observation_saved', p.nowMs, ASTRONAUT, { observationId: saved.id });
        logged = withLog(logged, 'summary_queued', p.nowMs, ASTRONAUT, { summaryId: summary.id, messageId: q.message.id });
        m.log = logged.log; m.seq = logged.seq;
      } else {
        m.seq = o.m.seq;
        m.onboard.observations = [...m.onboard.observations, saved];
        const logged = withLog(m, 'observation_saved', p.nowMs, ASTRONAUT, { observationId: saved.id });
        m.log = logged.log; m.seq = logged.seq;
      }
    },
    uiRangeSet: (state, action: PayloadAction<Interval | null>) => { state.ui.agendaRange = action.payload; },
    uiHighlightSet: (state, action: PayloadAction<HighlightTarget | null>) => { state.ui.highlight = action.payload; },
    uiCompanionToggle: (state, action: PayloadAction<boolean | undefined>) => { state.ui.companionOpen = action.payload ?? !state.ui.companionOpen; },
    uiSourceOpen: (state, action: PayloadAction<string | null>) => { state.ui.openSourceId = action.payload; },
    uiObservationPrefill: (state, action: PayloadAction<ObservationPrefill | null>) => { state.ui.observationPrefill = action.payload; },
    uiLastRoute: (state, action: PayloadAction<Route>) => {
      const r = action.payload;
      if (r.view === 'onboard') state.ui.lastRoute = { ...state.ui.lastRoute, onboard: r };
      else if (r.view === 'ground') state.ui.lastRoute = { ...state.ui.lastRoute, ground: r };
    },
    companionCustomized: (state, action: PayloadAction<{ name: string; color: CompanionColor }>) => {
      const name = action.payload.name.trim();
      if (name.length < 1 || name.length > 24) return;
      state.companion = { name, color: action.payload.color };
    },
    scenarioReset: (state, action: PayloadAction<number>) => {
      const next = createInitialState(action.payload, undefined, state.locale);
      // Keep the user's last known routes so restart lands back where they were (02 §3.3).
      next.ui.lastRoute = state.ui.lastRoute;
      return next;
    },
  },
});

// Multi-arg thunks: call sites read like `dispatch(planChangeSent('iss', taskId, 30, Date.now()))`.
type Thunk = (dispatch: (a: unknown) => void) => void;
export const localeSet = (locale: Locale): Thunk => (dispatch) => { dispatch(mateSlice.actions.localeSet(locale)); };
export const groundRoleSet = (role: AppState['groundRole']): Thunk => (dispatch) => { dispatch(mateSlice.actions.groundRoleSet(role)); };
export const planChangeSent = (missionId: MissionId, taskId: string, advanceMinutes: AdvanceMinutes, nowMs: number): Thunk =>
  (dispatch) => { dispatch(mateSlice.actions.planChangeSent({ missionId, taskId, advanceMinutes, nowMs })); };
export const linkStatusSet = (missionId: MissionId, status: 'up' | 'down', nowMs: number): Thunk =>
  (dispatch) => { dispatch(mateSlice.actions.linkStatusSet({ missionId, status, nowMs })); };
export const clockTick = (nowMs: number): Thunk => (dispatch) => { dispatch(mateSlice.actions.clockTick(nowMs)); };
export const noticeSeen = (missionId: MissionId, noticeId: string): Thunk =>
  (dispatch) => { dispatch(mateSlice.actions.noticeSeen({ missionId, noticeId })); };
export const companionAsked = (missionId: MissionId, input: CompanionInput, nowMs: number): Thunk =>
  (dispatch) => { dispatch(mateSlice.actions.companionAsked({ missionId, input, nowMs })); };
export const companionActionsExecuted = (missionId: MissionId, turnId: string): Thunk =>
  (dispatch) => { dispatch(mateSlice.actions.companionActionsExecuted({ missionId, turnId })); };
export const observationSaved = (p: { missionId: MissionId; crewId: string; topics: ObservationTopic[]; privateNote: UserText | null; relatedChangeId: string | null; share: { comment: UserText | null } | null; nowMs: number }): Thunk =>
  (dispatch) => { dispatch(mateSlice.actions.observationSaved(p)); };
export const uiRangeSet = (range: Interval | null): Thunk => (dispatch) => { dispatch(mateSlice.actions.uiRangeSet(range)); };
export const uiHighlightSet = (target: HighlightTarget | null): Thunk => (dispatch) => { dispatch(mateSlice.actions.uiHighlightSet(target)); };
export const uiCompanionToggle = (open?: boolean): Thunk => (dispatch) => { dispatch(mateSlice.actions.uiCompanionToggle(open)); };
export const uiSourceOpen = (sourceId: string | null): Thunk => (dispatch) => { dispatch(mateSlice.actions.uiSourceOpen(sourceId)); };
export const uiObservationPrefill = (prefill: ObservationPrefill | null): Thunk => (dispatch) => { dispatch(mateSlice.actions.uiObservationPrefill(prefill)); };
export const uiLastRoute = (route: Route): Thunk => (dispatch) => { dispatch(mateSlice.actions.uiLastRoute(route)); };
export const companionCustomized = (name: string, color: CompanionColor): Thunk =>
  (dispatch) => { dispatch(mateSlice.actions.companionCustomized({ name, color })); };
export const scenarioReset = (nowMs: number): Thunk => (dispatch) => { dispatch(mateSlice.actions.scenarioReset(nowMs)); };

export default mateSlice.reducer;
