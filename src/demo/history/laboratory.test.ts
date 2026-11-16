import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CREW, DAY_EVENTS, dataOwner, OWNER, freshPreview, previewReduce } from '../fd30';
import { BLOOD_SAMPLE, HISTORICAL_BLOOD_SAMPLE, LAB_EVENTS } from '../laboratory';
import { laboratoryHistory } from './laboratory';
import { LaboratoryDetail } from '../LaboratoryDetail';
import { I18nProvider } from '../../i18n/I18nProvider';
import { groundView } from '../../views/fd30-ops/opsSelectors';
const at = (h: string) => Date.parse(`2027-03-10T${h}:00Z`);
const seek = (h: string) => previewReduce(freshPreview(1000, 1), { type: 'seek', target: at(h), now: 1000 });
const query = (s: ReturnType<typeof freshPreview>, h: string, range: 'last7' | 'all' = 'last7') => laboratoryHistory(s, { perspective: 'onboard', owner: dataOwner(s.activeCrewId) }, at(h), range)!;
describe('HIST03 canonical sample history', () => {
  it('has seven/thirty days without writes or new samples; unknown coverage is not inactivity', () => {
    const s = seek('05:55'), before = JSON.stringify(s);
    expect(query(s,'05:55').days.map(d => d.fd)).toEqual([24,25,26,27,28,29,30]);
    expect(query(s,'05:55','all').days).toHaveLength(30);
    expect(query(s,'05:55').records.map(r => r.sample.id)).toEqual([HISTORICAL_BLOOD_SAMPLE]);
    expect(query(s,'05:55','all').days[0].status).toBe('no_record');
    expect(query(s,'05:55').days.at(-1)).toMatchObject({ status: 'no_record', samples: [] });
    expect(query(s,'05:55').days.at(-1)?.plans).toHaveLength(2);
    expect(JSON.stringify(s)).toBe(before); expect(DAY_EVENTS.filter(e => e.association.crewId === OWNER)).toHaveLength(9);
  });
  it('clips each milestone from stale state, including delayed reception, without inferring results', () => {
    const s = seek('11:50');
    for (const [h,stage] of [['09:15','collection'],['09:20','analysis'],['11:45','result']] as const) {
      const row = query(s,h).records.find(r => r.sample.id === BLOOD_SAMPLE)!;
      expect(row.stage).toBe(stage);
      expect(row.sample.result !== null).toBe(h === '11:45');
      expect(row.sample.result?.measurement ?? null).toBeNull();
    }
    expect(query(s,'09:14').records).toHaveLength(1);
    const delayed = { ...s, laboratory: s.laboratory.map(sample => sample.id === BLOOD_SAMPLE ? { ...sample, result: { ...sample.result!, receivedAt: '2027-03-10T12:00:00Z' } } : sample) };
    expect(query(delayed,'11:59').records.find(r => r.sample.id === BLOOD_SAMPLE)?.stage).toBe('analysis');
    expect(query(delayed,'12:00').records.find(r => r.sample.id === BLOOD_SAMPLE)?.stage).toBe('result');
    const unconfirmed = { ...s, laboratory: s.laboratory.map(sample => ({ ...sample, result: sample.result ? { ...sample.result, association: { status: 'unconfirmed' as const } } : null })) };
    expect(query(unconfirmed,'12:00').records.every(r => r.sample.result === null)).toBe(true);
    const noReceipt = { ...s, processedIds: s.processedIds.filter(id => id !== LAB_EVENTS[4].id) };
    expect(query(noReceipt,'12:00').records.find(r => r.sample.id === BLOOD_SAMPLE)?.stage).toBe('analysis');
  });
  it('restores IDs on rewind/forward without touching notice/read memories', () => {
    let s = seek('11:50');
    s = previewReduce(s,{ type: 'events/announce', owner: OWNER, ids: DAY_EVENTS.map(e => e.id) });
    const expected = query(s,'11:50').records, profile = s.profiles[OWNER];
    for (let i=0;i<3;i++) {
      s = previewReduce(s,{ type: 'seek', target: at('00:00'), now: 1000 });
      expect(query(s,'00:00').records.map(r => r.sample.id)).toEqual([HISTORICAL_BLOOD_SAMPLE]);
      s = previewReduce(s,{ type: 'seek', target: at('11:50'), now: 1000 });
      expect(query(s,'11:50').records).toEqual(expected); expect(s.profiles[OWNER]).toEqual(profile);
      expect(new Set(query(s,'11:50').records.map(r => r.sample.id)).size).toBe(3);
    }
  });
  it('keeps other owners empty, denies Ground/foreign requests and leaves Ground projections invariant', () => {
    const s=seek('11:50');
    expect(laboratoryHistory(s,{ perspective: 'onboard', owner: 'iss:crew-mo' },at('11:50'),'all')).toBeNull();
    for (const role of ['mission_operator','medical_professional'] as const) {
      expect(laboratoryHistory(s,{ perspective: 'ground', role },at('11:50'),'all')).toBeNull();
      expect(groundView(s,role,at('11:50'))).toEqual(groundView({ ...s,laboratory: [] },role,at('11:50')));
    }
    for (const crew of CREW.slice(1)) {
      const own={ ...s,activeCrewId: crew.id }; const view=query(own,'23:59','all');
      // LAB04: each owner has a planned FD30 collection, so before it is received day 30 is 'no_record' with its own plan.
      expect(view.records).toEqual([]); expect(view.days.at(-1)?.status).toBe('no_record'); expect(view.days.at(-1)?.plans).toHaveLength(1);
      expect(view.days[0].status).toBe('no_record');
    }
  });
  for (const locale of ['en','es'] as const) it(`renders the prepared module with date/type/stage/detail in ${locale}`, () => {
    for (const crew of CREW) {
      const s={ ...seek('11:50'), activeCrewId: crew.id };
      const html=renderToStaticMarkup(createElement(I18nProvider,{locale,children:createElement(LaboratoryDetail,{ state:s,owner:crew.id,time:at('11:50') })}));
      expect(html).toContain(`data-laboratory-owner="${crew.id}"`); expect(html).toContain('FD01–FD30');
      if (crew.id === OWNER) { expect(html).toContain('2027-03-09'); expect(html).toContain(BLOOD_SAMPLE); }
      else { expect(html).not.toContain(BLOOD_SAMPLE); expect(html).not.toContain(HISTORICAL_BLOOD_SAMPLE); }
    }
  });
});
