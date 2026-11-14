// Isolated IMP02 fixture. The published M1 clock, plan, storage and medical queue are untouched.
export const FD30_KEY = 'mate:fd30:imp02:v1';
export const OWNER = 'iss:crew-lf';
export const CREW = [
  { id: OWNER, name: 'Lucía Ferraro', character: 'Sprout', shape: 'sprout' },
  { id: 'iss:crew-ti', name: 'Tomás Ibarra', character: 'Beacon', shape: 'beacon' },
  { id: 'iss:crew-mo', name: 'Mei Okada', character: 'Sail', shape: 'sail' },
] as const;
export type CrewId = typeof CREW[number]['id'];
export interface Position { x: number; y: number }
export interface ProfileState { seen: boolean; draft: string; turns: Turn[]; position: Position | null }
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
export interface Turn { text: string; lang: 'en' | 'es'; reply: 'sleep' | 'fallback' }
export interface PreviewState {
  version: 2; sessionStartMs: number; offsetMs: number; wakeReceived: boolean;
  activeCrewId: CrewId; profiles: Record<CrewId, ProfileState>;
}
export type PreviewAction = { type: 'tick' | 'next'; now: number }
  | { type: 'select'; crewId: CrewId }
  | { type: 'seen'; owner: CrewId } | { type: 'draft'; owner: CrewId; text: string }
  | { type: 'position'; owner: CrewId; position: Position | null }
  | { type: 'ask'; owner: CrewId; text: string; lang: 'en' | 'es' } | { type: 'reset'; now: number };
export function freshPreview(now: number): PreviewState {
  const profile = (): ProfileState => ({ seen: false, draft: '', turns: [], position: null });
  return { version: 2, sessionStartMs: now, offsetMs: 0, wakeReceived: false, activeCrewId: OWNER,
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
      if (state.wakeReceived) return state;
      const offsetMs = action.type === 'next'
        ? state.offsetMs + Math.max(0, WAKE - previewTime(state, action.now)) : state.offsetMs;
      if (previewTime({ ...state, offsetMs }, action.now) < WAKE) return state;
      return { ...state, offsetMs, wakeReceived: true };
    }
    case 'seen': return owner === OWNER && state.wakeReceived && !profile.seen ? update({ seen: true }) : state;
    case 'position': return validPosition(action.position) ? update({ position: action.position }) : state;
    case 'draft': return update({ draft: action.text });
    case 'ask': {
      const text = action.text.trim();
      if (!text) return state;
      const reply = /sleep|rest|summary|sueño|dormi|descanso|resumen/i.test(text) ? 'sleep' : 'fallback';
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
      && ['sleep', 'fallback'].includes(t.reply));
}
export function restorePreview(raw: string | null, now: number): PreviewState {
  try {
    const s = JSON.parse(raw ?? 'null');
    if (s && [1, 2].includes(s.version) && Number.isFinite(s.sessionStartMs) && s.sessionStartMs <= now
      && Number.isFinite(s.offsetMs) && s.offsetMs >= 0 && typeof s.wakeReceived === 'boolean') {
      if (s.version === 1 && validProfile(s.profiles?.[OWNER])) {
        const fresh = freshPreview(s.sessionStartMs);
        return { ...fresh, offsetMs: s.offsetMs, wakeReceived: s.wakeReceived,
          profiles: { ...fresh.profiles, [OWNER]: { ...s.profiles[OWNER], position: null } } };
      }
      if (s.version === 2 && CREW.some(c => c.id === s.activeCrewId)
        && CREW.every(c => validProfile(s.profiles?.[c.id]) && validPosition(s.profiles[c.id].position))) return s as PreviewState;
    }
  } catch { /* Corrupt/unavailable storage starts only this preview afresh. */ }
  return freshPreview(now);
}
