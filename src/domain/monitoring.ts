import type { FlightMetric, FlightSample, TrajectoryStage } from '../state/types';

export const FLIGHT_METRICS: FlightMetric[] = ['pulse', 'sleep', 'reaction'];
export const TRAJECTORY_STAGES: TrajectoryStage[] = ['evaluation', 'training', 'flight', 'recovery'];
export const MONITORING_CREW_IDS = ['iss:crew-lf', 'iss:crew-ti'];
export const METRIC_UNITS = { pulse: 'bpm', sleep: 'h', reaction: 'ms' };

const BASELINE_DATES = ['2027-01-24T12:00:00Z', '2027-01-25T12:00:00Z', '2027-01-26T12:00:00Z'];
const FLIGHT_DATES = ['2027-03-05T12:00:00Z', '2027-03-06T12:00:00Z', '2027-03-07T12:00:00Z', '2027-03-08T12:00:00Z', '2027-03-09T12:00:00Z'];

const profiles = [
  { pulse: [61, 63, 62, 63, 64, null, 65, 66], sleep: [7.4, 7.6, 7.5, 7.3, 7.2, 7.4, 7, 6.8], reaction: [260, 280, 270, 275, 281, 295, 302, 310] },
  { pulse: [65, 67, 66, 69, 67, 67, 66, 65], sleep: [7.8, 8, 7.9, 7, 7.4, 7.6, 7.8, 7.9], reaction: [285, 280, 275, 295, 289, null, 284, 282] },
];

export function monitoringSeries(crewId: string, metric: FlightMetric) {
  const values = profiles[MONITORING_CREW_IDS.indexOf(crewId)]?.[metric];
  const baseline = BASELINE_DATES.map((at, i) => ({ at, value: values?.[i] ?? null }));
  const flight = FLIGHT_DATES.map((at, i) => ({ at, value: values?.[i + baseline.length] ?? null }));
  const mean = baseline.every((point) => point.value !== null)
    ? baseline.reduce((sum, point) => sum + (point.value ?? 0), 0) / baseline.length
    : null;
  return { baseline, flight, mean };
}

export function latestFlightSample(crewId: string, metric: FlightMetric): FlightSample | null {
  const point = monitoringSeries(crewId, metric).flight.filter((sample) => sample.value !== null).at(-1);
  return point && point.value !== null ? { metric, at: point.at, value: point.value, source: 'simulated' } : null;
}
