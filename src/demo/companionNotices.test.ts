import { describe, expect, it } from 'vitest';
import { companionNotices } from './companionNotices';
import { JOHN, OWNER } from './fd30';
import { fd30En, fd30Es } from '../i18n/fd30';

const hhmm = (at: number) => new Date(at).toISOString().slice(11, 16);
const summary = (id: Parameters<typeof companionNotices>[0]) => companionNotices(id).map(n => `${n.kind}@${hhmm(n.at)}`);

describe('ALR01 companion notices (derived from existing FD30 data)', () => {
  it('John Doe mirrors Lucía\'s three notices with ids of his own', () => {
    const expected = ['sleep@06:00', 'exercise@10:15', 'lab-ready@11:45', 'lab-ready@11:50'];
    expect(summary(OWNER)).toEqual(expected);
    expect(summary(JOHN.id)).toEqual(expected);
    const ids = [...companionNotices(OWNER), ...companionNotices(JOHN.id)].map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('fires the workout notice 15 minutes before the planned exercise of each profile', () => {
    expect(summary('iss:crew-ti')).toContain('exercise@10:15');
    expect(summary('iss:crew-mo')).toContain('exercise@12:45'); // Mei's reservation starts at 13:00
  });
  it('announces a result only where a result event exists; otherwise only that the sample was taken', () => {
    expect(summary('iss:crew-ti')).toContain('lab-ready@15:45');
    expect(summary('iss:crew-mo')).toContain('lab-received@16:15');
    expect(summary('iss:crew-mo').some(s => s.startsWith('lab-ready'))).toBe(false);
    // The 16:15 event is `lab.sample_taken` from the collection source (GND01: sample collection), so the text says taken, never received or ready.
    expect(fd30Es.noticeLabReceivedUrine).toBe('Se tomó tu muestra de orina. Todavía no hay resultado.');
    expect(fd30En.noticeLabReceivedUrine).toBe('Your urine sample was taken. There is no result yet.');
  });
  it('raises the rest notice only for the exact third night below the profile reference', () => {
    expect(summary('iss:crew-ti').some(s => s.startsWith('sleep'))).toBe(false);
    expect(summary('iss:crew-mo').some(s => s.startsWith('sleep'))).toBe(false);
    expect(companionNotices(OWNER).filter(n => n.kind === 'sleep')).toHaveLength(1);
  });
  it('has Spanish and English text for every notice and never frames it as a diagnosis', () => {
    for (const m of [fd30En, fd30Es]) {
      for (const k of ['noticeLabReady', 'noticeExercise', 'noticeSleep', 'noticeOpenLab', 'noticeOpenAgenda', 'noticeOpenSleep', 'noticeClose'] as const) expect(m[k].length).toBeGreaterThan(3);
    }
    expect(fd30Es.noticeLabReady).toBe('¡Tu análisis está listo!');
    expect(fd30Es.noticeExercise).toBe('¡Tu entrenamiento empieza en 15 minutos! Vamos.');
    expect(fd30Es.noticeSleep).toBe('Es el tercer día seguido con menos descanso que tu referencia. ¿Revisamos cómo venís durmiendo?');
  });
});
