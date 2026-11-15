// Geometry of the TEPC chart: time is proportional, the line breaks at every gap, gaps are shaded. Nothing is interpolated.
import type { TepcWindow } from './evidenceTypes';
import type { TepcGap } from './validate';
import { tepcSummary } from './validate';
import { niceTicks } from './scale';

export const RCHART = { w: 760, h: 340, left: 64, right: 16, top: 34, bottom: 54 } as const;
const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
const STEPS = [HOUR, 2 * HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, DAY, 2 * DAY, 7 * DAY, 30 * DAY];

export interface RadRun { points: { x: number; y: number }[] }
export interface RadChart {
  w: number; h: number; plot: { l: number; r: number; t: number; b: number };
  yTicks: { value: number; y: number }[];
  xTicks: { ms: number; x: number; midnight: boolean }[];
  runs: RadRun[];
  gaps: (TepcGap & { x0: number; x1: number })[];
}

export function buildRadChart(d: TepcWindow): RadChart {
  const plot = { l: RCHART.left, r: RCHART.w - RCHART.right, t: RCHART.top, b: RCHART.h - RCHART.bottom };
  const start = Date.parse(d.window.start), end = Date.parse(d.window.end);
  const x = (ms: number) => plot.l + ((ms - start) / (end - start)) * (plot.r - plot.l);
  const summary = tepcSummary(d);
  const yTicks0 = niceTicks(0, summary.max ?? 1, 5);
  const top = yTicks0[yTicks0.length - 1];
  const y = (v: number) => plot.b - (v / top) * (plot.b - plot.t);
  const step = d.cadenceMin * MIN;

  const runs: RadRun[] = [];
  let current: RadRun | null = null;
  let prev: number | null = null;
  for (const p of d.points) {
    const ms = Date.parse(p.t);
    if (p.dose === null || (prev !== null && ms - prev > 1.5 * step)) current = null;
    prev = ms;
    if (p.dose === null) continue;
    if (!current) { current = { points: [] }; runs.push(current); }
    current.points.push({ x: x(ms), y: y(p.dose) });
  }

  const span = end - start;
  const tickStep = STEPS.find(s => span / s <= 8) ?? STEPS[STEPS.length - 1];
  const xTicks: RadChart['xTicks'] = [];
  for (let ms = Math.ceil(start / tickStep) * tickStep; ms <= end; ms += tickStep) xTicks.push({ ms, x: x(ms), midnight: ms % DAY === 0 });

  return {
    w: RCHART.w, h: RCHART.h, plot,
    yTicks: yTicks0.map(v => ({ value: v, y: y(v) })), xTicks, runs,
    gaps: summary.gaps.map(g => ({ ...g, x0: x(g.startMs), x1: x(g.endMs) })),
  };
}
