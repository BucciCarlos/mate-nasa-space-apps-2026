import { describe, expect, it } from 'vitest';
import { meanOfReadings, sessionPowerDifference, sleepDelta } from './todayMetrics';

describe('Today card metrics', () => {
  it('compares a night only with the immediately preceding recorded night', () => {
    const nights = [{ fd: 27, durationMinutes: 400 }, { fd: 29, durationMinutes: 395 }, { fd: 30, durationMinutes: 385 }];
    expect(sleepDelta(nights, nights[2])).toEqual({ minutes: -10, previousFd: 29 });
    expect(sleepDelta(nights, nights[1])).toBeNull(); // FD28 is a gap, FD27 is not bridged
    expect(sleepDelta(nights, null)).toBeNull();
    expect(sleepDelta([{ fd: 28, durationMinutes: 400 }, { fd: 29, durationMinutes: 405 }], { fd: 29, durationMinutes: 405 })).toEqual({ minutes: 5, previousFd: 28 });
    expect(sleepDelta([{ fd: 28, durationMinutes: 400 }, { fd: 29, durationMinutes: 400 }], { fd: 29, durationMinutes: 400 })?.minutes).toBe(0);
  });
  it('averages only available readings and never fills gaps', () => {
    expect(meanOfReadings([100, null, 120, undefined, NaN])).toEqual({ mean: 110, count: 2 });
    expect(meanOfReadings([null, null])).toBeNull();
    expect(meanOfReadings([])).toBeNull();
  });
  it('reuses the history power difference only for a session in that comparison', () => {
    const c = { recent: [{ id: 'a' }, { id: 'b' }], baseline: new Array(8), referenceW: 100, recentW: 104, differenceW: 4, differencePercent: 4 };
    expect(sessionPowerDifference([c], 'b')).toMatchObject({ differenceW: 4, differencePercent: 4, sessions: 8 });
    expect(sessionPowerDifference([c], 'old')).toBeNull();
    expect(sessionPowerDifference([{ ...c, referenceW: null, recentW: null, differenceW: null, differencePercent: null }], 'a')).toBeNull();
    expect(sessionPowerDifference([c], null)).toBeNull();
  });
});
