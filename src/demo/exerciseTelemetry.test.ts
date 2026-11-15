import { describe, expect, it } from 'vitest';
import { currentTelemetry, TELEMETRY, TELEMETRY_END, TELEMETRY_START, visibleTelemetry } from './exerciseTelemetry';
import { OWNER } from './fd30';

describe('simulated Exercise telemetry, reveal by receipt and owner', () => {
  it('has 61 minute slots and the sole pulse exception, with a preserved three-minute null gap', () => {
    expect(TELEMETRY).toHaveLength(61);
    expect(TELEMETRY.filter(p => p.workload_w === null).map(p => p.occurredAt.slice(11, 16))).toEqual(['10:52', '10:53', '10:54']);
    expect(TELEMETRY.filter(p => p.cadence_rpm === null)).toHaveLength(3);
    expect(TELEMETRY.filter(p => p.pulse_bpm === null)).toHaveLength(3);
    expect(TELEMETRY.every(p => p.origin === 'simulated' && p.receivedAt === p.occurredAt)).toBe(true);
    expect(Object.keys(TELEMETRY[0]).sort()).toEqual(['cadence_rpm', 'crewId', 'occurredAt', 'origin', 'pulse_bpm', 'receivedAt', 'sessionId', 'sourceId', 'workload_w']);
  });
  it('hides future points in both directions and never borrows another person’s series', () => {
    expect(visibleTelemetry(TELEMETRY_START - 1, OWNER)).toEqual([]);
    expect(visibleTelemetry(Date.parse('2027-03-10T10:41:00Z'), OWNER)).toHaveLength(12);
    expect(visibleTelemetry(TELEMETRY_END, OWNER)).toHaveLength(61);
    expect(visibleTelemetry(TELEMETRY_START, OWNER)).toHaveLength(1);
    for (const other of ['iss:crew-ti', 'iss:crew-mo'] as const) expect(visibleTelemetry(TELEMETRY_END, other)).toEqual([]);
    expect(visibleTelemetry(NaN, OWNER)).toEqual([]);
  });
  it('never carries a stale value or exposes a reading before receipt', () => {
    const first = TELEMETRY[0];
    expect(currentTelemetry([first], TELEMETRY_START + 59_999)).toBe(first);
    expect(currentTelemetry([first], TELEMETRY_START + 60_000)).toBeNull();
    expect(currentTelemetry([], TELEMETRY_START)).toBeNull();
    expect(currentTelemetry([{ ...first, receivedAt: '2027-03-10T10:31:00Z' }], TELEMETRY_START)).toBeNull();
    expect(currentTelemetry(TELEMETRY, TELEMETRY_START - 1)).toBeNull();
    expect(currentTelemetry(TELEMETRY, NaN)).toBeNull();
  });
});
