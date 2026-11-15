import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CREW, OWNER, freshPreview, previewReduce } from '../../demo/fd30';
import { SLEEP_RECORDS } from '../../demo/history/sleep';
import { I18nProvider } from '../../i18n/I18nProvider';
import { GroundSleepChart } from './GroundSleepChart';
import { groundSleepTrend } from './groundSleep';
import { GroundOverview } from './GroundOverview';
import { groundView } from './opsSelectors';

const at = (hhmm: string) => Date.parse(`2027-03-10T${hhmm}:00Z`);
const seek = (hhmm: string) => previewReduce(freshPreview(1000), { type: 'seek', target: at(hhmm), now: 1000 });
const trend = (hhmm: string, role: 'medical_professional' | 'mission_operator' = 'medical_professional') => groundSleepTrend(seek(hhmm), role, at(hhmm));

describe('GND03 default Lucía sleep projection, extended by the GND02 medical dashboard', () => {
  it('is medical-only and defaults to Lucía without mixing other owners', () => {
    expect(trend('08:00', 'mission_operator')).toBeNull();
    const t = trend('08:00')!;
    expect(t.person).toEqual({ id: OWNER, name: 'Lucía Ferraro' });
    expect(t.points.every(p => p.person.id === OWNER)).toBe(true);
    // An individual projection never includes another person's records.
    for (const other of CREW.filter(c => c.id !== OWNER)) expect(JSON.stringify(t)).not.toContain(other.id);
    expect(groundSleepTrend(seek('08:00'), 'medical_professional', NaN)).toBeNull();
  });
  it('shows only the six earlier nights before 06:00 UTC of FD30, without a FD30 value or a zero', () => {
    const t = trend('05:59')!;
    expect(t.points.map(p => p.fd)).toEqual([24, 25, 26, 27, 28, 29]);
    expect(t.expected).toBe(7);
    expect(t.points.some(p => p.fd === 30)).toBe(false);
    expect(t.points.every(p => p.durationMinutes > 0)).toBe(true);
    expect(JSON.stringify(t)).not.toContain('385');
  });
  it('adds the seventh point (6 h 25 min) from 06:00 UTC and drops it again when the clock goes back', () => {
    const at0600 = trend('06:00')!;
    expect(at0600.points.map(p => p.fd)).toEqual([24, 25, 26, 27, 28, 29, 30]);
    expect(at0600.points.at(-1)!.durationMinutes).toBe(385); // 6 h 25 min
    const forward = seek('06:00'), back = previewReduce(forward, { type: 'seek', target: at('05:59'), now: 2000 });
    expect(groundSleepTrend(back, 'medical_professional', at('05:59'))!.points.map(p => p.fd)).toEqual([24, 25, 26, 27, 28, 29]);
  });
  it('projects only the approved fields, reusing the existing records instead of copying figures', () => {
    for (const p of trend('08:00')!.points) {
      expect(Object.keys(p).sort()).toEqual(['durationMinutes', 'fd', 'id', 'occurredAt', 'person', 'provenance', 'receivedAt']);
      expect(Object.keys(p.provenance).sort()).toEqual(['adapter', 'dataClass', 'origin', 'version']);
      const source = SLEEP_RECORDS.find(r => r.id === p.id)!;
      expect(p).toMatchObject({ durationMinutes: source.durationMinutes, occurredAt: source.occurredAt, receivedAt: source.receivedAt, fd: source.fd, provenance: { origin: 'simulated', dataClass: 'fictional_fd30' } });
    }
  });
  it('renders the chart with day, h min, coverage and source in both languages, with no severity wording', () => {
    for (const [locale, hm, coverage, source] of [['en', '6 h 25 min', 'Coverage: 7 of 7 nights received', 'simulated FD30 scenario'], ['es', '6 h 25 min', 'Cobertura: 7 de 7 noches recibidas', 'escenario simulado de FD30']] as const) {
      const html = renderToStaticMarkup(createElement(I18nProvider, { locale, children: createElement(GroundSleepChart, { trend: trend('06:00')! }) }));
      for (const text of [hm, coverage, source, 'FD24', 'FD30', 'iss:sleep:lf:fd30']) expect(html).toContain(text);
      expect(html).not.toMatch(/normal|abnormal|alert|riesgo|risk|diagn/i);
    }
    const early = renderToStaticMarkup(createElement(I18nProvider, { locale: 'en', children: createElement(GroundSleepChart, { trend: trend('05:59')! }) }));
    expect(early).toContain('Coverage: 6 of 7 nights received');
    expect(early).not.toContain('6 h 25 min');
  });
  it('keeps the default Lucía series out of the list and denies Operations', () => {
    const render = (role: 'medical_professional' | 'mission_operator') => {
      const state = seek('06:00');
      return renderToStaticMarkup(createElement(I18nProvider, { locale: 'en', children: createElement(GroundOverview, { data: groundView(state, role, at('06:00')), time: at('06:00'), onRole: () => {} }) }));
    };
    // The list view never carries it (a person card has to be opened first); Operations gets no trend at all.
    expect(render('medical_professional')).not.toContain('data-ground-sleep');
    expect(groundSleepTrend(seek('06:00'), 'mission_operator', at('06:00'))).toBeNull();
  });
});
