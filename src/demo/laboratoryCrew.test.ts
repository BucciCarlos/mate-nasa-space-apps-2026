import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n/I18nProvider';
import { FD30_CHAT_TEXT } from '../i18n/fd30Chat';
import { fd30En, fd30Es } from '../i18n/fd30';
import { DAY_EVENTS, dataOwner, OWNER, freshPreview, latestNews, previewReduce, projectDomain, receivedPersonalEvents } from './fd30';
import type { CrewId } from './fd30';
import { scriptedAnswer } from './fd30Chat';
import { PLAN_FD30, planFor, validatePlan } from './fd30Plan';
import { scheduleBlockView } from './fd30Schedule';
import { laboratoryHistory } from './history/laboratory';
import { CREW_LAB_EVENTS, HISTORICAL_BLOOD_SAMPLE, LAB_EVENTS, LAB_PLANS, MO_URINE_SAMPLE, TI_BLOOD_SAMPLE, URINE_SAMPLE, BLOOD_SAMPLE, labEvents, labPlanSlots, labSamples } from './laboratory';
import { LaboratoryDetail } from './LaboratoryDetail';
import { TodaySummary } from '../views/today/TodaySummary';
import { freshOps } from '../views/fd30-ops/opsState';
import { operationalPlan } from '../views/fd30-ops/opsSelectors';

const TI = 'iss:crew-ti' as const, MO = 'iss:crew-mo' as const;
const at = (hhmm: string) => Date.parse(`2027-03-10T${hhmm}:00Z`);
const wall = 1000;
const seek = (s: ReturnType<typeof freshPreview>, hhmm: string) => previewReduce(s, { type: 'seek', target: at(hhmm), now: wall });
const as = (s: ReturnType<typeof freshPreview>, crew: CrewId) => previewReduce(s, { type: 'select', crewId: crew });
const at0 = (hhmm: string, crew: CrewId) => as(seek(freshPreview(wall), hhmm), crew);
const history = (s: ReturnType<typeof freshPreview>, hhmm: string, range: 'last7' | 'all' = 'last7') => laboratoryHistory(s, { perspective: 'onboard', owner: dataOwner(s.activeCrewId) }, at(hhmm), range)!;

/** Expected state per (owner, time): the same four words every surface must agree on. */
type Stage = 'waiting' | 'collection' | 'analysis' | 'result';
const SCENARIO: [CrewId, string, Stage][] = [
  [TI, '05:55', 'waiting'], [TI, '13:14', 'waiting'], [TI, '13:15', 'collection'], [TI, '13:19', 'collection'], [TI, '13:20', 'analysis'], [TI, '15:44', 'analysis'], [TI, '15:45', 'result'], [TI, '23:59', 'result'],
  [MO, '05:55', 'waiting'], [MO, '16:14', 'waiting'], [MO, '16:15', 'collection'], [MO, '16:19', 'collection'], [MO, '16:20', 'analysis'], [MO, '23:59', 'analysis'],
];
const OWN: Record<string, { sampleId: string; type: 'blood' | 'urine' }> = { [TI]: { sampleId: TI_BLOOD_SAMPLE, type: 'blood' }, [MO]: { sampleId: MO_URINE_SAMPLE, type: 'urine' } };

describe('LAB04 own laboratory journeys for Tomás and Mei', () => {
  it('defines their own samples, plans and events: no value, no copy of Lucía, plan ≠ collection ≠ analysis ≠ receipt', () => {
    expect(CREW_LAB_EVENTS.map(e => [e.association.crewId, e.sampleId, e.sampleType, e.kind, e.occurredAt.slice(11, 16)])).toEqual([
      [TI, TI_BLOOD_SAMPLE, 'blood', 'lab.sample_taken', '13:15'], [TI, TI_BLOOD_SAMPLE, 'blood', 'lab.analysis_started', '13:20'], [TI, TI_BLOOD_SAMPLE, 'blood', 'lab.result_available', '15:45'],
      [MO, MO_URINE_SAMPLE, 'urine', 'lab.sample_taken', '16:15'], [MO, MO_URINE_SAMPLE, 'urine', 'lab.analysis_started', '16:20'],
    ]);
    for (const e of CREW_LAB_EVENTS) {
      expect(e.measurement).toBeNull(); expect(e.sourceReview).toBeUndefined(); expect(e.origin).toBe('simulated');
      expect(e.receivedAt).toBe(e.occurredAt); expect([BLOOD_SAMPLE, URINE_SAMPLE, HISTORICAL_BLOOD_SAMPLE]).not.toContain(e.sampleId);
      expect(LAB_EVENTS.map(l => l.id)).not.toContain(e.id);
    }
    expect(CREW_LAB_EVENTS.filter(e => e.kind === 'lab.result_available').map(e => e.association.crewId)).toEqual([TI]); // Mei has no result
    expect(new Set(DAY_EVENTS.map(e => e.id)).size).toBe(DAY_EVENTS.length);

    expect(DAY_EVENTS.filter(e => e.association.crewId === OWNER)).toHaveLength(9);
  });
  it('plans the collections in free windows of each agenda, matching the plan blocks exactly', () => {
    expect(validatePlan(PLAN_FD30)).toBe(true);
    for (const owner of [TI, MO] as const) {
      for (const slot of labPlanSlots(owner)) {
        const block = planFor(owner).find(b => b.id === slot.id)!;
        expect([block.start, block.end]).toEqual([slot.start, slot.end]);
        expect(block.crewIds).toEqual([owner]);
        const overlapping = planFor(owner).filter(b => b.id !== block.id && Date.parse(b.start) < Date.parse(block.end) && Date.parse(block.start) < Date.parse(b.end));
        expect(overlapping, `${owner} ${slot.id}`).toEqual([]);
      }
    }
    expect(labPlanSlots(TI).map(s => s.sampleType)).toEqual(['blood']);
    expect(labPlanSlots(MO).map(s => s.sampleType)).toEqual(['urine']);
    expect(labPlanSlots(OWNER).map(s => s.id)).toEqual([LAB_PLANS[OWNER].blood!.id, LAB_PLANS[OWNER].urine!.id]); // Lucía's plan is unchanged
    // The planned slot sits before the first collection event and does not receive a state by itself.
    expect(planFor(TI).some(b => b.id === LAB_PLANS[TI].blood!.id)).toBe(true);
    expect(planFor(MO).some(b => b.id === LAB_PLANS[MO].urine!.id)).toBe(true);
  });

  for (const [crew, hhmm, stage] of SCENARIO) it(`${crew.slice(-2)} ${hhmm}: history, detail, Today, schedule and Mate agree on "${stage}"`, () => {
    const s = at0(hhmm, crew), own = OWN[crew];
    const h = history(s, hhmm), rows = h.records.map(r => r.sample.id);
    const messages = (lang: 'en' | 'es') => ({ ft: lang === 'en' ? fd30En : fd30Es, ct: FD30_CHAT_TEXT[lang] });
    // History 7/30: own sample only, once received.
    expect(rows).toEqual(stage === 'waiting' ? [] : [own.sampleId]);
    expect(history(s, hhmm, 'all').records.map(r => r.sample.id)).toEqual(rows);
    if (stage !== 'waiting') expect(h.records[0].stage).toBe(stage);
    expect(h.days.at(-1)).toMatchObject({ fd: 30, status: stage === 'waiting' ? 'no_record' : 'recorded' });
    expect(h.days.at(-1)!.plans.map(p => p.sampleType)).toEqual([own.type]);
    // Never a historical sample or Lucía's.
    expect(labSamples(s, crew).map(x => x.id)).toEqual(stage === 'waiting' ? [] : [own.sampleId]);
    for (const lang of ['en', 'es'] as const) {
      const { ft, ct } = messages(lang);
      const word = { waiting: ct.labWaiting, collection: ct.labCollected, analysis: ct.labAnalyzing, result: ct.labResult }[stage];
      // Mate: the owner's own sample line only, from received records at the cursor.
      const body = scriptedAnswer(s, crew, at(hhmm), 'laboratory', lang).body;
      expect(body).toBe(`${own.type === 'blood' ? ct.blood : ct.urineOwn}: ${word}.\n${ct.labLimit}`);
      expect(body).not.toContain(own.type === 'blood' ? ct.urine : ct.blood);
      expect(body).not.toContain(ct.noLabs);
      // Detail module and Today card.
      const detail = renderToStaticMarkup(createElement(I18nProvider, { locale: lang, children: createElement(LaboratoryDetail, { state: s, owner: crew, time: at(hhmm) }) }));
      const today = renderToStaticMarkup(createElement(I18nProvider, { locale: lang, children: createElement(TodaySummary, { state: s, owner: crew, time: at(hhmm), ops: freshOps(), onOpenSleep: () => {}, onOpenExercise: () => {}, onOpenLaboratory: () => {} }) }));
      const stageLabel = { collection: ft.labTaken, analysis: ft.labAnalyzing, result: ft.labResult }[stage as Exclude<Stage, 'waiting'>];
      if (stage === 'waiting') {
        expect(detail).not.toContain(own.sampleId); expect(today).not.toContain(`data-lab-sample="${own.sampleId}"`);
        // Today shows the planned collection as a PLAN (never as a received state), with the owner's own time.
        expect(today).toContain(`data-lab-planned="${own.sampleId}"`); expect(today).toContain(ft.labPlan); expect(today).not.toContain(ft.labTaken);
        expect(today).toContain(LAB_PLANS[crew][own.type]!.start.slice(11, 16));
      } else {
        expect(detail).toContain(own.sampleId); expect(detail).toContain(`data-sample-id="${own.sampleId}"`);
        expect(today).toContain(`data-lab-sample="${own.sampleId}"`); expect(today).toContain(stageLabel);
      }
      // Never another profile's samples or the historical one, in any surface.
      for (const foreign of [BLOOD_SAMPLE, URINE_SAMPLE, HISTORICAL_BLOOD_SAMPLE, own.sampleId === TI_BLOOD_SAMPLE ? MO_URINE_SAMPLE : TI_BLOOD_SAMPLE]) {
        expect(detail, foreign).not.toContain(foreign); expect(today, foreign).not.toContain(foreign);
      }
      // The detail shows this sample's own plan time, not Lucía's.
      if (stage !== 'waiting') {
        expect(detail).toContain(LAB_PLANS[crew][own.type]!.start); expect(detail).not.toContain(LAB_PLANS[OWNER].blood!.start);
      }
    }
    // Agenda link: exact own plan -> own sample, module only once the collection is received.
    const slot = labPlanSlots(crew)[0], view = scheduleBlockView(s, crew, slot.id, at(hhmm))!;
    expect(view.module).toBe(stage === 'waiting' ? null : 'laboratory');
    expect(view.event && 'sampleId' in view.event ? view.event.sampleId : null).toBe(stage === 'waiting' ? null : own.sampleId);
    expect(view.event?.kind ?? null).toBe({ waiting: null, collection: 'lab.sample_taken', analysis: 'lab.analysis_started', result: 'lab.result_available' }[stage]);
    // Result availability only for Tomás, and never a value.
    const sample = labSamples(s, crew)[0];
    if (sample) { expect(sample.result?.measurement ?? null).toBeNull(); expect(labEvents(sample).every(e => e.measurement === null)).toBe(true); }
    expect(!!sample?.result).toBe(stage === 'result');
  });

  it('keeps each profile isolated: no sample, news, history, Today or answer crosses to another profile', () => {
    const s = seek(freshPreview(wall), '23:59');
    const ids = (crew: CrewId) => labSamples(s, crew).map(x => x.id).sort();
    expect(ids(OWNER)).toEqual([BLOOD_SAMPLE, HISTORICAL_BLOOD_SAMPLE, URINE_SAMPLE].sort());
    expect(ids(TI)).toEqual([TI_BLOOD_SAMPLE]);
    expect(ids(MO)).toEqual([MO_URINE_SAMPLE]);
    const sampleIds = (crew: CrewId) => receivedPersonalEvents(s, crew).flatMap(e => 'sampleId' in e ? [e.sampleId] : []);
    expect(sampleIds(OWNER).every(id => [BLOOD_SAMPLE, URINE_SAMPLE].includes(id))).toBe(true);
    expect(sampleIds(TI)).toEqual([TI_BLOOD_SAMPLE, TI_BLOOD_SAMPLE, TI_BLOOD_SAMPLE]);
    expect(sampleIds(MO)).toEqual([MO_URINE_SAMPLE, MO_URINE_SAMPLE]);
    expect(latestNews(s, TI)?.id).toBe(`${TI_BLOOD_SAMPLE}:lab.result_available`);
    expect(latestNews(s, MO)?.id).toBe(`${MO_URINE_SAMPLE}:lab.analysis_started`);
    // Lucía's four journeys are intact at 23:59 and see none of their events.
    expect(latestNews(s, OWNER)?.id).toBe(LAB_EVENTS[5].id);
    const lucia = scriptedAnswer(s, OWNER, at('23:59'), 'laboratory', 'en').body, ct = FD30_CHAT_TEXT.en;
    expect(lucia).toBe(`${ct.blood}: ${ct.labResult}.\n${ct.urine}: ${ct.labResult}.\n${ct.labLimit}`);
    // Switching profile keeps every other profile's state and the shared clock.
    const switched = as(as(s, MO), TI);
    expect(switched.processedIds).toEqual(s.processedIds); expect(switched.laboratory).toBe(s.laboratory);
  });

  it('hides and restores their records on rewind without duplicates; the chat reply of a rewound query follows the cursor', () => {
    let s = at0('15:45', TI);
    const expected = history(s, '15:45').records.map(r => r.sample.id);
    s = previewReduce(s, { type: 'ask', owner: TI, text: FD30_CHAT_TEXT.en.laboratory, lang: 'en', now: wall });
    const reply = s.profiles[TI].turns.at(-1)!;
    expect(reply.answer!.body).toContain(`${FD30_CHAT_TEXT.en.blood}: ${FD30_CHAT_TEXT.en.labResult}`);
    for (let i = 0; i < 3; i++) {
      s = seek(s, '09:00');
      expect(history(s, '09:00').records).toEqual([]); expect(labSamples(s, TI)).toEqual([]);
      expect(s.profiles[TI].turns).toHaveLength(1); // kept in the history; the UI hides it by cursor (CHAT02)
      s = seek(s, '15:45');
      expect(history(s, '15:45').records.map(r => r.sample.id)).toEqual(expected);
      expect(s.processedIds).toEqual(projectDomain(at('15:45')).processedIds);
      expect(new Set(s.processedIds).size).toBe(s.processedIds.length);
      expect(s.profiles[TI].turns).toHaveLength(1);
    }
    // Mei's journey: result never arrives, even at the end of the day and after a rewind.
    let m = at0('23:59', MO);
    expect(labSamples(m, MO)[0].result).toBeNull();
    m = seek(seek(m, '16:14'), '23:59');
    expect(labSamples(m, MO)[0]).toMatchObject({ id: MO_URINE_SAMPLE, analysis: { kind: 'lab.analysis_started' }, result: null });
  });

  it('keeps Ground permissions: planned lab activity is generic for every owner, with no sample type, state or sample record', () => {
    for (const owner of [OWNER, TI, MO] as CrewId[]) {
      const slots = labPlanSlots(owner).map(slot => slot.id);
      for (const block of operationalPlan(owner).filter(b => slots.includes(b.id))) {
        expect(block.title).toEqual({ en: 'Planned personal activity', es: 'Actividad personal planificada' });
        // Lucía's pre-existing plan ids are untouched; the new ids for Tomás and Mei carry no sample type at all.
        expect(JSON.stringify(owner === OWNER ? { ...block, id: '' } : block)).not.toMatch(/blood|urine|sangre|orina|sample|muestra/i);
      }
    }
  });
});
