// CAT08: pure content of the 14 detail dialogs. Every section says its class (FD30 data, historical evidence, context).
// On board it reads only the ACTIVE profile through the existing selectors; on Ground only the allowlisted operational projection
// (`groundView`) for the active role. No thresholds, alerts, diagnoses or invented figures. Nothing is written or sent.
import { fmtClock, fmtNumber } from '../../i18n/format';
import type { Locale } from '../../state/types';
import { CREW } from '../../demo/fd30';
import type { CrewId } from '../../demo/fd30';
import { exerciseSessionView } from '../../demo/exerciseSession';
import { exerciseHistory } from '../../demo/history/exercise';
import { laboratoryHistory } from '../../demo/history/laboratory';
import { labPlanSlots } from '../../demo/laboratory';
import { PLAN_SOURCE, PLAN_VERSION, planFor } from '../../demo/fd30Plan';
import { crewDynamics, crewTotals } from '../crew-dynamics/crewDynamics';
import { groundView } from '../fd30-ops/opsSelectors';
import { meanOfReadings } from '../today/todayMetrics';
import { EVIDENCE_DATA } from '../evidence/evidenceData';
import { EVIDENCE_SOURCES } from '../evidence/evidenceSources';
import { buildRadChart, RCHART_COMPACT } from '../evidence/radiationChart';
import type { RadChart } from '../evidence/radiationChart';
import { I4_SUBJECTS, I4_TIMEPOINTS, I4_EXPECTED } from '../evidence/evidenceTypes';
import { SLOT } from '../evidence/labsChart';
import { labValue, load, tepcSummary, validateI4Labs, validateTepc } from '../evidence/validate';
import { CATALOG_SOURCES } from './catalogSources';
import { MODAL_COPY, MODAL_UI } from './catalogModalText';
import type { ModalMessages } from './catalogModalText';
import type { CatalogData, CatalogModule, CatalogProps } from './catalogTypes';

export type SectionClass = 'fd30' | 'evidence' | 'context';
export interface BarSlot { key: string; fd: number; value: number | null; label: string; current: boolean }
export type ModalChart =
  | { kind: 'bars'; slots: BarSlot[]; max: number; caption: string }
  | { kind: 'radiation'; chart: RadChart; caption: string; label: string; unit: string }
  | { kind: 'strip'; points: { key: string; x: number; y: number }[]; caption: string; w: number; h: number };
export interface ModalSection { cls: SectionClass; title: string; lines: string[]; items: string[]; table?: { head: string[]; rows: string[][] }; chart?: ModalChart }
export interface ModalContent {
  id: CatalogModule['id']; title: string; first: string; scope: string; sections: ModalSection[]; why: string; missing: string[];
  source: { title: string; publisher: string; url: string; status: string; extras: { title: string; url: string }[] };
  action: { href: string; label: string } | null;
  /** MSK03: optional second link (MOD-MSK onboard only: the Agenda). Same style and behavior as `action`. */
  secondary?: { href: string; label: string } | null;
}

interface Ctx { locale: Locale; ui: ModalMessages; module: CatalogModule; props: CatalogProps }
const section = (cls: SectionClass, title: string, part: Partial<Pick<ModalSection, 'lines' | 'items' | 'table' | 'chart'>> = {}): ModalSection => ({ cls, title, lines: [], items: [], ...part });

/** The active profile's data, only when the host passes the ACTIVE owner. Never another profile. */
function own(c: Ctx): (CatalogData & { owner: CrewId }) | null {
  const { props } = c;
  return props.perspective === 'onboard' && props.data && props.data.owner === props.data.state.activeCrewId ? props.data : null;
}
/** The operational projection for the ACTIVE Ground role, or null if the role gets none (selector decides). */
function ground(c: Ctx) {
  const { props } = c;
  if (props.perspective !== 'ground' || !props.data) return null;
  return groundView(props.data.state, props.role, props.data.time);
}
const hhmm = (iso: string) => iso.slice(11, 16);
const interval = (start: string, end: string) => `${hhmm(start)}–${end.startsWith('2027-03-11T00:00') ? '24:00' : hhmm(end)} UTC`;

/** Seven-day bars on the shared FD axis. A day without a session is an explicit gap, never a zero bar. */
function sessionBars(c: Ctx, d: CatalogData & { owner: CrewId }): { chart: ModalChart; count: number } | null {
  const view = exerciseHistory(d.state, { perspective: 'onboard', owner: d.owner }, d.time, 'last7');
  if (!view) return null;
  const nf = new Intl.NumberFormat(c.locale);
  const slots: BarSlot[] = view.days.map(day => {
    const total = day.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    return { key: `fd${day.fd}`, fd: day.fd, value: total || null, current: day.fd === view.currentFd,
      label: `FD${String(day.fd).padStart(2, '0')} · ${total ? `${nf.format(Math.round(total))} ${c.ui.minutes}` : c.ui.noSessions}` };
  });
  return { chart: { kind: 'bars', slots, max: Math.max(60, ...slots.map(s => s.value ?? 0)), caption: c.ui.sessions7 }, count: view.records.length };
}

function radiation(c: Ctx): { sections: ModalSection[] } {
  const ui = c.ui;
  const result = load(EVIDENCE_DATA.radiation, validateTepc);
  if (result.state !== 'ok') return { sections: [section('evidence', ui.radTitle, { lines: [ui.radNoData] })] };
  const d = result.data, s = tepcSummary(d), chart = buildRadChart(d, RCHART_COMPACT);
  const stamp = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
  const num = (v: number | null) => v === null ? '—' : fmtNumber(v, c.locale, 3);
  const lines = [ui.radNotPersonal];
  const items = [`${ui.radPeriod}: ${stamp(Date.parse(d.window.start))} → ${stamp(Date.parse(d.window.end))}`, `${ui.radUnit}: ${ui.radUnitValue}`,
    `${ui.radRows}: ${fmtNumber(s.withValue, c.locale, 0)} / ${fmtNumber(s.expected, c.locale, 0)}`, `${ui.radMin}: ${num(s.min)} µGy/min`, `${ui.radMax}: ${num(s.max)} µGy/min`,
    ...s.gaps.map(g => `${ui.radGap}: ${ui.radGapLine(g.minutes, stamp(g.startMs), stamp(g.endMs))}`)];
  return { sections: [section('evidence', ui.radTitle, { lines, items, chart: { kind: 'radiation', chart, caption: ui.radChartLabel, label: ui.radChartLabel, unit: 'µGy/min' } })] };
}

function immuneEvidence(c: Ctx): ModalSection | null {
  const result = load(EVIDENCE_DATA.labs, validateI4Labs);
  if (result.state !== 'ok') return null;
  const a = result.data.analytes.find(x => x.id === 'wbc');
  if (!a) return null;
  const unit = I4_EXPECTED.wbc.display, values: { s: string; tp: string; v: number }[] = [];
  for (const s of I4_SUBJECTS) for (const tp of I4_TIMEPOINTS) { const v = labValue(a, s, tp); if (v !== null) values.push({ s, tp, v }); }
  if (!values.length) return null;
  const lo = Math.min(...values.map(v => v.v)), hi = Math.max(...values.map(v => v.v));
  const w = 320, h = 70, y = (v: number) => hi === lo ? h / 2 : h - 8 - ((v - lo) / (hi - lo)) * (h - 16), x = (slot: number) => 14 + slot * ((w - 28) / 7);
  const points = values.map(v => ({ key: `${v.s}-${v.tp}`, x: x(SLOT[v.tp]), y: y(v.v) }));
  const nf = (v: number) => fmtNumber(v, c.locale, 1);
  return section('evidence', `${c.ui.otherCrew} · ${c.ui.wbc}`, { lines: [c.ui.wbcLine(nf(lo), nf(hi), unit, values.length)],
    chart: { kind: 'strip', points, caption: `${c.ui.wbc} (${unit})`, w, h } });
}

/** Content of one card's dialog. */
export function buildModal(module: CatalogModule, props: CatalogProps, locale: Locale): ModalContent {
  const ui = MODAL_UI[locale], c: Ctx = { locale, ui, module, props };
  const copy = MODAL_COPY[module.id], sections: ModalSection[] = [];
  const mine = own(c), view = ground(c);
  const onboard = props.perspective === 'onboard';
  let action: ModalContent['action'] = null;
  let secondary: ModalContent['secondary'] = null;
  const scope = onboard ? ui.scopeOnboard : props.role === 'mission_operator' ? ui.scopeOperator : ui.scopeMedical;
  const registryLine = onboard ? module.onboard[locale] : props.role === 'mission_operator' ? module.ground?.operational[locale] : module.ground?.medical[locale];
  const crewName = (id: CrewId) => CREW.find(x => x.id === id)!.name;
  const groundBlocks = (kind: string) => view ? view.crew.flatMap(p => p.blocks.filter(b => String(b.kind) === kind).map(b => ({ name: p.name, block: b }))) : [];
  const mediconsent = !onboard && props.role === 'medical_professional' ? section('fd30', ui.classes.fd30, { lines: [ui.noMedicalSummaries] }) : null;

  switch (module.id) {
    case 'MOD-CARDIO': {
      if (mine) {
        const live = exerciseSessionView(mine.state, mine.owner, mine.time);
        const lines: string[] = [];
        if (live.phase === 'live') lines.push(live.current?.pulse_bpm != null ? `${ui.pulseNow}: ${fmtNumber(live.current.pulse_bpm, locale, 0)} bpm` : ui.noReading);
        else if (live.phase === 'completed' && live.session?.finish) {
          const end = Date.parse(live.session.finish.occurredAt), mean = meanOfReadings(live.points.filter(p => Date.parse(p.occurredAt) < end).map(p => p.pulse_bpm));
          lines.push(mean ? `${ui.pulseMean}: ${fmtNumber(mean.mean, locale, 0)} bpm · ${ui.readings(mean.count)}` : ui.noReading);
        } else lines.push(ui.noPulse);
        if (live.phase !== 'planned') lines.push(ui.simulatedPulse);
        sections.push(section('fd30', ui.classes.fd30, { lines }));
        action = { href: '#/onboard/personal/exercise', label: ui.openExercise };
      } else if (view) {
        sections.push(section('fd30', ui.classes.fd30, { lines: [`${ui.medicalSlots}: ${groundBlocks('medical').length || ui.none}`], items: [] }));
        if (mediconsent) sections.push(mediconsent);
      }
      break;
    }
    case 'MOD-MSK': {
      if (mine) {
        const bars = sessionBars(c, mine);
        if (bars) sections.push(section('fd30', ui.classes.fd30, { lines: [ui.sessionsCount(bars.count, 7)], chart: bars.chart }));
        action = { href: '#/onboard/personal/exercise', label: ui.openExercise };
        // MSK03: the profile's own planned muscle assessment, read from the plan (no copied schedule). It stays "scheduled": no event exists, so
        // the clock never turns it into a done assessment, a result or an Exercise session.
        const assessments = planFor(mine.owner).filter(b => b.kind === 'muscle-assessment');
        if (assessments.length) {
          sections.push(section('fd30', `${ui.classes.fd30} · ${ui.muscleTitle}`, { lines: [ui.muscleNote], items: assessments.map(b => `${b.title[locale]} · ${interval(b.start, b.end)}`) }));
          secondary = { href: '#/onboard/personal/agenda', label: ui.openAgenda };
        }
      } else if (view) {
        const rows = view.crew.flatMap(p => p.blocks.filter(b => b.equipment).map(b => [p.name, `${b.equipment![locale]} · ${interval(b.start, b.end)}`]));
        sections.push(section('fd30', `${ui.classes.fd30} · ${ui.reservations}`, { lines: [ui.notAttendance], ...(rows.length ? { table: { head: [ui.planned, ui.reservations], rows } } : { items: [ui.noReservations] }) }));
        if (mediconsent) sections.push(mediconsent);
      }
      break;
    }
    case 'MOD-NUTR': {
      if (mine) {
        const meals = planFor(mine.owner).filter(b => b.kind === 'meal');
        sections.push(section('fd30', `${ui.classes.fd30} · ${ui.meals}`, { lines: [ui.notIntake], ...(meals.length ? { items: meals.map(b => `${b.title[locale]} · ${interval(b.start, b.end)}`) } : { items: [ui.noMeals] }) }));
        action = { href: '#/onboard/personal/agenda', label: ui.openAgenda };
      } else if (view) {
        const meals = groundBlocks('meal');
        sections.push(section('fd30', `${ui.classes.fd30} · ${ui.mealWindows}`, { lines: [ui.notIntake], ...(meals.length ? { table: { head: [ui.planned, ui.mealWindows], rows: meals.map(m => [m.name, interval(m.block.start, m.block.end)]) } } : { items: [ui.noMeals] }) }));
        if (mediconsent) sections.push(mediconsent);
        action = { href: '#/demo/fd30/ground/agenda', label: ui.openGroundAgenda };
      }
      break;
    }
    case 'MOD-IMMUNE': {
      if (mine) {
        const hist = laboratoryHistory(mine.state, { perspective: 'onboard', owner: mine.owner }, mine.time, 'all');
        const rows = hist?.records.map(r => `${ui.sample[r.sample.sampleType]} · ${ui.stage[r.stage as keyof typeof ui.stage]}`) ?? [];
        const plans = labPlanSlots(mine.owner).filter(p => !hist?.records.some(r => r.sample.id === p.sampleId)).map(p => `${ui.plannedCollection} · ${ui.sample[p.sampleType]} · ${hhmm(p.start)} UTC`);
        const items = [...rows, ...plans];
        sections.push(section('fd30', `${ui.classes.fd30} · ${ui.ownSamples}`, { lines: [ui.noValues], items: items.length ? items : [ui.noSamples] }));
        action = { href: '#/onboard/personal/laboratory', label: ui.openLab };
      } else if (mediconsent) sections.push(mediconsent);
      const evidence = immuneEvidence(c); if (evidence) sections.push(evidence);
      if (!action && !onboard) action = { href: '#/demo/fd30/ground/evidence', label: ui.openEvidenceLabs };
      else if (!action) action = { href: '#/onboard/personal/evidence', label: ui.openEvidenceLabs };
      break;
    }
    case 'MOD-CREW': {
      const model = props.data ? crewDynamics(props.data.state, props.perspective === 'onboard' ? { perspective: 'onboard', owner: props.data.owner } : { perspective: 'ground', role: props.role }, 7) : null;
      if (model) {
        const ids = props.perspective === 'onboard' ? [props.data!.owner] : CREW.map(x => x.id);
        const rows = ids.map(id => { const t = crewTotals(model.rows, id); return [crewName(id), `${t.planned}`, `${t.shared}`, `${t.withoutOverlap}`, `${t.rest}`]; });
        sections.push(section('fd30', `${ui.classes.fd30} · ${ui.crewTotals}`, { lines: [ui.notAttendance], table: { head: [ui.planned, `${ui.crewPlanned} (${ui.minutes})`, `${ui.crewShared} (${ui.minutes})`, `${ui.crewAlone} (${ui.minutes})`, `${ui.crewRest} (${ui.minutes})`], rows } }));
        if (mediconsent) sections.push(mediconsent);
        action = { href: onboard ? '#/onboard/personal/m/crew' : '#/demo/fd30/ground/m/crew', label: ui.openCrew };
      }
      break;
    }
    case 'MOD-AUTONOMY': {
      if (view) {
        const total = view.crew.reduce((n, p) => n + p.blocks.length, 0);
        sections.push(section('fd30', ui.classes.fd30, { items: [`${ui.planVersion}: ${PLAN_VERSION} · ${PLAN_SOURCE}`, `${ui.planBlocks}: ${total}`], lines: [ui.autonomyNote] }));
        if (mediconsent) sections.push(mediconsent);
      } else if (mine) {
        const own = planFor(mine.owner).length;
        sections.push(section('fd30', ui.classes.fd30, { items: [`${ui.planVersion}: ${PLAN_VERSION} · ${PLAN_SOURCE}`, `${ui.planBlocks}: ${own}`], lines: [ui.autonomyNote] }));
        action = { href: '#/onboard/personal/agenda', label: ui.openAgenda };
      }
      break;
    }
    case 'MOD-MED': {
      if (view) {
        sections.push(section('fd30', ui.classes.fd30, { lines: [`${ui.medicalSlots}: ${groundBlocks('medical').length || ui.none}`] }));
        if (mediconsent) sections.push(mediconsent);
      }
      break;
    }
    case 'MOD-RAD': {
      sections.push(...radiation(c).sections);
      action = { href: onboard ? '#/onboard/personal/evidence/radiation' : '#/demo/fd30/ground/evidence/radiation', label: ui.openRadiation };
      break;
    }
    case 'MOD-EVA': {
      // CAT09: context from OCHMO-TB-037 Rev D only. No FD30 data, schedule, threshold or operating instruction.
      sections.push(section('context', ui.evaTitle, { lines: [ui.evaLine1, ui.evaLine2, ui.evaLine3], items: [ui.evaCabin, ui.evaSuit] }));
      break;
    }
    case 'MOD-MICRO': {
      // CAT09: sample counts of two different public OSDR studies (read from their metadata). Not contamination levels, not FD30 data.
      sections.push(section('evidence', ui.microTitle, { lines: [ui.microLine], table: { head: [...ui.microHead], rows: ui.microRows.map(r => [...r]) } }));
      break;
    }
    default: break; // SANS, SENSORI, COG, LOADS: context only, no FD30 data exists.
  }
  const b = module.backing, source = CATALOG_SOURCES[b.sourceId];
  const radSource = module.id === 'MOD-RAD' ? EVIDENCE_SOURCES.find(s => s.id === 'cdaweb-iss-tepc') : undefined;
  const extraIds = module.id === 'MOD-EVA' ? ['ochmo-tb-037' as const] : module.id === 'MOD-MICRO' ? ['osdr-osd-65' as const, 'osdr-osd-252' as const] : [];
  const extras = [...(radSource ? [{ title: `${radSource.title} · ${radSource.publisher}`, url: radSource.url }] : []),
    ...extraIds.map(id => ({ title: `${CATALOG_SOURCES[id].title} · ${CATALOG_SOURCES[id].publisher}`, url: CATALOG_SOURCES[id].url }))];
  const contextLines = [registryLine, module.notBuilt[locale]].filter((x): x is string => !!x);
  sections.push(section('context', ui.classes.context, { lines: contextLines, items: b.kind === 'risk' ? b.risks.map(r => r[locale]) : [b.topic[locale]] }));
  return {
    id: module.id, title: module.title[locale], first: copy.first[locale], scope: sections.some(x => x.cls === 'fd30') ? scope : ui.scopeContext, sections, why: copy.why[locale], missing: module.dataNeeds.map(d => d[locale]),
    source: { title: source.title, publisher: source.publisher, url: source.url, status: source.status, extras },
    action, secondary,
  };
}
export { fmtClock };
