import { CREW, END, START } from '../../demo/fd30';
import type { CrewId } from '../../demo/fd30';
import { planFor } from '../../demo/fd30Plan';
import type { Bilingual, Locale } from '../../state/types';

export const COMMANDER = 'iss:crew-ti' as const;
export const OPS_KEY = 'mate:fd30:ops01:v1';
export type WellbeingTopic = 'day' | 'leisure';
export type RequestKind = 'support' | 'replanning';
export interface Checkin { id: string; owner: CrewId; at: number; topic: WellbeingTopic; text: string; lang: Locale }
export interface RequestPreview {
  id: string; owner: CrewId; recipient: typeof COMMANDER; kind: RequestKind; text: string; lang: Locale;
  blockId: string; title: Bilingual; start: string; end: string;
}
export interface SharedRequest extends RequestPreview { sentAt: number }
export interface OpsProfile {
  wellbeing: { topic: WellbeingTopic; text: string }; checkins: Checkin[];
  request: { kind: RequestKind; blockId: string | null; text: string }; preview: RequestPreview | null;
}
export interface OpsState { version: 1; nextId: number; profiles: Record<CrewId, OpsProfile>; requests: SharedRequest[] }
export type OpsAction = { type: 'reset' }
  | { type: 'wellbeing/draft'; owner: CrewId; topic: WellbeingTopic; text: string }
  | { type: 'wellbeing/save'; owner: CrewId; lang: Locale }
  | { type: 'wellbeing/cancel'; owner: CrewId }
  | { type: 'request/draft'; owner: CrewId; kind: RequestKind; blockId: string | null; text: string }
  | { type: 'request/preview'; owner: CrewId; lang: Locale }
  | { type: 'request/cancel'; owner: CrewId }
  | { type: 'request/send'; owner: CrewId; previewId: string };

const profile = (): OpsProfile => ({ wellbeing: { topic: 'day', text: '' }, checkins: [], request: { kind: 'support', blockId: null, text: '' }, preview: null });
export const freshOps = (): OpsState => ({ version: 1, nextId: 1, requests: [], profiles: Object.fromEntries(CREW.map(c => [c.id, profile()])) as Record<CrewId, OpsProfile> });
const validTime = (time: number) => Number.isFinite(time) && time >= START && time <= END;

/** Voluntary journal only. Identity and time are supplied by the one existing FD30 session. */
export function opsReduce(state: OpsState, action: OpsAction, activeOwner: CrewId, time: number): OpsState {
  if (action.type === 'reset') return freshOps();
  if (action.owner !== activeOwner || !state.profiles[action.owner] || !validTime(time)) return state;
  const owner = action.owner, p = state.profiles[owner];
  const update = (patch: Partial<OpsProfile>, extra: Partial<OpsState> = {}): OpsState => ({ ...state, ...extra, profiles: { ...state.profiles, [owner]: { ...p, ...patch } } });
  switch (action.type) {
    case 'wellbeing/draft': return ['day', 'leisure'].includes(action.topic) ? update({ wellbeing: { topic: action.topic, text: action.text } }) : state;
    case 'wellbeing/cancel': return update({ wellbeing: { topic: 'day', text: '' } });
    case 'wellbeing/save': {
      if (!p.wellbeing.text.trim()) return state;
      const entry: Checkin = { id: `iss:ops:checkin:${state.nextId}`, owner, at: time, ...p.wellbeing, lang: action.lang };
      return update({ checkins: [...p.checkins, entry], wellbeing: { topic: 'day', text: '' } }, { nextId: state.nextId + 1 });
    }
    case 'request/draft': return ['support', 'replanning'].includes(action.kind)
      && (action.blockId === null || planFor(owner).some(b => b.id === action.blockId))
      ? update({ request: { kind: action.kind, blockId: action.blockId, text: action.text }, preview: null }) : state;
    case 'request/preview': {
      if (owner === COMMANDER || p.preview || !p.request.text.trim()) return state;
      const block = planFor(owner).find(b => b.id === p.request.blockId);
      if (!block) return state;
      return update({ preview: { id: `iss:ops:request:${state.nextId}`, owner, recipient: COMMANDER,
        kind: p.request.kind, text: p.request.text, lang: action.lang, blockId: block.id,
        title: { ...block.title }, start: block.start, end: block.end } }, { nextId: state.nextId + 1 });
    }
    case 'request/cancel': return update({ preview: null });
    case 'request/send': {
      if (!p.preview || p.preview.id !== action.previewId || owner === COMMANDER || state.requests.some(r => r.id === action.previewId)) return state;
      return update({ preview: null, request: { kind: 'support', blockId: null, text: '' } }, { requests: [...state.requests, { ...p.preview, title: { ...p.preview.title }, sentAt: time }] });
    }
  }
}

export function ownCheckins(state: OpsState, owner: CrewId, time: number) { return state.profiles[owner].checkins.filter(e => e.owner === owner && e.at <= time); }
export function visibleRequests(state: OpsState, viewer: CrewId, time: number) {
  return state.requests.filter(r => r.recipient === COMMANDER && (r.owner === viewer || r.recipient === viewer) && r.sentAt <= time);
}

/** Restore only this journal's allowlisted fields. Invalid snapshots start empty, never merge with M1. */
export function restoreOps(raw: string | null): OpsState {
  if (!raw) return freshOps();
  try {
    const data: OpsState = JSON.parse(raw);
    if (data.version !== 1 || !Number.isSafeInteger(data.nextId) || data.nextId < 1 || !Array.isArray(data.requests)) return freshOps();
    const result = freshOps(); result.nextId = data.nextId;
    const lang = (l: unknown): l is Locale => l === 'en' || l === 'es';
    const request = (r: RequestPreview): RequestPreview => {
      const block = planFor(r.owner).find(b => b.id === r.blockId);
      if (!block || r.owner === COMMANDER || r.recipient !== COMMANDER || !['support', 'replanning'].includes(r.kind)
        || !r.id.startsWith('iss:ops:request:') || typeof r.text !== 'string' || !r.text.trim() || !lang(r.lang)
        || r.start !== block.start || r.end !== block.end || typeof r.title.en !== 'string' || typeof r.title.es !== 'string') throw new Error('Invalid request');
      return { id: r.id, owner: r.owner, recipient: COMMANDER, kind: r.kind, text: r.text, lang: r.lang,
        blockId: block.id, title: { en: r.title.en, es: r.title.es }, start: r.start, end: r.end };
    };
    for (const { id: owner } of CREW) {
      const p = data.profiles[owner];
      if (!['day', 'leisure'].includes(p.wellbeing.topic) || typeof p.wellbeing.text !== 'string' || !Array.isArray(p.checkins)
        || !['support', 'replanning'].includes(p.request.kind) || typeof p.request.text !== 'string'
        || (p.request.blockId !== null && !planFor(owner).some(b => b.id === p.request.blockId))) return freshOps();
      result.profiles[owner] = { wellbeing: { topic: p.wellbeing.topic, text: p.wellbeing.text },
        checkins: p.checkins.map(e => {
          if (e.owner !== owner || !e.id.startsWith('iss:ops:checkin:') || !validTime(e.at) || !['day', 'leisure'].includes(e.topic) || typeof e.text !== 'string' || !lang(e.lang)) throw new Error('Invalid check-in');
          return { id: e.id, owner, at: e.at, topic: e.topic, text: e.text, lang: e.lang };
        }), request: { kind: p.request.kind, blockId: p.request.blockId, text: p.request.text }, preview: p.preview ? request(p.preview) : null };
      if (result.profiles[owner].preview?.owner !== undefined && result.profiles[owner].preview?.owner !== owner) return freshOps();
    }
    result.requests = data.requests.map(r => { if (!validTime(r.sentAt)) throw new Error('Invalid receipt'); return { ...request(r), sentAt: r.sentAt }; });
    if (new Set(result.requests.map(r => r.id)).size !== result.requests.length) return freshOps();
    return result;
  } catch { return freshOps(); }
}
