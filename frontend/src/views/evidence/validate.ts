// Runtime validation of the evidence inputs. A file that is absent or invalid never produces curves or values (04 §4.5, 05 §3).
import type { I4Analyte, I4Labs, SleepAggregate, TepcWindow, Text } from './evidenceTypes';
import { I4_ANALYTE_IDS, I4_EXPECTED, I4_SUBJECTS, I4_TIMEPOINTS, I4_TRANSFORMATIONS, SLEEP_GROUP_IDS } from './evidenceTypes';

export type FailureCode = 'shape' | 'incomplete' | 'duplicate' | 'unit' | 'value' | 'unexpected' | 'order' | 'window';
export type Validation<T> = { ok: true; data: T } | { ok: false; code: FailureCode; detail: string };

const fail = (code: FailureCode, detail = ''): { ok: false; code: FailureCode; detail: string } => ({ ok: false, code, detail });
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const sameList = (a: unknown, b: readonly string[]) => Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i]);
const isText = (v: unknown): v is Text => isObj(v) && isStr(v.en) && isStr(v.es);
const onlyKeys = (o: Record<string, unknown>, keys: readonly string[]) => Object.keys(o).find(k => !keys.includes(k));

// ---------------------------------------------------------------- Inspiration4 labs (04 §4.6)
/** 4 codes x 5 analytes x 7 timepoints = 140: exactly one record each, expected unit, numeric value or null. Nothing is filled in. */
export function validateI4Labs(input: unknown): Validation<I4Labs> {
  if (!isObj(input)) return fail('shape', 'root');
  if (!sameList(input.sourceIds, ['osdr-osd-575', 'osdr-osd-569'])) return fail('shape', 'sourceIds');
  if (!isStr(input.accessedAt)) return fail('shape', 'accessedAt');
  if (!Array.isArray(input.rawFiles) || input.rawFiles.some(f => !isObj(f) || !isStr(f.name) || !isStr(f.url) || !isStr(f.sha256))) return fail('shape', 'rawFiles');
  if (!isObj(input.flight) || !isStr(input.flight.start) || !isStr(input.flight.end)) return fail('shape', 'flight');
  if (!sameList(input.timepoints, I4_TIMEPOINTS)) return fail('shape', 'timepoints');
  if (!sameList(input.subjects, I4_SUBJECTS)) return fail('shape', 'subjects');
  if (!Array.isArray(input.transformations) || input.transformations.some(k => !(I4_TRANSFORMATIONS as readonly unknown[]).includes(k))) return fail('shape', 'transformations');
  if (!Array.isArray(input.analytes)) return fail('shape', 'analytes');
  const seen = new Set<string>();
  for (const a of input.analytes) {
    if (!isObj(a) || !(I4_ANALYTE_IDS as readonly unknown[]).includes(a.id)) return fail('shape', 'analyte id');
    const id = a.id as keyof typeof I4_EXPECTED;
    if (seen.has(id)) return fail('duplicate', id);
    seen.add(id);
    const extraKey = onlyKeys(a, ['id', 'sourceAnalytes', 'unit', 'panel', 'values']);
    if (extraKey) return fail('unexpected', `${id} · ${extraKey}`);
    if (a.unit !== I4_EXPECTED[id].unit || a.panel !== I4_EXPECTED[id].panel) return fail('unit', `${id} · ${String(a.unit)}`);
    if (!Array.isArray(a.sourceAnalytes) || !a.sourceAnalytes.every(isStr)) return fail('shape', `${id} · sourceAnalytes`);
    if (!Array.isArray(a.values)) return fail('shape', `${id} · values`);
    const cell = new Set<string>();
    for (const v of a.values) {
      if (!isObj(v)) return fail('shape', `${id} · value`);
      const extra = onlyKeys(v, ['subject', 'timepoint', 'value']);
      if (extra) return fail('unexpected', `${id} · ${extra}`); // e.g. sex or reference ranges must not come through
      if (!(I4_SUBJECTS as readonly unknown[]).includes(v.subject) || !(I4_TIMEPOINTS as readonly unknown[]).includes(v.timepoint)) return fail('unexpected', `${id} · ${String(v.subject)} · ${String(v.timepoint)}`);
      if (v.value !== null && !isNum(v.value)) return fail('value', `${String(v.subject)} · ${id} · ${String(v.timepoint)}`);
      const key = `${v.subject}|${v.timepoint}`;
      if (cell.has(key)) return fail('duplicate', `${String(v.subject)} · ${id} · ${String(v.timepoint)}`);
      cell.add(key);
    }
    for (const s of I4_SUBJECTS) for (const tp of I4_TIMEPOINTS) {
      if (!cell.has(`${s}|${tp}`)) return fail('incomplete', `${s} · ${id} · ${tp}`);
    }
  }
  for (const id of I4_ANALYTE_IDS) if (!seen.has(id)) return fail('incomplete', id);
  return { ok: true, data: input as unknown as I4Labs };
}

export const labValue = (a: I4Analyte, subject: string, timepoint: string): number | null =>
  a.values.find(v => v.subject === subject && v.timepoint === timepoint)?.value ?? null;

/** Every null, listed rather than hidden. */
export const labNulls = (d: I4Labs) => d.analytes.flatMap(a => a.values.filter(v => v.value === null).map(v => ({ analyte: a.id, subject: v.subject, timepoint: v.timepoint })));

// ---------------------------------------------------------------- TEPC DOSE (04 §6)
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const ms = (iso: string) => Date.parse(iso);

export function validateTepc(input: unknown): Validation<TepcWindow> {
  if (!isObj(input)) return fail('shape', 'root');
  if (input.sourceId !== 'cdaweb-iss-tepc') return fail('shape', 'sourceId');
  if (!isStr(input.accessedAt)) return fail('shape', 'accessedAt');
  if (input.unit !== 'uGy/min') return fail('unit', String(input.unit));
  if (!isNum(input.cadenceMin) || input.cadenceMin <= 0) return fail('shape', 'cadenceMin');
  if (input.rawFile !== undefined && (!isObj(input.rawFile) || !isStr(input.rawFile.name) || !isStr(input.rawFile.url) || !isStr(input.rawFile.sha256))) return fail('shape', 'rawFile');
  const w = input.window;
  if (!isObj(w) || !isStr(w.start) || !isStr(w.end) || !ISO_UTC.test(w.start) || !ISO_UTC.test(w.end) || ms(w.start) >= ms(w.end)) return fail('window', 'window');
  if (!Array.isArray(input.points) || input.points.length === 0) return fail('incomplete', 'points');
  let prev = -Infinity;
  for (const p of input.points) {
    if (!isObj(p) || !isStr(p.t) || !ISO_UTC.test(p.t)) return fail('shape', 'point');
    const extra = onlyKeys(p, ['t', 'dose']);
    if (extra) return fail('unexpected', extra);
    const t = ms(p.t);
    if (t === prev) return fail('duplicate', p.t);
    if (t < prev) return fail('order', p.t);
    if (t < ms(w.start) || t > ms(w.end)) return fail('window', p.t);
    prev = t;
    if (p.dose !== null && (!isNum(p.dose) || p.dose < 0)) return fail('value', p.t); // fill values and negatives are rejected, not mapped
  }
  return { ok: true, data: input as unknown as TepcWindow };
}

export interface TepcGap { startMs: number; endMs: number; minutes: number; kind: 'missing' | 'null' }
export interface TepcSummary { rows: number; withValue: number; expected: number; gaps: TepcGap[]; min: number | null; max: number | null }

/** Gaps are intervals with no row for more than 1.5x the nominal cadence, plus rows whose value is null. Never interpolated. */
export function tepcSummary(d: TepcWindow): TepcSummary {
  const step = d.cadenceMin * 60_000;
  const start = ms(d.window.start), end = ms(d.window.end);
  const gaps: TepcGap[] = [];
  const add = (startMs: number, endMs: number, kind: TepcGap['kind']) => gaps.push({ startMs, endMs, minutes: Math.round((endMs - startMs) / 60_000), kind });
  let prev = start;
  d.points.forEach((p, i) => {
    const t = ms(p.t);
    if (t - prev > 1.5 * step) add(prev, t, 'missing');
    if (p.dose === null) add(t, t + step, 'null');
    prev = t;
    if (i === d.points.length - 1 && end - t > 1.5 * step) add(t, end, 'missing');
  });
  const values = d.points.map(p => p.dose).filter((v): v is number => v !== null);
  return {
    rows: d.points.length, withValue: values.length, expected: Math.round((end - start) / step),
    gaps, min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null,
  };
}

// ---------------------------------------------------------------- Sleep aggregate (04 §7)
export function validateSleep(input: unknown): Validation<SleepAggregate> {
  if (!isObj(input)) return fail('shape', 'root');
  if (input.sourceId !== 'barger-2014') return fail('shape', 'sourceId');
  if (!isStr(input.accessedAt)) return fail('shape', 'accessedAt');
  const c = input.citation;
  if (!isObj(c) || !isStr(c.authors) || !isStr(c.title) || !isStr(c.journal) || !isNum(c.year) || !isStr(c.volume) || !isStr(c.pages) || !isStr(c.doi)) return fail('shape', 'citation');
  if (!isText(input.population) || !isText(input.method)) return fail('shape', 'text');
  const n = input.counts;
  if (!isObj(n) || !isNum(n.astronauts) || n.astronauts <= 0 || !isNum(n.missions) || n.missions <= 0 || (n.inflightDays !== null && (!isNum(n.inflightDays) || n.inflightDays <= 0))) return fail('shape', 'counts');
  if (!Array.isArray(input.groups) || input.groups.length === 0) return fail('incomplete', 'groups');
  const ids = new Set<string>();
  for (const g of input.groups) {
    if (!isObj(g) || !(SLEEP_GROUP_IDS as readonly unknown[]).includes(g.id)) return fail('shape', 'group id');
    const extra = onlyKeys(g, ['id', 'hoursObtained', 'sd']);
    if (extra) return fail('unexpected', extra);
    if (ids.has(g.id as string)) return fail('duplicate', String(g.id));
    ids.add(g.id as string);
    if (!isNum(g.hoursObtained) || g.hoursObtained < 0 || g.hoursObtained > 24) return fail('value', String(g.id));
    if (g.sd !== null && (!isNum(g.sd) || g.sd < 0)) return fail('value', `${String(g.id)} · sd`);
  }
  const h = input.hypnotics;
  if (h !== undefined && (!isObj(h) || !isNum(h.users) || !isNum(h.of) || h.users < 0 || h.of <= 0 || h.users > h.of)) return fail('value', 'hypnotics');
  return { ok: true, data: input as unknown as SleepAggregate };
}

// ---------------------------------------------------------------- Loading state shared by the views
export type Loaded<T> = { state: 'ok'; data: T } | { state: 'absent' } | { state: 'failed'; code: FailureCode; detail: string };

/** `undefined` or `null` means the file was never loaded; anything else must validate. */
export function load<T>(raw: unknown, validate: (input: unknown) => Validation<T>): Loaded<T> {
  if (raw === undefined || raw === null) return { state: 'absent' };
  const v = validate(raw);
  return v.ok ? { state: 'ok', data: v.data } : { state: 'failed', code: v.code, detail: v.detail };
}
