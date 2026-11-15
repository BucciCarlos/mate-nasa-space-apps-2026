import { exerciseHistory } from './history/exercise';
import { EXERCISE_TEXT } from '../views/history/exercise/exerciseText';
import { sleepHistory, fdLabel, sleepDuration } from './history/sleep';
import { SLEEP_TEXT } from '../views/history/sleep/sleepText';
import { scheduleInterval, scheduleContinuation } from './fd30Day';
import { SCHEDULE_TEXT } from '../i18n/fd30Schedule';
import type { CrewId, PreviewState, Turn } from './fd30';
import { EQUIPMENT, planFor, plannedExercise } from './fd30Plan';
import { BLOOD_SAMPLE, URINE_SAMPLE } from './laboratory';
import type { LabEvent } from './laboratory';
import { FD30_CHAT_TEXT } from '../i18n/fd30Chat';

export type ChatDetail = 'agenda' | 'exercise' | 'laboratory' | 'sleep';
export interface ChatAnswer { body: string; at: number; detail?: ChatDetail }
export function chatIntent(text: string): Turn['reply'] | null {
  const query = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/laborator|\blabs?\b|blood|urine|sample|result|sangre|orina|muestra|analisis|analyses/.test(query)) return 'laboratory';
  if (/exercise|training|workout|ejercicio|entrenamiento/.test(query)) return 'exercise';
  if (/agenda|schedule|planned|planificado/.test(query)) return 'agenda';
  if (/sleep|rest|sueno|dormi|descanso/.test(query)) return 'sleep';
  return null;
}

/** A reply snapshot at the query cursor, from this owner's current-day plan/receipts only. */
export function scriptedAnswer(state: PreviewState, owner: CrewId, time: number, intent: Turn['reply'], lang: 'en' | 'es'): ChatAnswer {
  const t = FD30_CHAT_TEXT[lang];
  const due = (e: { occurredAt: string; receivedAt: string; association: { status: string; crewId?: string } } | null | undefined) =>
    !!e && e.association.status === 'confirmed' && e.association.crewId === owner && Date.parse(e.occurredAt) <= time && Date.parse(e.receivedAt) <= time;
  if (intent === 'agenda') {
    const blocks = planFor(owner).filter(b => Date.parse(b.end) > time).slice(0, 3);
    const lines = blocks.map(b => `${scheduleInterval(b)} ${scheduleContinuation(b, SCHEDULE_TEXT[lang])} · ${b.title[lang]}${b.equipmentId ? ` · ${EQUIPMENT[b.equipmentId][lang]}` : ''}`);
    return { at: time, detail: 'agenda', body: `${t.planned}\n${lines.length ? lines.join('\n') : t.noPlan}` };
  }
  if (intent === 'exercise') {
    const plan = plannedExercise(owner);
    const session = state.exercise.find(s => s.crewId === owner && s.id === 'iss:session-lf-1');
    const status = due(session?.start) ? due(session?.finish) ? t.exerciseDone : t.exerciseLive : t.exerciseWaiting;
    const reservation = plan ? t.reservation(`${plan.start.slice(11, 16)}–${plan.end.slice(11, 16)}`, EQUIPMENT[plan.equipmentId!][lang]) : t.noPlan;
    const history = exerciseHistory(state, { perspective: 'onboard', owner }, time, 'last7');
    const text = EXERCISE_TEXT[lang];
    const latest = history?.latest;
    const summary = latest ? text.latest(fdLabel(latest.fd), new Intl.NumberFormat(lang).format(latest.durationMinutes)) : text.noRecord;
    return { at: time, detail: 'exercise', body: `${reservation}\n${status}\n${summary}\n${text.count(history?.records.length ?? 0, history?.days.length ?? 7)}` };
  }
  if (intent === 'laboratory') {
    const samples = [BLOOD_SAMPLE, URINE_SAMPLE].map(id => state.laboratory.find(s => s.crewId === owner && s.id === id));
    // A historical preload can never answer a question about today's analyses.
    const hasPlan = planFor(owner).some(b => b.id === 'iss:fd30:lf:planned-blood');
    if (!hasPlan && !samples.some(Boolean)) return { at: time, detail: 'laboratory', body: t.noLabs };
    const status = (sample: typeof samples[number]) => {
      const events = [sample?.collection, sample?.analysis, sample?.result].filter((e): e is LabEvent => !!e && due(e));
      return events.some(e => e.kind === 'lab.result_available') ? t.labResult : events.some(e => e.kind === 'lab.analysis_started') ? t.labAnalyzing : events.length ? t.labCollected : t.labWaiting;
    };
    return { at: time, detail: 'laboratory', body: `${t.blood}: ${status(samples[0])}.\n${t.urine}: ${status(samples[1])}.\n${t.labLimit}` };
  }
  if (intent === 'sleep') {
    const history = sleepHistory(state, { perspective: 'onboard', owner }, time, 'last7');
    const latest = history?.latest, text = SLEEP_TEXT[lang];
    return { at: time, detail: 'sleep', body: latest ? text.chat(fdLabel(latest.fd), sleepDuration(latest.durationMinutes), history!.records.length) : text.empty };
  }
  return { at: time, body: t.fallback };
}
