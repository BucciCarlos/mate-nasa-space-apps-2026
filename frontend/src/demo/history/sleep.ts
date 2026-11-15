import type { CrewId, PreviewState } from '../fd30';
import type { GroundRole } from '../../state/types';
import { SLEEP_SOURCE } from './sleepSource';

export const FLIGHT_DAY_ONE = Date.parse('2027-02-09T00:00:00Z');
const DAY = 86_400_000;
export const fdDate = (fd: number) => new Date(FLIGHT_DAY_ONE + (fd - 1) * DAY).toISOString().slice(0, 10);
export const fdLabel = (fd: number) => `FD${String(fd).padStart(2, '0')}`;
export type SleepRange = 'last7' | 'all';
export type SleepViewer = { perspective: 'onboard'; owner: CrewId } | { perspective: 'ground'; role: GroundRole };
export interface SleepRecord {
  id: string; owner: CrewId; fd: number; occurredAt: string; receivedAt: string;
  durationMinutes: number; source: typeof SLEEP_SOURCE; eventId?: string;
}
// Original fictional script, not NASA data or a population model. Null positions emit NO record.
// FD30 is intentionally absent for Tomás/Mei: HIST01 does not add live events for them.
const nights: Record<CrewId, readonly (number | null)[]> = {
  'iss:crew-lf': [448, 455, 446, 452, 458, 447, 451, 444, 456, null, 449, 454, 445, 453, 450, 457, 448, 452, null, 446, 455, 449, 453, 447, 456, 451, 450, 405, 395, 385],
  'iss:crew-ti': [423, 438, 429, 441, 425, 434, 420, 439, 428, 435, 424, 442, 430, 421, 437, 427, 440, 426, 433, 422, 436, 431, 419, 438, 428, 441, 424, 435, 430],
  'iss:crew-mo': [442, 446, 440, 444, 443, 447, 441, 445, 442, 444, 440, 446, 443, 445, 441, 444, 442, 447, 440, 445, 443, 441, 446, 442, 444, 440, null, 443, 445],
};
const historicalEnd: Record<CrewId, string> = { 'iss:crew-lf': '05:56', 'iss:crew-ti': '06:03', 'iss:crew-mo': '05:58' };
/** One canonical list. The existing wake event is only a receipt gate, not a second duration store. */
export const SLEEP_RECORDS: readonly SleepRecord[] = Object.entries(nights).flatMap(([id, values]) => {
  const owner = id as CrewId;
  return values.flatMap((durationMinutes, index): SleepRecord[] => {
    if (durationMinutes === null) return [];
    const fd = index + 1, occurredAt = `${fdDate(fd)}T${fd === 30 ? '06:00' : historicalEnd[owner]}:00Z`;
    return [{ id: `iss:sleep:${owner.slice(-2)}:fd${fd}`, owner, fd, occurredAt, receivedAt: occurredAt,
      durationMinutes, source: SLEEP_SOURCE, ...(fd === 30 ? { eventId: 'iss:fd30:lf:wake-1' } : {}) }];
  });
});
export interface SleepDay { fd: number; record: SleepRecord | null; status: 'recorded' | 'no_record' | 'not_received' | 'future' }
export function medianMinutes(records: readonly SleepRecord[]): number | null {
  if (!records.length) return null;
  const values = records.map(r => r.durationMinutes).sort((a, b) => a - b), middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}
/** Permission/owner -> occurrence AND receipt -> view window. No stored copies, actions or clock. */
export function sleepHistory(state: Pick<PreviewState, 'activeCrewId' | 'processedIds'>, viewer: SleepViewer, cursor: number, range: SleepRange,
  records: readonly SleepRecord[] = SLEEP_RECORDS) {
  if (viewer.perspective !== 'onboard' || viewer.owner !== state.activeCrewId || !Number.isFinite(cursor)) return null;
  const currentFd = Math.floor((cursor - FLIGHT_DAY_ONE) / DAY) + 1;
  if (currentFd < 1 || currentFd > 30) return null;
  const available = records.filter(r => r.owner === viewer.owner && Date.parse(r.occurredAt) <= cursor && Date.parse(r.receivedAt) <= cursor
    && (!r.eventId || state.processedIds.includes(r.eventId)));
  const firstFd = range === 'last7' ? Math.max(1, currentFd - 6) : 1;
  const window = available.filter(r => r.fd >= firstFd && r.fd <= currentFd).sort((a, b) => a.fd - b.fd);
  const days: SleepDay[] = Array.from({ length: currentFd - firstFd + 1 }, (_, i) => {
    const fd = firstFd + i, record = window.find(r => r.fd === fd) ?? null;
    return { fd, record, status: record ? 'recorded' : fd === currentFd ? 'not_received' : 'no_record' };
  });
  return { owner: viewer.owner, firstFd, currentFd, days, records: window, latest: window.at(-1) ?? null, medianMinutes: medianMinutes(window) };
}
/** Split at missing nights; never bridge a gap or replace it with zero. */
export function sleepSegments(days: readonly SleepDay[]): SleepRecord[][] {
  const segments: SleepRecord[][] = [];
  let current: SleepRecord[] = [];
  for (const day of days) {
    if (!day.record) { current = []; continue; }
    if (!current.length) segments.push(current);
    current.push(day.record);
  }
  return segments;
}
export const sleepDuration = (minutes: number) => `${Math.floor(Math.round(minutes) / 60)}:${String(Math.round(minutes) % 60).padStart(2, '0')}`;
