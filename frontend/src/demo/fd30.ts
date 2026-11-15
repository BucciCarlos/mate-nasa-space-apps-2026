import { chatIntent, scriptedAnswer } from './fd30Chat';
import type { ChatAnswer } from './fd30Chat';
import { LAB_EVENTS, LAB_HISTORY, initialLab, ingestLab, labEvents, labSamples } from './laboratory';
import type { LabSample } from './laboratory';

// Isolated FD30 fixture (IMP02 + IMP03 + IMP04). The published M1 clock, plan, storage and medical queue are untouched.
// Reuse the IMP02 key to migrate its journey in place; the snapshot carries its schema version.
export const FD30_KEY = 'mate:fd30:imp02:v1';
export const OWNER = 'iss:crew-lf';
export const CREW = [
  { id: OWNER, name: 'Lucía Ferraro', character: 'Sprout', shape: 'sprout' },
  { id: 'iss:crew-ti', name: 'Tomás Ibarra', character: 'Beacon', shape: 'beacon' },
  { id: 'iss:crew-mo', name: 'Mei Okada', character: 'Sail', shape: 'sail' },
] as const;
export type CrewId = typeof CREW[number]['id'];
export interface Position { x: number; y: number }
export interface ProfileState { announcedIds: string[]; guidedOpenedIds: string[]; seen: boolean; draft: string; turns: Turn[]; position: Position | null; exerciseSeenIds: string[]; highlightedSessionId: string | null; labSeenIds: string[]; highlightedSampleId: string | null }
export function historyFor(crewId: CrewId) {
  return { ...HISTORY, crewId, id: `iss:history:${crewId.slice(-2)}:rest-fd29` };
}
export { DAY_START, DAY_END, ENTRY, START, END, clampMissionTime } from './fd30Day';
import { ENTRY, START, END, clampMissionTime } from './fd30Day';
export const WAKE = Date.parse('2027-03-10T06:00:00Z');
export const WAKE_EVENT = {
  id: 'iss:fd30:lf:wake-1', missionId: 'iss', scenarioSequence: 1,
  kind: 'sleep.episode_ended', sourceId: 'demo-body', origin: 'simulated',
  occurredAt: '2027-03-10T06:00:00Z', receivedAt: '2027-03-10T06:00:00Z',
  association: { status: 'confirmed', crewId: OWNER }, episodeId: 'iss:episode-lf-1',
  measurement: null,
} as const;
export const REST = {
  start: '2027-03-09T21:30:00Z', end: '2027-03-10T06:00:00Z',
  id: 'iss:fd30:lf:planned-rest', sourceId: 'demo-plan',
} as const;
export const HISTORY = {
  id: 'iss:history:lf:rest-fd29', crewId: OWNER, sourceId: 'demo-history',
  version: 'fd30-imp02.1', day: 29, date: '2027-03-09', measurement: null,
} as const;
export const EXERCISE_VERSION = 'fd30-imp03.1';
export const EXERCISE_SESSION = 'iss:session-lf-1';
export interface ExerciseEvent {
  id: string; missionId: string; scenarioSequence: number;
  kind: 'exercise.started' | 'exercise.finished'; sourceId: string; origin: 'simulated';
  occurredAt: string; receivedAt: string;
  association: { status: 'confirmed' | 'unconfirmed'; crewId?: string };
  sessionId: string; measurement: null;
}
const exerciseEvent = (kind: ExerciseEvent['kind'], day: string, sessionId: string, sequence: number, sourceId: string): ExerciseEvent => ({
  id: `${sessionId}:${kind}`, missionId: 'iss', scenarioSequence: sequence, kind, sourceId, origin: 'simulated',
  occurredAt: `${day}T${kind === 'exercise.started' ? '10:30' : '11:30'}:00Z`,
  receivedAt: `${day}T${kind === 'exercise.started' ? '10:30' : '11:30'}:00Z`,
  association: { status: 'confirmed', crewId: OWNER }, sessionId, measurement: null,
});
export const EXERCISE_EVENTS = [
  exerciseEvent('exercise.started', '2027-03-10', EXERCISE_SESSION, 6, 'demo-exercise'),
  exerciseEvent('exercise.finished', '2027-03-10', EXERCISE_SESSION, 7, 'demo-exercise'),
];
export const EXERCISE_HISTORY = [
  exerciseEvent('exercise.started', '2027-03-09', 'iss:history:lf:exercise-fd29', 1, 'demo-history'),
  exerciseEvent('exercise.finished', '2027-03-09', 'iss:history:lf:exercise-fd29', 2, 'demo-history'),
];
const PRELOADED_IDS = [LAB_HISTORY.id, HISTORY.id, ...EXERCISE_HISTORY.map(e => e.id)];
export interface ExerciseSession {
  id: string; crewId: CrewId; start: ExerciseEvent | null; finish: ExerciseEvent | null;
}
export function exerciseSessions(state: PreviewState, crewId: CrewId): ExerciseSession[] {
  return state.exercise.filter(s => s.crewId === crewId);
}
export function elapsedMinutes(session: ExerciseSession): number | null {
  if (!session.start || !session.finish) return null;
  const duration = Date.parse(session.finish.occurredAt) - Date.parse(session.start.occurredAt);
  return duration >= 0 ? duration / 60_000 : null;
}
export const DAY_EVENTS = [WAKE_EVENT, ...EXERCISE_EVENTS, ...LAB_EVENTS]
  .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.scenarioSequence - b.scenarioSequence);
export function nextPreviewEvent(state: PreviewState) {
  return DAY_EVENTS.find(e => !state.processedIds.includes(e.id));
}
export function receivedPersonalEvents(state: PreviewState, crewId: CrewId) {
  const receivedIds = [
    ...exerciseSessions(state, crewId).flatMap(s => [s.start?.id, s.finish?.id]),
    ...labSamples(state, crewId).flatMap(s => labEvents(s).map(e => e.id)),
    ...(crewId === OWNER && state.wakeReceived ? [WAKE_EVENT.id] : []),
  ];
  return DAY_EVENTS.filter(e => receivedIds.includes(e.id));
}
export function latestPersonalEvent(state: PreviewState, crewId: CrewId) {
  return receivedPersonalEvents(state, crewId).at(-1) ?? null;
}
export function latestNews(state: PreviewState, crewId: CrewId) {
  const profile = state.profiles[crewId];
  return receivedPersonalEvents(state, crewId).filter(e => 'sampleId' in e ? !profile.labSeenIds.includes(e.id)
    : 'sessionId' in e ? !profile.exerciseSeenIds.includes(e.id) : !profile.seen).at(-1) ?? null;
}
/** Local confirmed equipment only. Keep diagnostics content-free; never infer an owner or a missing start. */
export function ingestExercise(state: PreviewState, events: readonly ExerciseEvent[], missionTime: number): PreviewState {
  let result = state;
  const ordered = [...events].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.scenarioSequence - b.scenarioSequence);
  for (const event of ordered) {
    if (result.processedIds.includes(event.id) || Date.parse(event.receivedAt) > missionTime || Date.parse(event.occurredAt) > missionTime) continue;
    const crewId = event.association.crewId;
    const reject = !event.id.startsWith('iss:') || event.missionId !== 'iss' || !event.sessionId.startsWith('iss:')
      || event.sourceId !== 'demo-exercise' || event.origin !== 'simulated' || event.measurement !== null
      || !Number.isFinite(Date.parse(event.occurredAt)) || !Number.isFinite(Date.parse(event.receivedAt))
      || Date.parse(event.receivedAt) < Date.parse(event.occurredAt)
      || !['exercise.started', 'exercise.finished'].includes(event.kind);
    const unassigned = event.association.status !== 'confirmed' || !CREW.some(c => c.id === crewId);
    const existing = result.exercise.find(s => s.id === event.sessionId);
    const backwards = existing && (existing.crewId !== crewId || (event.kind === 'exercise.started'
      ? existing.start || existing.finish : existing.finish || (existing.start && Date.parse(event.occurredAt) < Date.parse(existing.start.occurredAt))));
    result = { ...result, processedIds: [...result.processedIds, event.id] };
    if (reject || unassigned || backwards) {
      result = { ...result, diagnostics: [...result.diagnostics, { eventId: event.id, sourceId: event.sourceId, status: unassigned ? 'unassigned' : 'rejected' }] };
      continue;
    }
    const session: ExerciseSession = { ...(existing ?? { id: event.sessionId, crewId: crewId as CrewId, start: null, finish: null }),
      [event.kind === 'exercise.started' ? 'start' : 'finish']: event };
    result = { ...result, exercise: [...result.exercise.filter(s => s.id !== session.id), session] };
  }
  return result;
}
export function previewReply(state: PreviewState, owner: CrewId, text: string): Turn['reply'] {
  const intent = chatIntent(text);
  if (intent) return intent;
  if (/summary|resumen/i.test(text)) {
    const event = latestPersonalEvent(state, owner);
    return event && 'sampleId' in event ? 'laboratory' : event && 'sessionId' in event ? 'exercise' : 'sleep';
  }
  return 'fallback';
}
export interface Turn { text: string; lang: 'en' | 'es'; reply: 'sleep' | 'exercise' | 'laboratory' | 'agenda' | 'fallback'; answer?: ChatAnswer; input?: 'text' | 'simulated_voice' }
export interface PreviewState {
  version: 6; playback: 'explore' | 'guided'; running: boolean;
  guidedRequest: { owner: CrewId; eventId: string } | null;
  processedIds: string[]; exercise: ExerciseSession[]; laboratory: LabSample[];
  diagnostics: { eventId: string; sourceId: string; status: 'rejected' | 'unassigned' }[]; sessionStartMs: number; offsetMs: number; wakeReceived: boolean;
  activeCrewId: CrewId; profiles: Record<CrewId, ProfileState>;
}
export type PreviewAction = { type: 'tick' | 'next'; now: number }
  | { type: 'seek'; now: number; target: number }
  | { type: 'playback/set'; mode: 'explore' | 'guided' }
  | { type: 'running/set'; running: boolean; now: number }
  | { type: 'events/announce'; owner: CrewId; ids: string[] }
  | { type: 'guided/consume'; owner: CrewId; eventId: string }
  | { type: 'select'; crewId: CrewId }
  | { type: 'laboratory/view'; owner: CrewId; sampleId: string; eventId: string }
  | { type: 'exercise/view'; owner: CrewId; sessionId: string; eventId: string }
  | { type: 'seen'; owner: CrewId } | { type: 'draft'; owner: CrewId; text: string }
  | { type: 'position'; owner: CrewId; position: Position | null }
  | { type: 'ask'; owner: CrewId; text: string; lang: 'en' | 'es'; now?: number; input?: 'text' | 'simulated_voice' } | { type: 'reset'; now: number };
export function freshPreview(now: number): PreviewState {
  const profile = (): ProfileState => ({ announcedIds: [], guidedOpenedIds: [], seen: false, draft: '', turns: [], position: null, exerciseSeenIds: [], highlightedSessionId: null, labSeenIds: [], highlightedSampleId: null });
  return { version: 6, playback: 'explore', running: true, guidedRequest: null, laboratory: initialLab(), processedIds: [...PRELOADED_IDS], diagnostics: [],
    exercise: [{ id: EXERCISE_HISTORY[0].sessionId, crewId: OWNER, start: EXERCISE_HISTORY[0], finish: EXERCISE_HISTORY[1] }], sessionStartMs: now, offsetMs: 0, wakeReceived: false, activeCrewId: OWNER,
    profiles: { [OWNER]: profile(), 'iss:crew-ti': profile(), 'iss:crew-mo': profile() } };
}
export function previewTime(state: PreviewState, now: number) {
  return clampMissionTime(START + (state.running ? Math.max(0, now - state.sessionStartMs) : 0) + state.offsetMs);
}
function ingestDue(state: PreviewState, time: number): PreviewState {
  let result = state;
  for (const event of DAY_EVENTS) {
    if (result.processedIds.includes(event.id) || Date.parse(event.receivedAt) > time || Date.parse(event.occurredAt) > time) continue;
    if ('sampleId' in event) result = ingestLab(result, [event], time);
    else if ('sessionId' in event) result = ingestExercise(result, [event], time);
    else result = { ...result, wakeReceived: true, processedIds: [...result.processedIds, event.id] };
  }
  return result;
}
export function projectDomain(target: number) {
  const projected = ingestDue(freshPreview(0), clampMissionTime(target));
  const { processedIds, exercise, laboratory, wakeReceived, diagnostics } = projected;
  return { processedIds, exercise, laboratory, wakeReceived, diagnostics };
}
export function previewReduce(state: PreviewState, action: PreviewAction): PreviewState {
  // Late pointer/chat actions must never be retargeted after View as.
  if ('owner' in action && action.owner !== state.activeCrewId) return state;
  const owner = state.activeCrewId;
  const profile = state.profiles[owner];
  const update = (patch: Partial<ProfileState>): PreviewState => ({ ...state, profiles: { ...state.profiles, [owner]: { ...profile, ...patch } } });
  switch (action.type) {
    case 'select': return CREW.some(c => c.id === action.crewId) ? { ...state, activeCrewId: action.crewId, guidedRequest: null } : state;
    case 'reset': return freshPreview(action.now);
    case 'seek': {
      if (!Number.isFinite(action.target) || !Number.isFinite(action.now)) return state;
      const target = clampMissionTime(action.target);
      return { ...state, ...projectDomain(target), sessionStartMs: action.now, offsetMs: target - START, running: target < END && state.running, guidedRequest: null };
    }
    case 'playback/set': return ['explore', 'guided'].includes(action.mode)
      ? { ...state, playback: action.mode, guidedRequest: null } : state;
    case 'running/set': {
      if (action.running === state.running || !Number.isFinite(action.now)) return state;
      return { ...state, offsetMs: previewTime(state, action.now) - START, sessionStartMs: action.now, running: action.running && previewTime(state, action.now) < END };
    }
    case 'events/announce': {
      const received = receivedPersonalEvents(state, owner).map(e => e.id);
      const ids = [...new Set([...profile.announcedIds, ...action.ids.filter(id => received.includes(id))])];
      return ids.length === profile.announcedIds.length ? state : update({ announcedIds: ids });
    }
    case 'guided/consume': return state.guidedRequest?.eventId === action.eventId && state.guidedRequest.owner === owner
      ? { ...state, guidedRequest: null } : state;
    case 'tick':
    case 'next': {
      const next = nextPreviewEvent(state);
      const current = previewTime(state, action.now);
      const time = action.type === 'next' && next ? Math.max(current, Date.parse(next.receivedAt)) : current;
      let result = action.type === 'next' && next && time > current
        ? { ...state, sessionStartMs: action.now, offsetMs: time - START } : state;
      result = ingestDue(result, time);
      const start = EXERCISE_EVENTS[0];
      if (state.playback === 'guided' && owner === OWNER && !state.processedIds.includes(start.id)
        && result.processedIds.includes(start.id) && !profile.guidedOpenedIds.includes(start.id)) {
        result = { ...result, guidedRequest: { owner, eventId: start.id },
          profiles: { ...result.profiles, [owner]: { ...result.profiles[owner], guidedOpenedIds: [...profile.guidedOpenedIds, start.id] } } };
      }
      if (time >= END && result.running) result = { ...result, running: false, sessionStartMs: action.now, offsetMs: END - ENTRY };
      return result;
    }
    case 'laboratory/view': {
      const sample = labSamples(state, owner).find(s => s.id === action.sampleId);
      if (!sample || !labEvents(sample).some(e => e.id === action.eventId)) return state;
      if (profile.highlightedSampleId === sample.id && profile.labSeenIds.includes(action.eventId)) return state;
      return update({ highlightedSampleId: sample.id, labSeenIds: [...new Set([...profile.labSeenIds, action.eventId])] });
    }
    case 'exercise/view': {
      const session = exerciseSessions(state, owner).find(s => s.id === action.sessionId);
      if (!session || ![session.start?.id, session.finish?.id].includes(action.eventId)) return state;
      if (profile.highlightedSessionId === session.id && profile.exerciseSeenIds.includes(action.eventId)) return state;
      return update({ highlightedSessionId: session.id, exerciseSeenIds: [...new Set([...profile.exerciseSeenIds, action.eventId])] });
    }
    case 'seen': return owner === OWNER && state.wakeReceived && !profile.seen ? update({ seen: true }) : state;
    case 'position': return validPosition(action.position) ? update({ position: action.position }) : state;
    case 'draft': return update({ draft: action.text });
    case 'ask': {
      const text = action.text.trim();
      if (!text) return state;
      const time = previewTime(state, action.now ?? state.sessionStartMs);
      const projected = { ...state, ...projectDomain(time) };
      const reply = previewReply(projected, owner, text);
      const answer = action.now === undefined ? {} : { answer: scriptedAnswer(projected, owner, time, reply, action.lang), input: action.input ?? 'text' as const };
      return update({ draft: action.input === 'simulated_voice' ? profile.draft : '', turns: [...profile.turns, { text, lang: action.lang, reply, ...answer }] });
    }
  }
}
function validPosition(p: unknown): p is Position | null {
  if (p === null) return true;
  if (typeof p !== 'object' || !p) return false;
  const { x, y } = p as Position;
  return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1;
}
/** The preview is in-memory only (no sessionStorage): always start fresh. Redux + backend remain the app's state sources. */
export function restorePreview(_raw: string | null, now: number): PreviewState {
  return freshPreview(now);
}
