/** Pure helpers behind the Today cards. No data of their own: they only read what the modules already select. */
export interface NightLike { fd: number; durationMinutes: number }

/** Difference to the immediately preceding flight day, only when both nights have a record. A gap omits the comparison. */
export function sleepDelta(records: readonly NightLike[], latest: NightLike | null): { minutes: number; previousFd: number } | null {
  if (!latest) return null;
  const previous = records.find(r => r.fd === latest.fd - 1);
  if (!previous) return null;
  return { minutes: Math.round(latest.durationMinutes) - Math.round(previous.durationMinutes), previousFd: previous.fd };
}

/** Mean of the available readings. Missing slots are skipped, never filled, and the count says how many were used. */
export function meanOfReadings(values: readonly (number | null | undefined)[]): { mean: number; count: number } | null {
  const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return valid.length ? { mean: valid.reduce((sum, v) => sum + v, 0) / valid.length, count: valid.length } : null;
}

interface Comparison { recent: readonly { id: string }[]; referenceW: number | null; recentW: number | null; differenceW: number | null; differencePercent: number | null; baseline: readonly unknown[] }
/** The history's own power comparison, only when the displayed session belongs to its latest-four cohort and a reference exists. */
export function sessionPowerDifference(comparisons: readonly Comparison[], sessionId: string | null | undefined) {
  if (!sessionId) return null;
  const found = comparisons.find(c => c.differenceW !== null && c.referenceW !== null && c.recent.some(r => r.id === sessionId));
  return found ? { differenceW: found.differenceW!, differencePercent: found.differencePercent, recentW: found.recentW!, referenceW: found.referenceW!, sessions: found.baseline.length } : null;
}
