import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CREW, freshPreview, previewReduce } from '../fd30';
import { SLEEP_RECORDS, sleepHistory } from './sleep';
import { BED_EPISODES, BED_SOURCE, calculateSleepScore, halfUp, scoreNight, sleepScoreComparison, sleepScoreDetail } from './sleepScore';
import { I18nProvider } from '../../i18n/I18nProvider';
import { SleepDetail } from '../../views/history/sleep/SleepDetail';
import { SleepScore } from '../../views/history/sleep/SleepScore';
import { SleepProvenance } from '../../views/history/sleep/SleepProvenance';
import { SLEEP_SCORE_TEXT } from '../../views/history/sleep/sleepScoreText';
const cursor = Date.parse('2027-03-10T12:00:00Z');
const own = (owner: typeof CREW[number]['id']) => previewReduce(previewReduce(freshPreview(1000, 1), {type:'seek',target:cursor,now:1000}), {type:'select',crewId:owner});
const render = (node: ReturnType<typeof createElement>, locale: 'en'|'es') => renderToStaticMarkup(createElement(I18nProvider,{locale,children:node}));
describe('SLEEP03 formula',()=>{
  it.each([[330,340,68.75],[300,305,62.5],[240,240,50],[420,480,79.625],[450,520,84.23076923076923],[480,480,100],[600,600,100],[0,480,0]])('audit %s/%s', (d,b,expected)=>{
    const s=calculateSleepScore(d,b)!;
    expect(s.raw).toBeCloseTo(expected,8); expect(s.display).toBe(halfUp(s.raw));
    expect(s.durationPoints+s.efficiencyPoints).toBe(s.raw);
  });
  it('validates inputs, clamps efficiency and rounds ties half up',()=>{
    for(const [d,b] of [[420,0],[420,400],[-1,480],[NaN,480],[420,NaN],[Infinity,480]]) expect(calculateSleepScore(d,b)).toBeNull();
    expect(calculateSleepScore(336,480)?.efficiencyPoints).toBe(0);
    expect(calculateSleepScore(480,960)?.efficiencyPoints).toBe(0);
    expect(calculateSleepScore(456,480)?.efficiencyPoints).toBeCloseTo(28.5);
    expect(halfUp(58.5)).toBe(59); expect(halfUp(62.5)).toBe(63);
  });
  it('uses raw deltas, suppresses sub-point arrows symmetrically, and includes the exact one-point boundary',()=>{
    for(const [a,b,bed] of [[420,421,480],[400,401,470]]){
      const x=calculateSleepScore(a,bed)!, y=calculateSleepScore(b,bed)!;
      expect(sleepScoreComparison(y,x)?.direction).toBe('steady');
      expect(sleepScoreComparison(x,y)?.direction).toBe('steady');
      expect(sleepScoreComparison(y,x)?.delta).toBe(y.raw-x.raw);
    }
    const s=calculateSleepScore(480,480)!;
    expect(sleepScoreComparison(s,{...s,raw:99})?.direction).toBe('up');
    expect(sleepScoreComparison({...s,raw:99},s)?.direction).toBe('down');
    expect(sleepScoreComparison(s,s)?.direction).toBe('steady');
    expect(sleepScoreComparison(s,null)).toBeNull();
  });
});
describe('SLEEP03 episodes, cursor and privacy',()=>{
  it('has two consecutive scored nights per profile and preserves durations and absent data',()=>{
    expect(BED_EPISODES).toHaveLength(6); expect(SLEEP_RECORDS).toHaveLength(85);
    for(const {id:owner} of CREW){
      const state=own(owner), viewer={perspective:'onboard' as const,owner};
      expect(BED_EPISODES.filter(e=>e.owner===owner).map(e=>e.fd)).toEqual([28,29]);
      for(const fd of [28,29]) expect(sleepScoreDetail(state,viewer,cursor,fd)?.score).not.toBeNull();
      expect(sleepScoreDetail(state,viewer,cursor,29)?.comparison).not.toBeNull();
      expect(sleepScoreDetail(state,viewer,cursor,28)?.comparison).toBeNull();
      expect(sleepScoreDetail(state,viewer,cursor,26)?.reason).toBe('missingBed');
    }
    expect(SLEEP_RECORDS.filter(r=>r.owner==='iss:crew-lf').slice(-3).map(r=>r.durationMinutes)).toEqual([405,395,385]);
    expect(sleepScoreDetail(own('iss:crew-lf'),{perspective:'onboard',owner:'iss:crew-lf'},cursor,30)?.reason).toBe('missingBed');
  });
  it('filters occurrence and receipt, restores deterministic results and never crosses owners or Ground permissions',()=>{
    for(const {id:owner} of CREW){
      const state=own(owner), viewer={perspective:'onboard' as const,owner};
      const e=BED_EPISODES.find(e=>e.owner===owner&&e.fd===29)!, receipt=Date.parse(e.receivedAt);
      const snapshot=JSON.stringify({state,records:SLEEP_RECORDS,episodes:BED_EPISODES});
      const ready=sleepScoreDetail(state,viewer,receipt,29);
      expect(ready?.score).not.toBeNull();
      expect(sleepScoreDetail(state,viewer,receipt-1,29)?.score).toBeNull();
      expect(sleepScoreDetail(state,viewer,receipt,29)).toEqual(ready);
      const delayed=BED_EPISODES.map(x=>x===e?{...x,receivedAt:new Date(receipt+60000).toISOString()}:x);
      expect(sleepScoreDetail(state,viewer,receipt,29,delayed)?.score).toBeNull();
      expect(sleepScoreDetail(state,viewer,receipt+60000,29,delayed)?.score).not.toBeNull();
      expect(JSON.stringify({state,records:SLEEP_RECORDS,episodes:BED_EPISODES})).toBe(snapshot);
      expect(sleepScoreDetail(state,{perspective:'onboard',owner:CREW.find(c=>c.id!==owner)!.id},cursor,29)).toBeNull();
      for(const role of ['mission_operator','medical_professional'] as const) expect(sleepScoreDetail(state,{perspective:'ground',role},cursor,29)).toBeNull();
    }
  });
  it('compares the first night of the seven-day window with FD23 outside that window, if received',()=>{
    const owner='iss:crew-lf' as const, state=own(owner), viewer={perspective:'onboard' as const,owner};
    const shift=(iso:string)=>new Date(Date.parse(iso)-5*86400000).toISOString();
    const records=SLEEP_RECORDS.filter(r=>r.owner===owner&&[28,29].includes(r.fd)).map(r=>({...r,fd:r.fd-5,id:`test:${r.fd-5}`,occurredAt:shift(r.occurredAt),receivedAt:shift(r.receivedAt)}));
    const episodes=BED_EPISODES.filter(e=>e.owner===owner).map(e=>({...e,fd:e.fd-5,recordId:`test:${e.fd-5}`,startAt:shift(e.startAt),endAt:shift(e.endAt),occurredAt:shift(e.occurredAt),receivedAt:shift(e.receivedAt)}));
    expect(sleepHistory(state,viewer,cursor,'last7',records)?.records.map(r=>r.fd)).toEqual([24]);
    expect(sleepScoreDetail(state,viewer,cursor,24,episodes,records)?.comparison).not.toBeNull();
    const delayed=episodes.map(e=>e.fd===23?{...e,receivedAt:new Date(cursor+60000).toISOString()}:e);
    expect(sleepScoreDetail(state,viewer,cursor,24,delayed,records)?.comparison).toBeNull();
  });
  it('rejects incompatible sources/units/owners and invalid TIB, excludes awakenings from the score and never skips missing nights',()=>{
    const e=BED_EPISODES[0],r=SLEEP_RECORDS.find(r=>r.id===e.recordId)!;
    expect(scoreNight(r,cursor,[{...e,awakeningsCount:9}]).score).toEqual(scoreNight(r,cursor,[e]).score);
    for(const bad of [{...e,startAt:e.endAt},{...e,startAt:'invalid'}, {...e,startAt:e.endAt.replace('05:56','05:55')}, {...e,source:{...BED_SOURCE,unit:'h' as never}}, {...e,durationSource:{...r.source,version:'unknown' as never}}]) expect(scoreNight(r,cursor,[bad]).reason).toBe('invalidBed');
    expect(scoreNight(r,cursor,[{...e,owner:'iss:crew-ti'}]).score).toBeNull();
    const records=SLEEP_RECORDS.filter(r=>!(r.owner===e.owner&&r.fd===28));
    expect(sleepScoreDetail(own(e.owner),{perspective:'onboard',owner:e.owner},cursor,29,BED_EPISODES,records)?.comparison).toBeNull();
  });
  for(const locale of ['en','es'] as const) it(`renders scores and absence with duration in ${locale}`,()=>{
    for(const {id:owner} of CREW){
      const state=own(owner);
      const html=render(createElement(SleepScore,{state,owner,time:cursor,fd:29}),locale);
      expect(html).toContain('data-sleep-score='); expect(html).toContain(SLEEP_SCORE_TEXT[locale].efficiency);
      expect(html).toContain(SLEEP_SCORE_TEXT[locale].noAwakenings);
      expect(render(createElement(SleepScore,{state,owner,time:Date.parse('2027-03-09T00:00:00Z'),fd:29}),locale)).not.toContain('data-sleep-score=');
    }
    const html=render(createElement(SleepDetail,{state:own('iss:crew-lf'),owner:'iss:crew-lf',time:cursor}),locale);
    expect(html).toContain('6:25'); expect(html).toContain(SLEEP_SCORE_TEXT[locale].missingBed);
    expect(render(createElement(SleepProvenance),locale)).toContain(SLEEP_SCORE_TEXT[locale].provenance);
  });
});
