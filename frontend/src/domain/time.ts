import type { Interval, IsoUtc } from '../state/types';

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export function toMs(iso: IsoUtc): number {
  return Date.parse(iso);
}

export function toIso(ms: number): IsoUtc {
  return new Date(ms).toISOString().replace('.000Z', 'Z');
}

export function shift(iso: IsoUtc, deltaMs: number): IsoUtc {
  return toIso(toMs(iso) + deltaMs);
}

export function durationMinutes(i: Interval): number {
  return Math.round((toMs(i.end) - toMs(i.start)) / MINUTE_MS);
}

/** Half-open intervals [start, end): touching intervals do not overlap. */
export function overlaps(a: Interval, b: Interval): boolean {
  return toMs(a.start) < toMs(b.end) && toMs(b.start) < toMs(a.end);
}

export function sameInterval(a: Interval, b: Interval): boolean {
  return a.start === b.start && a.end === b.end;
}

/** Mission time for a real timestamp: clockStart + (nowMs − sessionStartMs). */
export function missionTimeMs(clockStart: IsoUtc, sessionStartMs: number, nowMs: number): number {
  return toMs(clockStart) + (nowMs - sessionStartMs);
}

export function flightDay(flightDayOne: IsoUtc, missionMs: number): number {
  return Math.floor((missionMs - toMs(flightDayOne)) / DAY_MS) + 1;
}

/** Default agenda range: from 12:00 UTC of the mission day at session start to 12:00 UTC the next day. */
export function defaultAgendaRange(clockStart: IsoUtc): Interval {
  const startMs = toMs(clockStart);
  const dayStart = Math.floor(startMs / DAY_MS) * DAY_MS;
  const noon = dayStart + 12 * HOUR_MS;
  const from = startMs >= noon ? noon : noon - DAY_MS;
  return { start: toIso(from), end: toIso(from + DAY_MS) };
}
