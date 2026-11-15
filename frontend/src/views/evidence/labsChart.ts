// Geometry of the Inspiration4 chart. Pure, so the separation of the flight can be tested.
// Before-flight and after-flight samples are drawn as separate runs: nothing is drawn between L-3 and R+1,
// and no point, line or interpolation exists inside the flight band. A null breaks a run; it is never filled.
import type { I4AnalyteId, I4Labs } from './evidenceTypes';
import { I4_PRE_FLIGHT, I4_SUBJECTS, I4_TIMEPOINTS } from './evidenceTypes';
import { labValue } from './validate';
import { niceTicks, spreadLabels } from './scale';

export const CHART = { w: 760, h: 380, left: 64, right: 84, top: 34, bottom: 54 } as const;
export type MarkerShape = 'circle' | 'square' | 'triangle' | 'diamond';
export const MARKERS: readonly MarkerShape[] = ['circle', 'square', 'triangle', 'diamond'];
export const DASHES = ['', '7 4', '2 4', '8 3 2 3'] as const;

/** Slot of each timepoint on the x axis. Slot 3 is the flight band, which holds no timepoint. */
export const SLOT: Record<string, number> = { 'L-92': 0, 'L-44': 1, 'L-3': 2, 'R+1': 4, 'R+45': 5, 'R+82': 6, 'R+194': 7 };
const SLOTS = 8;

export interface ChartPoint { x: number; y: number; timepoint: string; value: number }
export interface ChartRun { part: 'pre' | 'post'; points: ChartPoint[] }
export interface ChartSeries { subject: string; marker: MarkerShape; dash: string; runs: ChartRun[]; label: { x: number; y: number } | null }
export interface LabsChart {
  w: number; h: number; plot: { l: number; r: number; t: number; b: number };
  band: { x0: number; x1: number };
  ticks: { value: number; y: number }[];
  xTicks: { timepoint: string; x: number; part: 'pre' | 'post' }[];
  series: ChartSeries[];
}

export function buildLabsChart(data: I4Labs, analyteId: I4AnalyteId, subject: string | 'all'): LabsChart {
  const a = data.analytes.find(x => x.id === analyteId);
  if (!a) throw new Error(`unknown analyte ${analyteId}`);
  const plot = { l: CHART.left, r: CHART.w - CHART.right, t: CHART.top, b: CHART.h - CHART.bottom };
  const unit = (plot.r - plot.l) / SLOTS;
  const x = (slot: number) => plot.l + (slot + 0.5) * unit;
  const subjects = subject === 'all' ? [...I4_SUBJECTS] : [subject];
  const all = subjects.flatMap(s => I4_TIMEPOINTS.map(tp => labValue(a, s, tp))).filter((v): v is number => v !== null);
  const ticks = all.length ? niceTicks(Math.min(...all), Math.max(...all), 5) : [0, 1];
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const y = (v: number) => plot.b - ((v - lo) / (hi - lo)) * (plot.b - plot.t);
  const pre = new Set<string>(I4_PRE_FLIGHT);

  const series: ChartSeries[] = subjects.map(s => {
    const idx = I4_SUBJECTS.indexOf(s as (typeof I4_SUBJECTS)[number]);
    const runs: ChartRun[] = [];
    let current: ChartRun | null = null;
    for (const tp of I4_TIMEPOINTS) {
      const part = pre.has(tp) ? 'pre' : 'post';
      const v = labValue(a, s, tp);
      if (v === null) { current = null; continue; }
      if (!current || current.part !== part) { current = { part, points: [] }; runs.push(current); }
      current.points.push({ x: x(SLOT[tp]), y: y(v), timepoint: tp, value: v });
    }
    return { subject: s, marker: MARKERS[Math.max(0, idx)], dash: DASHES[Math.max(0, idx)], runs, label: null };
  });

  // Direct labels at the last drawn point of each series, spread so they never overlap.
  const ends = series.map(s => s.runs.at(-1)?.points.at(-1) ?? null);
  const spread = spreadLabels(ends.map(p => p?.y ?? 0), 14);
  series.forEach((s, i) => { const p = ends[i]; if (p) s.label = { x: p.x + 12, y: spread[i] }; });

  return {
    w: CHART.w, h: CHART.h, plot,
    band: { x0: x(3) - 0.62 * unit, x1: x(3) + 0.62 * unit },
    ticks: ticks.map(v => ({ value: v, y: y(v) })),
    xTicks: I4_TIMEPOINTS.map(tp => ({ timepoint: tp, x: x(SLOT[tp]), part: pre.has(tp) ? 'pre' : 'post' })),
    series,
  };
}

export function markerPath(shape: MarkerShape, cx: number, cy: number, r = 5): string {
  switch (shape) {
    case 'square': return `M${cx - r} ${cy - r}h${2 * r}v${2 * r}h${-2 * r}z`;
    case 'triangle': return `M${cx} ${cy - r - 1}L${cx + r + 1} ${cy + r}H${cx - r - 1}z`;
    case 'diamond': return `M${cx} ${cy - r - 1}L${cx + r + 1} ${cy}L${cx} ${cy + r + 1}L${cx - r - 1} ${cy}z`;
    default: return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
  }
}
