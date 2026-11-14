import type { Interval, IsoUtc, Locale } from '../state/types';
import { toMs } from '../domain/time';

export const LOCALE_TAG: Record<Locale, string> = { en: 'en-US', es: 'es-AR' };

const NBSP = ' ';
const MINUS = '−';

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** `06:00 UTC` */
export function fmtTime(value: IsoUtc | number, _locale: Locale): string {
  const d = new Date(typeof value === 'number' ? value : toMs(value));
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}${NBSP}UTC`;
}

/** `06:00` without suffix, for compact ranges */
export function fmtClock(value: IsoUtc | number): string {
  const d = new Date(typeof value === 'number' ? value : toMs(value));
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** `Wed, Mar 10` / `mié, 10 mar` */
export function fmtDate(value: IsoUtc | number, locale: Locale): string {
  const d = new Date(typeof value === 'number' ? value : toMs(value));
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
}

export function fmtDateTime(value: IsoUtc | number, locale: Locale): string {
  return `${fmtDate(value, locale)} ${fmtTime(value, locale)}`;
}

/** `7 h 00 min` */
export function fmtDuration(minutes: number): string {
  const m = Math.abs(Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}${NBSP}h ${pad(r)}${NBSP}min`;
}

/** `−1 h 30 min`, `+30 min`, `0 min` */
export function fmtDelta(minutes: number): string {
  const m = Math.round(minutes);
  if (m === 0) return `0${NBSP}min`;
  const sign = m < 0 ? MINUS : '+';
  const abs = Math.abs(m);
  const h = Math.floor(abs / 60);
  const r = abs % 60;
  if (h === 0) return `${sign}${r}${NBSP}min`;
  return `${sign}${h}${NBSP}h ${pad(r)}${NBSP}min`;
}

/** `21:30–06:00 UTC` */
export function fmtInterval(i: Interval, _locale: Locale): string {
  return `${fmtClock(i.start)}–${fmtClock(i.end)}${NBSP}UTC`;
}

export function fmtNumber(n: number, locale: Locale, digits = 1): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale], { maximumFractionDigits: digits }).format(n);
}
