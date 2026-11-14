import { LAB_EVENTS, LAB_HISTORY, initialLab, ingestLab, labEvents, labSamples, validLab } from './laboratory';
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
export interface ProfileState { seen: boolean; draft: string; turns: Turn[]; position: Position | null; exerciseSeenIds: string[]; highlightedSessionId: string | null; labSeenIds: string[]; highlightedSampleId: string | null }
export function historyFor(crewId: CrewId) {
  return { ...HISTORY, crewId, id: `iss:history:${crewId.slice(-2)}:rest-fd29` };
}
export const START = Date.parse('2027-03-10T05:55:00Z');
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
function receivedPersonalEvents(state: PreviewState, crewId: CrewId) {
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
  if (/laboratory|lab\b|blood|urine|sample|result|laboratorio|sangre|orina|muestra|resultado/i.test(text)) return 'laboratory';
  if (/exercise|training|ejercicio|entrenamiento/i.test(text)) return 'exercise';
  if (/sleep|rest|sueño|dormi|descanso/i.test(text)) return 'sleep';
  if (/summary|resumen/i.test(text)) {
    const event = latestPersonalEvent(state, owner);
    return event && 'sampleId' in event ? 'laboratory' : event && 'sessionId' in event ? 'exercise' : 'sleep';
  }
  return 'fallback';
}
export interface Turn { text: string; lang: 'en' | 'es'; reply: 'sleep' | 'exercise' | 'laboratory' | 'fallback' }
export interface PreviewState {
  version: 4; processedIds: string[]; exercise: ExerciseSession[]; laboratory: LabSample[];
  diagnostics: { eventId: string; sourceId: string; status: 'rejected' | 'unassigned' }[]; sessionStartMs: number; offsetMs: number; wakeReceived: boolean;
  activeCrewId: CrewId; profiles: Record<CrewId, ProfileState>;
}
export type PreviewAction = { type: 'tick' | 'next'; now: number }
  | { type: 'select'; crewId: CrewId }
  | { type: 'laboratory/view'; owner: CrewId; sampleId: string; eventId: string }
  | { type: 'exercise/view'; owner: CrewId; sessionId: string; eventId: string }
  | { type: 'seen'; owner: CrewId } | { type: 'draft'; owner: CrewId; text: string }
  | { type: 'position'; owner: CrewId; position: Position | null }
  | { type: 'ask'; owner: CrewId; text: string; lang: 'en' | 'es' } | { type: 'reset'; now: number };
export function freshPreview(now: number): PreviewState {
  const profile = (): ProfileState => ({ seen: false, draft: '', turns: [], position: null, exerciseSeenIds: [], highlightedSessionId: null, labSeenIds: [], highlightedSampleId: null });
  return { version: 4, laboratory: initialLab(), processedIds: [...PRELOADED_IDS], diagnostics: [],
    exercise: [{ id: EXERCISE_HISTORY[0].sessionId, crewId: OWNER, start: EXERCISE_HISTORY[0], finish: EXERCISE_HISTORY[1] }], sessionStartMs: now, offsetMs: 0, wakeReceived: false, activeCrewId: OWNER,
    profiles: { [OWNER]: profile(), 'iss:crew-ti': profile(), 'iss:crew-mo': profile() } };
}
export function previewTime(state: PreviewState, now: number) {
  return START + Math.max(0, now - state.sessionStartMs) + state.offsetMs;
}
export function previewReduce(state: PreviewState, action: PreviewAction): PreviewState {
  // Late pointer/chat actions must never be retargeted after View as.
  if ('owner' in action && action.owner !== state.activeCrewId) return state;
  const owner = state.activeCrewId;
  const profile = state.profiles[owner];
  const update = (patch: Partial<ProfileState>): PreviewState => ({ ...state, profiles: { ...state.profiles, [owner]: { ...profile, ...patch } } });
  switch (action.type) {
    case 'select': return CREW.some(c => c.id === action.crewId) ? { ...state, activeCrewId: action.crewId } : state;
    case 'reset': return freshPreview(action.now);
    case 'tick':
    case 'next': {
      const next = nextPreviewEvent(state);
      const offsetMs = action.type === 'next' && next
        ? state.offsetMs + Math.max(0, Date.parse(next.receivedAt) - previewTime(state, action.now)) : state.offsetMs;
      let result = offsetMs === state.offsetMs ? state : { ...state, offsetMs };
      const time = previewTime(result, action.now);
      for (const event of DAY_EVENTS) {
        if (result.processedIds.includes(event.id) || Date.parse(event.receivedAt) > time || Date.parse(event.occurredAt) > time) continue;
        if ('sampleId' in event) result = ingestLab(result, [event], time);
        else if ('sessionId' in event) result = ingestExercise(result, [event], time);
        else result = { ...result, wakeReceived: true, processedIds: [...result.processedIds, event.id] };
      }
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
      const reply = previewReply(state, owner, text);
      return update({ draft: '', turns: [...profile.turns, { text, lang: action.lang, reply }] });
    }
  }
}
function validPosition(p: unknown): p is Position | null {
  if (p === null) return true;
  if (typeof p !== 'object' || !p) return false;
  const { x, y } = p as Position;
  return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1;
}
function validProfile(p: unknown): p is ProfileState {
  if (typeof p !== 'object' || !p) return false;
  const s = p as ProfileState;
  return typeof s.seen === 'boolean' && typeof s.draft === 'string' && Array.isArray(s.turns)
    && s.turns.every(t => t && typeof t.text === 'string' && ['en', 'es'].includes(t.lang)
      && ['sleep', 'exercise', 'laboratory', 'fallback'].includes(t.reply));
}
export function restorePreview(raw: string | null, now: number): PreviewState {
  try {
    const s = JSON.parse(raw ?? 'null');
    if (s && [1, 2, 3, 4].includes(s.version) && Number.isFinite(s.sessionStartMs) && s.sessionStartMs <= now
      && Number.isFinite(s.offsetMs) && s.offsetMs >= 0 && typeof s.wakeReceived === 'boolean') {
      const fresh = freshPreview(s.sessionStartMs);
      if (s.version === 1 && validProfile(s.profiles?.[OWNER])) {
        return { ...fresh, offsetMs: s.offsetMs, wakeReceived: s.wakeReceived,
          processedIds: [...fresh.processedIds, ...(s.wakeReceived ? [WAKE_EVENT.id] : [])],
          profiles: { ...fresh.profiles, [OWNER]: { ...fresh.profiles[OWNER], ...s.profiles[OWNER], position: null } } };
      }
      if (CREW.some(c => c.id === s.activeCrewId)
        && CREW.every(c => validProfile(s.profiles?.[c.id]) && validPosition(s.profiles[c.id].position))) {
        if (s.version === 2) return { ...fresh, offsetMs: s.offsetMs, wakeReceived: s.wakeReceived, activeCrewId: s.activeCrewId,
          processedIds: [...fresh.processedIds, ...(s.wakeReceived ? [WAKE_EVENT.id] : [])],
          profiles: Object.fromEntries(CREW.map(c => [c.id, { ...fresh.profiles[c.id], ...s.profiles[c.id] }])) as Record<CrewId, ProfileState> };
        if (Array.isArray(s.processedIds) && s.processedIds.every((id: unknown) => typeof id === 'string')
          && Array.isArray(s.exercise) && validExercise(s.exercise) && Array.isArray(s.diagnostics)
          && CREW.every(c => Array.isArray(s.profiles[c.id].exerciseSeenIds)
            && s.profiles[c.id].exerciseSeenIds.every((id: unknown) => typeof id === 'string')
            && (s.profiles[c.id].highlightedSessionId === null || typeof s.profiles[c.id].highlightedSessionId === 'string'))) {
          if (s.version === 3) return { ...s, version: 4, laboratory: initialLab(), processedIds: [...new Set([...s.processedIds, LAB_HISTORY.id])],
            profiles: Object.fromEntries(CREW.map(c => [c.id, { ...s.profiles[c.id], labSeenIds: [], highlightedSampleId: null }])) as Record<CrewId, ProfileState> };
          if (Array.isArray(s.laboratory) && validLab(s.laboratory) && CREW.every(c => Array.isArray(s.profiles[c.id].labSeenIds)
            && s.profiles[c.id].labSeenIds.every((id: unknown) => typeof id === 'string')
            && (s.profiles[c.id].highlightedSampleId === null || typeof s.profiles[c.id].highlightedSampleId === 'string'))) return s as PreviewState;
        }
      }
    }
  } catch { /* Corrupt/unavailable storage starts only this preview afresh. */ }
  return freshPreview(now);
}
function validExercise(sessions: ExerciseSession[]): boolean {
  // Snapshots can only restore this version's immutable fixture records.
  const known = [...EXERCISE_HISTORY, ...EXERCISE_EVENTS];
  return sessions.every(s => s && s.crewId === OWNER && typeof s.id === 'string' && (s.start || s.finish)
    && [s.start, s.finish].every(e => e === null || known.some(k => JSON.stringify(k) === JSON.stringify(e) && k.sessionId === s.id)));
}
