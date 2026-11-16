import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n/I18nProvider';
import { HydrationCircle } from '../views/today/HydrationCircle';
import { HYDRATION_TEXT } from '../views/today/hydrationText';
import { HYDRATION_EVENTS, HYDRATION_SCENE, VISUAL_CAPACITY, hydrationCount, hydrationLevel, hydrationTime } from './hydration';
import { companionNotices, hydrationNotices } from './companionNotices';
import { CREW, JOHN, OWNER, freshPreview, previewReduce } from './fd30';
import type { ProfileId } from './fd30';
import hydrationSource from './hydration.ts?raw';
import circleSource from '../views/today/HydrationCircle.tsx?raw';
import { planFor } from './fd30Plan';
import { LAB_EVENTS, CREW_LAB_EVENTS } from './laboratory';

const at = (h: string) => Date.parse(`2027-03-10T${h}:00Z`);
const hhmm = (ms: number) => new Date(ms).toISOString().slice(11, 16);
const TI = 'iss:crew-ti' as const, MO = 'iss:crew-mo' as const;
const html = (node: ReturnType<typeof createElement>, locale: 'en' | 'es') => renderToStaticMarkup(createElement(I18nProvider, { locale, children: node }));

describe('MATE-HYD02 simulated water-intake records', () => {
  it('are confirmed, simulated, valueless detections with unique ids, one source and no real device', () => {
    expect(new Set(HYDRATION_EVENTS.map(e => e.id)).size).toBe(HYDRATION_EVENTS.length);
    expect(new Set(HYDRATION_EVENTS.map(e => e.scenarioSequence)).size).toBe(HYDRATION_EVENTS.length);
    for (const e of HYDRATION_EVENTS) {
      expect(e).toMatchObject({ kind: 'hydration.intake_detected', sourceId: 'demo-camera-sim', origin: 'simulated', measurement: null, association: { status: 'confirmed' } });
      expect(e.receivedAt).toBe(e.occurredAt);
      expect(e.id.startsWith('iss:')).toBe(true);
    }
    expect([OWNER, TI, MO].every(id => HYDRATION_EVENTS.some(e => e.association.crewId === id))).toBe(true);
  });
  it('fall in waking, unslept hours and never reach the drawing scale (the glass is never full, never a target)', () => {
    for (const crew of CREW) {
      const own = HYDRATION_EVENTS.filter(e => e.association.crewId === crew.id);
      expect(own.length).toBeLessThan(VISUAL_CAPACITY);
      expect(hydrationLevel(hydrationCount(crew.id, at('23:59'))) ).toBeLessThan(1);
      for (const e of own) {
        const t = hydrationTime(e);
        expect(planFor(crew.id).some(b => (b.kind === 'sleep' || b.kind === 'pre_sleep') && Date.parse(b.start) <= t && t < Date.parse(b.end)), `${e.id} during rest`).toBe(false);
        expect(hhmm(t) >= '06:00').toBe(true);
      }
    }
  });
  it('are derived from the cursor: monotonic, identical on rewind, and John reads Lucía\'s count', () => {
    let last = 0;
    for (let m = 0; m < 24 * 60; m += 5) {
      const n = hydrationCount(TI, at('00:00') + m * 60_000);
      expect(n).toBeGreaterThanOrEqual(last); last = n;
    }
    expect(hydrationCount(TI, at('17:24'))).toBe(4);
    expect(hydrationCount(TI, at('17:25'))).toBe(5);
    expect(hydrationCount(TI, at('17:26'))).toBe(5);
    expect(hydrationCount(TI, at('17:10'))).toBe(4);
    expect(hydrationCount(TI, at('14:20'))).toBe(4);
    expect(hydrationCount(TI, at('14:19'))).toBe(3);
    expect(hydrationCount(JOHN.id, at('11:40'))).toBe(hydrationCount(OWNER, at('11:40')));
    expect(hydrationCount(JOHN.id, at('11:40'))).toBe(3);
    // Seeking in the preview state never changes what the cursor yields.
    const seeked = previewReduce(freshPreview(1000, 1), { type: 'seek', target: at('17:26'), now: 1000 });
    expect(seeked.processedIds.some(id => id.includes('hydration'))).toBe(false);
    expect(hydrationCount(TI, at('17:26'))).toBe(5);
  });
  it('keeps the sources free of any real camera access', () => {
    for (const src of [hydrationSource, circleSource]) {
      expect(src).not.toMatch(/getUserMedia|mediaDevices|ImageCapture|<video/);
    }
  });
});

describe('MATE-HYD02 Tomás scene (reuses ALR01 notices)', () => {
  const notices = (id: ProfileId) => companionNotices(id).filter(n => n.kind.startsWith('hydration'));
  it('says it at 17:20 after the 14:20 intake and confirms at the 17:25 event', () => {
    expect(notices(TI).map(n => `${n.kind}@${hhmm(n.at)}`)).toEqual(['hydration-reminder@17:20', 'hydration-confirm@17:25']);
    expect(hydrationCount(TI, at('14:20'))).toBe(4);
    expect(HYDRATION_EVENTS.find(e => e.intakeId === HYDRATION_SCENE.priorIntakeId)?.occurredAt).toBe('2027-03-10T14:20:00Z');
    expect(HYDRATION_EVENTS.filter(e => e.association.crewId === TI && hydrationTime(e) > at('14:20') && hydrationTime(e) <= at('17:20'))).toEqual([]);
  });
  it('is only Tomás\'s: Lucía, John and Mei get none, and the other notices are unchanged', () => {
    for (const id of [OWNER, JOHN.id, MO] as ProfileId[]) expect(notices(id)).toEqual([]);
    expect(companionNotices(TI).filter(n => !n.kind.startsWith('hydration')).map(n => `${n.kind}@${hhmm(n.at)}`)).toEqual(['exercise@10:15', 'lab-ready@15:45']);
    expect(hydrationNotices(JOHN.id)).toEqual([]);
    const ids = ([OWNER, TI, MO, JOHN.id] as ProfileId[]).flatMap(id => companionNotices(id).map(n => n.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('keeps clear of every other notice and sample/plan event of Tomás (≥ 30 min)', () => {
    const others = [...companionNotices(TI).filter(n => !n.kind.startsWith('hydration')).map(n => n.at),
      ...[...LAB_EVENTS, ...CREW_LAB_EVENTS].filter(e => e.association.crewId === TI).map(e => Date.parse(e.occurredAt))];
    for (const h of notices(TI)) for (const o of others) expect(Math.abs(h.at - o)).toBeGreaterThanOrEqual(30 * 60_000);
  });
  it('derives the confirmation from the intake event, not from a timer or from the reminder', () => {
    const later = HYDRATION_EVENTS.map(e => e.intakeId === 'iss:hyd-ti-5' ? { ...e, occurredAt: '2027-03-10T17:40:00Z', receivedAt: '2027-03-10T17:40:00Z' } : e);
    expect(hydrationNotices(TI, later).map(n => `${n.kind}@${hhmm(n.at)}`)).toEqual(['hydration-reminder@17:20', 'hydration-confirm@17:40']);
    expect(hydrationNotices(TI, HYDRATION_EVENTS.filter(e => e.intakeId !== 'iss:hyd-ti-5' && e.intakeId !== 'iss:hyd-ti-6')).map(n => n.kind)).toEqual(['hydration-reminder']);
    // An intake inside the gap means there is no reminder, and so nothing to confirm.
    const early = [...HYDRATION_EVENTS, { ...HYDRATION_EVENTS[0], id: 'iss:hyd-x:hydration.intake_detected', intakeId: 'iss:hyd-x', occurredAt: '2027-03-10T16:00:00Z', receivedAt: '2027-03-10T16:00:00Z', association: { status: 'confirmed' as const, crewId: TI as typeof HYDRATION_EVENTS[0]['association']['crewId'] } }];
    expect(hydrationNotices(TI, early)).toEqual([]);
  });
});

describe('MATE-HYD02 indicator and texts', () => {
  it('has the exact notice texts in Spanish and English', () => {
    expect(HYDRATION_TEXT.es.noticeReminder).toBe('Hace rato que no registro una toma de agua. ¿Hacemos una pausa para tomar agua?');
    expect(HYDRATION_TEXT.es.noticeConfirm).toBe('¡Bien hecho! Registré tu toma de agua');
    expect(HYDRATION_TEXT.en.noticeReminder).toBe('I haven’t logged a water intake in a while. Shall we take a break for some water?');
    expect(HYDRATION_TEXT.en.noticeConfirm).toBe('Well done! I logged your water intake.');
  });
  for (const locale of ['en', 'es'] as const) it(`renders the glass, counter and accessible help control in ${locale}, with no volume, target or status wording`, () => {
    const t = HYDRATION_TEXT[locale];
    const out = html(createElement(HydrationCircle, { count: 4 }), locale);
    expect(out).toContain('data-hydration-count="4"'); expect(out).toContain('data-hydration-level="0.4"');
    expect(out).toContain(`aria-label="${t.count(4)}"`); expect(out).toContain(`aria-label="${t.info}"`);
    expect(out).toContain('aria-expanded="false"'); expect(out).toContain('<strong>4</strong>'); expect(out).toContain('wb-circle');
    expect(out).not.toContain('role="note"');
    expect(`${t.label} ${t.count(4)}`).not.toMatch(/\b\d+\s?(ml|l)\b|%/i);
    expect(t.help).toMatch(locale === 'es' ? /simula.*cámaras.*no usa ninguna cámara real/i : /simulates cameras.*no real camera/);
    expect(t.help).toMatch(locale === 'es' ? /No mide volumen, no es una meta ni muestra tu estado de hidratación/ : /does not measure volume, set a target or show your hydration status/);
  });
});
