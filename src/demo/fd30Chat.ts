import { exerciseHistory } from './history/exercise';
import { exerciseFactsAt } from './history/exerciseFacts';
import { EXERCISE_TEXT } from '../views/history/exercise/exerciseText';
import { sleepHistory, fdLabel, sleepDuration } from './history/sleep';
import { SLEEP_TEXT } from '../views/history/sleep/sleepText';
import { SLEEP_SCORE_TEXT } from '../views/history/sleep/sleepScoreText';
import { sleepScoreDetail } from './history/sleepScore';
import { scheduleInterval, scheduleContinuation } from './fd30Day';
import { SCHEDULE_TEXT } from '../i18n/fd30Schedule';
import type { CrewId, PreviewState, Turn } from './fd30';
import { EQUIPMENT, planFor, plannedExercise } from './fd30Plan';
import { labPlanSlots } from './laboratory';
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
    // EXERCISE-VOICE02: when the owner's records at this cursor match an approved dialogue case, the answer opens with that exact
    // session description (the audio is its English summary). Tomás's comparison is against his own reference, not a judgement.
    const facts = exerciseFactsAt(owner, time), nf = (v: number, digits = 0) => new Intl.NumberFormat(lang, { maximumFractionDigits: digits }).format(v), minus = (v: number) => v < 0 ? '−' : '';
    const dialogue = !facts ? '' : facts.profile === 'lucia' ? text.voiceLucia(nf(facts.minutes))
      : facts.profile === 'tomas' ? text.voiceTomas(nf(facts.recentW), nf(facts.referenceW), facts.referenceCount, `${minus(facts.differenceW)}${nf(Math.abs(facts.differenceW))}`, `${minus(facts.differencePercent)}${nf(Math.abs(facts.differencePercent), 1)}`)
      : text.voiceMei(nf(facts.minutes), nf(facts.powerW));
    return { at: time, detail: 'exercise', body: `${dialogue ? `${dialogue}\n` : ''}${reservation}\n${status}\n${summary}\n${text.count(history?.records.length ?? 0, history?.days.length ?? 7)}` };
  }
  if (intent === 'laboratory') {
    // Only this owner's own FD30 samples (from their plan), by canonical ID. A historical preload or another profile's
    // sample can never answer, and a reservation never implies a state: no event received means "no collection received".
    const slots = labPlanSlots(owner);
    const samples = slots.map(slot => state.laboratory.find(s => s.crewId === owner && s.id === slot.sampleId));
    if (!slots.length && !samples.some(Boolean)) return { at: time, detail: 'laboratory', body: t.noLabs };
    const status = (sample: typeof samples[number]) => {
      const events = [sample?.collection, sample?.analysis, sample?.result].filter((e): e is LabEvent => !!e && due(e));
      return events.some(e => e.kind === 'lab.result_available') ? t.labResult : events.some(e => e.kind === 'lab.analysis_started') ? t.labAnalyzing : events.length ? t.labCollected : t.labWaiting;
    };
    const lines = slots.map((slot, i) => `${slot.sampleType === 'blood' ? t.blood : slots.length === 1 ? t.urineOwn : t.urine}: ${status(samples[i])}.`);
    return { at: time, detail: 'laboratory', body: `${lines.join('\n')}\n${t.labLimit}` };
  }
  if (intent === 'sleep') {
    const history = sleepHistory(state, { perspective: 'onboard', owner }, time, 'last7');
    const latest = history?.latest, text = SLEEP_TEXT[lang];
    if (!latest) return { at: time, detail: 'sleep', body: text.empty };
    // Same record and calculation as the Sleep detail (sleepScoreDetail). No score is ever borrowed from another night.
    const st = SLEEP_SCORE_TEXT[lang], night = fdLabel(latest.fd), duration = sleepDuration(latest.durationMinutes);
    const detail = sleepScoreDetail(state, { perspective: 'onboard', owner }, time, latest.fd);
    const first = detail?.score ? st.chatScore(night, duration, detail.score.display) : st.chatNoScore(night, duration, st.chatReason[detail?.reason ?? 'noRecord']);
    return { at: time, detail: 'sleep', body: `${first}\n${st.chatCount(history!.records.length)}` };
  }
  return { at: time, body: t.fallback };
}
