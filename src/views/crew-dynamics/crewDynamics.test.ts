import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CREW, DAY_START, DAY_END, freshPreview } from '../../demo/fd30';
import { PLAN_FD30 } from '../../demo/fd30Plan';
import { I18nProvider } from '../../i18n/I18nProvider';
import { CrewDynamics } from './CrewDynamics';
import { crewDynamics, crewIntervals, crewSlots, crewTotals } from './crewDynamics';
import type { CrewSlot, CrewViewer } from './crewDynamics';

const [lucia, tomas, mei] = CREW.map(c => c.id);
const at = (hour: number) => DAY_START + hour * 3_600_000;
const slot = (id: string, owner: CrewSlot['owner'], start: number, end: number, rest = false): CrewSlot => ({ id, owner, start: at(start), end: at(end), rest });
const render = (viewer: CrewViewer, locale: 'en' | 'es' = 'es', initialRange: 7 | 30 = 7) => renderToStaticMarkup(createElement(I18nProvider, { locale,
  children: createElement(CrewDynamics, { state: freshPreview(0, 1), viewer, initialRange }) }));

describe('CAT04 interval semantics', () => {
  it('counts a triple overlap once per person and computes non-overlap independently', () => {
    const rows = crewIntervals([slot('a', lucia, 8, 12), slot('b', tomas, 9, 11), slot('c', mei, 9, 11)]);
    expect(crewTotals(rows, lucia)).toMatchObject({ planned: 240, overlap: 120, withoutOverlap: 120, shared: 0 });
    expect(crewTotals(rows, tomas)).toMatchObject({ planned: 120, overlap: 120, withoutOverlap: 0 });
    expect(crewTotals(rows, mei)).toMatchObject({ planned: 120, overlap: 120, withoutOverlap: 0 });
    expect(rows.every(r => !r.sharedWith.length)).toBe(true);
  });
  it('uses explicit block membership, not equal titles, kind or times; preserves a third-person coincidence', () => {
    const rows = crewIntervals([slot('shared', lucia, 14, 16), slot('shared', tomas, 14, 16), slot('independent', mei, 14, 16)]);
    expect(rows.find(r => r.owner === lucia)).toMatchObject({ sharedWith: [tomas], simultaneousWith: [mei] });
    expect(rows.find(r => r.owner === mei)).toMatchObject({ sharedWith: [], simultaneousWith: [lucia, tomas] });
    expect(crewTotals(rows, lucia).shared).toBe(120);
  });
  it('unions duplicate own intervals, excludes gaps, and treats adjacent endpoints as non-overlapping', () => {
    const input = [slot('a', lucia, 8, 10), slot('duplicate', lucia, 9, 10), slot('b', tomas, 10, 11), slot('c', lucia, 12, 13)];
    const before = JSON.stringify(input);
    expect(crewTotals(crewIntervals(input), lucia)).toMatchObject({ planned: 180, overlap: 0, withoutOverlap: 180 });
    expect(JSON.stringify(input)).toBe(before);
    expect(crewIntervals([])).toEqual([]);
    expect(crewIntervals([{ ...input[0], end: NaN }])).toEqual([]);
  });
  it('clips actual FD30 rest, retains explicit maintenance, and never marks separate dinner reservations shared', () => {
    const slots = crewSlots(), rows = crewIntervals(slots);
    expect(slots.every(b => b.start >= DAY_START && b.end <= DAY_END)).toBe(true);
    for (const owner of [lucia, tomas]) {
      const maintenance = rows.filter(r => r.owner === owner && r.start >= at(14) && r.end <= at(16));
      expect(maintenance.reduce((sum, r) => sum + (r.end - r.start) / 60_000, 0)).toBe(120);
      expect(maintenance.every(r => r.sharedWith.includes(owner === lucia ? tomas : lucia))).toBe(true);
    }
    const dinner = rows.filter(r => r.start === at(18));
    expect(dinner).toHaveLength(3);
    expect(dinner.every(r => !r.sharedWith.length && r.simultaneousWith.length === 2)).toBe(true);
    expect(crewTotals(rows, lucia).rest).toBe(510); // 00–06 plus 21:30–24, plan only
    expect(JSON.stringify(slots)).not.toMatch(/title|equipment|kind|sample|measurement/);
  });
});
describe('CAT04 permissions, ranges and rendering', () => {
  it('checks active onboard owner and rejects unknown ground roles', () => {
    const state = freshPreview(0, 1);
    for (const c of CREW) {
      expect(crewDynamics({ ...state, activeCrewId: c.id }, { perspective: 'onboard', owner: c.id }, 7)).not.toBeNull();
    }
    expect(crewDynamics(state, { perspective: 'onboard', owner: tomas }, 7)).toBeNull();
    expect(crewDynamics(state, { perspective: 'ground', role: 'invalid' as never }, 7)).toBeNull();
  });
  it('gives Ops and Medical identical projected rows and markup', () => {
    const state = freshPreview(0, 1);
    const ops = { perspective: 'ground', role: 'mission_operator' } as const;
    const med = { perspective: 'ground', role: 'medical_professional' } as const;
    expect(crewDynamics(state, ops, 7)).toEqual(crewDynamics(state, med, 7));
    expect(render(ops)).toBe(render(med));
    expect(render(ops)).not.toContain('Mi parte');
  });
  it('changes only window coverage, with no new plan, clock, profile or record writes', () => {
    const state = freshPreview(0, 1), before = JSON.stringify({ state, plan: PLAN_FD30 });
    const viewer = { perspective: 'onboard', owner: lucia } as const;
    const seven = crewDynamics(state, viewer, 7)!, thirty = crewDynamics(state, viewer, 30)!;
    expect(seven.firstFd).toBe(24); expect(thirty.firstFd).toBe(1);
    expect(seven.rows).toEqual(thirty.rows);
    expect(render(viewer).match(/data-crew-day=/g)).toHaveLength(7);
    expect(render(viewer, 'es', 30).match(/data-crew-day=/g)).toHaveLength(30);
    expect(JSON.stringify({ state, plan: PLAN_FD30 })).toBe(before);
  });
  it('renders bilingual neutral labels, provenance and disclaimers without private activity details', () => {
    for (const locale of ['en', 'es'] as const) {
      const html = render({ perspective: 'onboard', owner: lucia }, locale);
      for (const c of CREW) expect(html).toContain(c.name);
      expect(html).toContain('fd30-plan.2'); expect(html).toContain('24:00');
      expect(html).toContain(locale === 'es' ? 'Actividad compartida' : 'Shared activity');
      expect(html).toContain(locale === 'es' ? 'Programados al mismo tiempo' : 'Scheduled at the same time');
      expect(html).toContain(locale === 'es' ? 'Descanso planificado' : 'Planned rest');
      expect(html).toContain(locale === 'es' ? 'Sin plan disponible' : 'No plan available');
      expect(html).not.toMatch(/Toma de sangre|Blood collection|orina|urine|Payload|carga útil|Ergometer|Ergómetro|Sample processing|medical_summary|heartRate|<a /);
      expect(html).toContain('<caption>'); expect(html).toContain('scope="row"');
    }
  });
});
