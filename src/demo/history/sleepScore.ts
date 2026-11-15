import type { PreviewState } from '../fd30';
import { sleepHistory } from './sleep';
import type { SleepRecord, SleepViewer } from './sleep';
import { SLEEP_SOURCE } from './sleepSource';

/** Original M.A.T.E. scenario design; not a NASA/Samsung formula or clinical reference. */
export const SLEEP_SCORE_PARAMETERS = { version: 'mate-sleep-score.1', targetMinutes: 480, efficiencyLow: 70, efficiencyHigh: 95 } as const;
export const BED_SOURCE = { adapter: 'mate-scenario-bed', version: 'fd30-bed.1', dataClass: 'fictional_fd30', unit: 'min' } as const;
export interface BedEpisode {
  recordId: string; owner: SleepRecord['owner']; fd: number; startAt: string; endAt: string;
  occurredAt: string; receivedAt: string; source: typeof BED_SOURCE;
  durationSource: SleepRecord['source']; awakeningsCount?: number;
}
// Explicit fictional episodes only for FD28/29. No reconstruction from the agenda.
export const BED_EPISODES: readonly BedEpisode[] = [
  { recordId: 'iss:sleep:lf:fd28', owner: 'iss:crew-lf', fd: 28, startAt: '2027-03-07T22:16:00Z', endAt: '2027-03-08T05:56:00Z', occurredAt: '2027-03-08T05:56:00Z', receivedAt: '2027-03-08T05:56:00Z', source: BED_SOURCE, durationSource: SLEEP_SOURCE },
  { recordId: 'iss:sleep:lf:fd29', owner: 'iss:crew-lf', fd: 29, startAt: '2027-03-08T22:06:00Z', endAt: '2027-03-09T05:56:00Z', occurredAt: '2027-03-09T05:56:00Z', receivedAt: '2027-03-09T05:56:00Z', source: BED_SOURCE, durationSource: SLEEP_SOURCE },
  { recordId: 'iss:sleep:ti:fd28', owner: 'iss:crew-ti', fd: 28, startAt: '2027-03-07T22:03:00Z', endAt: '2027-03-08T06:03:00Z', occurredAt: '2027-03-08T06:03:00Z', receivedAt: '2027-03-08T06:03:00Z', source: BED_SOURCE, durationSource: SLEEP_SOURCE },
  { recordId: 'iss:sleep:ti:fd29', owner: 'iss:crew-ti', fd: 29, startAt: '2027-03-08T21:53:00Z', endAt: '2027-03-09T06:03:00Z', occurredAt: '2027-03-09T06:03:00Z', receivedAt: '2027-03-09T06:03:00Z', source: BED_SOURCE, durationSource: SLEEP_SOURCE },
  { recordId: 'iss:sleep:mo:fd28', owner: 'iss:crew-mo', fd: 28, startAt: '2027-03-07T22:08:00Z', endAt: '2027-03-08T05:58:00Z', occurredAt: '2027-03-08T05:58:00Z', receivedAt: '2027-03-08T05:58:00Z', source: BED_SOURCE, durationSource: SLEEP_SOURCE },
  { recordId: 'iss:sleep:mo:fd29', owner: 'iss:crew-mo', fd: 29, startAt: '2027-03-08T22:13:00Z', endAt: '2027-03-09T05:58:00Z', occurredAt: '2027-03-09T05:58:00Z', receivedAt: '2027-03-09T05:58:00Z', source: BED_SOURCE, durationSource: SLEEP_SOURCE },
];
export const halfUp = (value: number) => Math.floor(value + 0.5);
/** Null is absence/invalid input, never a score of zero. Awakenings have zero weight. */
export function calculateSleepScore(duration: number, timeInBed: number) {
  if (!Number.isFinite(duration) || duration < 0 || !Number.isFinite(timeInBed) || timeInBed <= 0 || timeInBed < duration) return null;
  const ratio = Math.min(duration / SLEEP_SCORE_PARAMETERS.targetMinutes, 1);
  const efficiencyPercent = 100 * duration / timeInBed;
  const durationPoints = 70 * ratio;
  const { efficiencyLow, efficiencyHigh } = SLEEP_SCORE_PARAMETERS;
  const efficiencyPoints = 30 * Math.max(0, Math.min((efficiencyPercent - efficiencyLow) / (efficiencyHigh - efficiencyLow), 1)) * ratio;
  const raw = durationPoints + efficiencyPoints;
  return { raw, display: halfUp(raw), durationPoints, efficiencyPoints, efficiencyPercent, timeInBed, ratio };
}
export type ScoreReason = 'noRecord' | 'missingBed' | 'invalidBed';
export function scoreNight(record: SleepRecord | null, cursor: number, episodes: readonly BedEpisode[] = BED_EPISODES) {
  const unavailable = (reason: ScoreReason) => ({ score: null, episode: null, reason });
  if (!record || !Number.isFinite(cursor) || Date.parse(record.occurredAt) > cursor || Date.parse(record.receivedAt) > cursor) return unavailable('noRecord');
  const matches = episodes.filter(e => e.recordId === record.id && e.owner === record.owner && e.fd === record.fd);
  if (!matches.length) return unavailable('missingBed');
  if (matches.length !== 1) return unavailable('invalidBed');
  const episode = matches[0];
  const times = [episode.startAt, episode.endAt, episode.occurredAt, episode.receivedAt, record.occurredAt, record.receivedAt].map(Date.parse);
  const [start, end, occurred, received] = times;
  if (times.some(t => !Number.isFinite(t)) || start >= end || end > occurred || occurred > received
    || episode.endAt !== record.occurredAt
    || Object.entries(BED_SOURCE).some(([key, value]) => episode.source[key as keyof typeof BED_SOURCE] !== value)
    || Object.entries(SLEEP_SOURCE).some(([key, value]) => record.source[key as keyof typeof SLEEP_SOURCE] !== value
      || episode.durationSource[key as keyof typeof SLEEP_SOURCE] !== value)) return unavailable('invalidBed');
  if (occurred > cursor || received > cursor) return unavailable('missingBed');
  const score = calculateSleepScore(record.durationMinutes, (end - start) / 60_000);
  return score ? { score, episode, reason: null } : unavailable('invalidBed');
}
export function sleepScoreComparison(current: ReturnType<typeof calculateSleepScore>, previous: ReturnType<typeof calculateSleepScore>) {
  if (!current || !previous) return null;
  const delta = current.raw - previous.raw;
  return { delta, direction: Math.abs(delta) < 1 ? 'steady' as const : delta > 0 ? 'up' as const : 'down' as const,
    points: halfUp(Math.abs(delta)) };
}
/** Existing private selector gates owner/receipt/event before scoring; comparison ignores display range. */
export function sleepScoreDetail(state: Pick<PreviewState, 'activeCrewId' | 'processedIds'>, viewer: SleepViewer, cursor: number, fd: number,
  episodes: readonly BedEpisode[] = BED_EPISODES, records?: readonly SleepRecord[]) {
  const history = sleepHistory(state, viewer, cursor, 'all', records);
  if (!history) return null;
  const current = scoreNight(history.records.find(r => r.fd === fd) ?? null, cursor, episodes);
  const previous = scoreNight(history.records.find(r => r.fd === fd - 1) ?? null, cursor, episodes);
  return { ...current, previousFd: fd - 1, comparison: sleepScoreComparison(current.score, previous.score) };
}
