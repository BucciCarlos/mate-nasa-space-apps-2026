export const DAY_START = Date.parse('2027-03-10T00:00:00Z');
export const DAY_END = Date.parse('2027-03-11T00:00:00Z'); // Exclusive visual boundary, never FD31 data.
export const ENTRY = Date.parse('2027-03-10T05:55:00Z');
export const START = ENTRY; // Stable offset base for previous snapshots and elapsed-time consumers.
export const END = DAY_END - 60_000; // DA-1: final selectable/running instant is 23:59:00 UTC.
export const clampMissionTime = (time: number) => Math.max(DAY_START, Math.min(END, time));

/** One presentation policy for geometry, details, cards and accessible labels. Canonical blocks stay intact. */
export function scheduleClock(value: number | string) {
  const ms = typeof value === 'string' ? Date.parse(value) : value;
  return ms === DAY_END ? '24:00' : new Date(ms).toISOString().slice(11, 16);
}
export function scheduleInterval(block: { start: string; end: string }) {
  return `${scheduleClock(Math.max(DAY_START, Date.parse(block.start)))}–${scheduleClock(Math.min(DAY_END, Date.parse(block.end)))} UTC`;
}
export function scheduleContinuation(block: { start: string; continuesAfterDay?: boolean }, text: { fromPrevious: string; continues: string }) {
  return Date.parse(block.start) < DAY_START ? text.fromPrevious : block.continuesAfterDay ? text.continues : '';
}
