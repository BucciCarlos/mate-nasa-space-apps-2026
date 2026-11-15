import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider } from '../../i18n/I18nProvider';
import { GroundMedicalDashboard } from './GroundMedicalDashboard';
import { CREW, freshPreview, previewReduce } from '../../demo/fd30';
import { restingPulse, spo2 } from '../../demo/wellbeing';
import { groundMedicalView } from './groundMedical';
import { groundView } from './opsSelectors';
import { groundPlanReferences } from './groundTracking';
const at = (hhmm: string) => Date.parse(`2027-03-10T${hhmm}:00Z`);
const stateAt = (hhmm: string) => previewReduce(freshPreview(1000), { type: 'seek', target: at(hhmm), now: 1000 });
const medical = (hhmm: string) => groundMedicalView(stateAt(hhmm), 'medical_professional', at(hhmm))!;

describe('GND02 explicit medical projection for the three operational crew', () => {
  it('denies Operations, invalid times and screenshot identities, independently of the active Onboard profile', () => {
    const state = stateAt('11:00'), before = JSON.stringify(state);
    expect(groundMedicalView(state, 'mission_operator', at('11:00'))).toBeNull();
    expect(groundMedicalView(state, 'medical_professional', NaN)).toBeNull();
    const expected = groundMedicalView(state, 'medical_professional', at('11:00'));
    expect(expected!.map(p => p.id)).toEqual(CREW.map(p => p.id));
    expect(JSON.stringify(state)).toBe(before);
    state.activeCrewId = 'iss:crew-jd';
    for (const profile of Object.values(state.profiles)) { profile.draft = 'PRIVATE_SENTINEL'; profile.turns = [{ text: 'PRIVATE_SENTINEL', lang: 'en', reply: 'laboratory' }]; }
    expect(groundMedicalView(state, 'medical_professional', at('11:00'))).toEqual(expected);
    expect(JSON.stringify(expected)).not.toMatch(/PRIVATE_SENTINEL|iss:crew-jd|draft|turns|privateNote|wellbeing|hydration/);
  });
  it('shows the actual per-owner coverage and records at 11:00 rather than borrowing Lucía data', () => {
    const [lf, ti, mo] = medical('11:00');
    expect([lf.sleep.points.length, ti.sleep.points.length, mo.sleep.points.length]).toEqual([7, 6, 5]);
    expect([lf.sleep.points.at(-1)?.durationMinutes, ti.sleep.points.at(-1)?.durationMinutes, mo.sleep.points.at(-1)?.durationMinutes]).toEqual([385, 430, 445]);
    expect(ti.sleep.points.at(-1)?.fd).toBe(29); expect(mo.sleep.points.some(p => p.fd === 27)).toBe(false);
    expect(lf.pulse).toMatchObject({ kind: 'exercise', value: 108, sourceId: 'demo-exercise-telemetry', receivedAt: '2027-03-10T11:00:00.000Z' });
    for (const p of [ti, mo]) expect(p.pulse).toMatchObject({ kind: 'illustrative', value: restingPulse(p.id, at('11:00')), receivedAt: null });
    for (const p of [lf, ti, mo]) expect(p.spo2).toMatchObject({ kind: 'illustrative', value: spo2(p.id, at('11:00')) });
    expect(lf.labs.map(s => [s.sampleType, s.stage])).toEqual([['urine', 'analysis'], ['blood', 'analysis'], ['blood', 'collection']]);
    expect(lf.labs[2].stored).toBe(true); expect(ti.labs).toEqual([]); expect(mo.labs).toEqual([]);
    expect(lf.exercise.live).toMatchObject({ id: 'iss:session-lf-1', elapsedMinutes: 30 });
    expect(ti.exercise.live).toBeNull(); expect(mo.exercise.live).toBeNull();
    expect([lf.exercise.latest?.powerW, ti.exercise.latest?.powerW, mo.exercise.latest?.powerW]).toEqual([112, 182, 137]);
    expect([lf.exercise.latest?.fd, ti.exercise.latest?.fd, mo.exercise.latest?.fd]).toEqual([29, 29, 29]);
  });
  it('preserves the wake gate and receipt filtering on rewind without using an Onboard viewer', () => {
    expect(medical('05:59')[0].sleep.points).toHaveLength(6);
    expect(medical('06:00')[0].sleep.points).toHaveLength(7);
    const state = stateAt('06:00'); state.processedIds = state.processedIds.filter(id => id !== 'iss:fd30:lf:wake-1');
    expect(groundMedicalView(state, 'medical_professional', at('06:00'))![0].sleep.points).toHaveLength(6);
    const later = stateAt('16:20'), rewound = previewReduce(later, { type: 'seek', target: at('05:59'), now: 2000 });
    expect(groundMedicalView(rewound, 'medical_professional', at('05:59'))).toEqual(medical('05:59'));
  });
  it('separates sample stages, usable values and future results for all three crew', () => {
    expect(medical('11:50')[0].labs.slice(0, 2).map(s => [s.stage, s.values])).toEqual([['result', null], ['result', null]]);
    expect(medical('13:19')[1].labs[0]).toMatchObject({ stage: 'collection', sampleType: 'blood', values: null });
    expect(medical('15:45')[1].labs[0]).toMatchObject({ stage: 'result', values: null });
    expect(medical('16:20')[2].labs[0]).toMatchObject({ stage: 'analysis', sampleType: 'urine', values: null });
    expect(medical('23:59')[2].labs[0].stage).toBe('analysis');
    // Delay just the result receipt: an event object existing in state is not sufficient permission to show it.
    const state = stateAt('11:50'), sample = state.laboratory.find(s => s.id === 'iss:sample-lf-b1')!;
    sample.result = { ...sample.result!, receivedAt: '2027-03-10T12:30:00Z' };
    expect(groundMedicalView(state, 'medical_professional', at('11:50'))![0].labs.find(s => s.id === sample.id)?.stage).toBe('analysis');
  });
  it('does not replace gaps with last-known or illustrative pulse; reservations do not create sessions', () => {
    const lf = medical('10:53')[0];
    expect(lf.pulse).toMatchObject({ kind: 'exercise', value: null });
    expect(medical('11:30')[0].exercise.live).toBeNull();
    expect(medical('11:30')[0].exercise.latest).toMatchObject({ fd: 30, durationMinutes: 60 });
    for (const p of medical('14:00').slice(1)) { expect(p.exercise.live).toBeNull(); expect(p.exercise.latest?.fd).toBe(29); }
    const state = stateAt('11:00'); state.exercise[0].finish = null;
    expect(groundMedicalView(state, 'medical_professional', at('11:00'))![0].exercise.latest?.fd).toBe(27);
  });
  it('keeps both operational projections and Orbit queries free of all medical fields', () => {
    const state = stateAt('16:20');
    groundMedicalView(state, 'medical_professional', at('11:00'));
    for (const role of ['medical_professional', 'mission_operator'] as const) {
      const data = groundView(state, role, at('11:00'))!;
      const answers = ['equipment', 'maintenance'].map(q => groundPlanReferences(data.crew, q as 'equipment' | 'maintenance', null, at('11:00')));
      expect(JSON.stringify([data, answers])).not.toMatch(/pulse|spo2|durationMinutes|sample-lf|sleep:lf|PRIVATE_SENTINEL|laboratory/);
    }
  });
  it('renders historical exercise intervals in their own day, without applying the FD30 agenda clip', () => {
    for (const locale of ['es', 'en'] as const) {
      for (const [index, interval] of ['10:30–11:30 UTC', '08:00–09:00 UTC', '13:00–14:00 UTC'].entries()) {
        const html = renderToStaticMarkup(createElement(I18nProvider, { locale, children: createElement(GroundMedicalDashboard, { data: medical('11:00')[index] }) }));
        expect(html).toContain(interval);
        expect(html).not.toContain('00:00–');
      }
    }
  });
});
