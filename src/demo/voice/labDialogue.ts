import type { CrewId, Turn } from '../fd30';
import { BLOOD_SAMPLE, CREW_LAB_EVENTS, LAB_EVENTS, MO_URINE_SAMPLE, TI_BLOOD_SAMPLE, URINE_SAMPLE } from '../laboratory';
import type { LabEvent } from '../laboratory';
import type { VoiceClip } from './dialoguePlayer';

/**
 * VOICE06/07/09: spoken laboratory dialogue. The clip pair is chosen by PROFILE, SAMPLE and the sample's STATE at the moment
 * of the query, derived from the immutable fixture events at `answer.at` (the rule `scriptedAnswer` uses). It never depends on
 * the current cursor, on a fixed hour, on the profile name alone or on the text language. No exact match -> null -> text only,
 * and the question is not played either. Audio is always English (README voice02, decision 1).
 *   Lucía: (blood, urine) pair -> waiting | analyzing | blood-result | both-results   (VOICE03/05)
 *   Tomás: sample iss:sample-ti-b1 with result availability reported, no values        (VOICE08)
 *   Mei:   sample iss:sample-mo-u1 in analysis, no result                              (VOICE08)
 */
export const LAB_AUDIO_OWNER: CrewId = 'iss:crew-lf';
export const labAudioBase = () => `${(import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? './'}voice/`;
export const LAB_QUESTION_FILE = 'mate-lab-question-en-03.mp3';
export const LAB_BLOOD_RESULT_FILE = 'mate-lab-blood-result-en-03.mp3';
export const LAB_WAITING_FILE = 'mate-lab-waiting-en-02.mp3';
export const LAB_ANALYZING_FILE = 'mate-lab-analyzing-en-02.mp3';
export const LAB_BOTH_RESULTS_FILE = 'mate-lab-both-results-en-02.mp3';
export const TOMAS_QUESTION_FILE = 'mate-lab-tomas-question-en-08.mp3';
export const TOMAS_ANSWER_FILE = 'mate-lab-tomas-answer-en-08.mp3';
export const MEI_QUESTION_FILE = 'mate-lab-mei-question-en-08.mp3';
export const MEI_ANSWER_FILE = 'mate-lab-mei-answer-en-08.mp3';

export type LabState = 'waiting' | 'collected' | 'analyzing' | 'result';
const ALL_EVENTS = [...LAB_EVENTS, ...CREW_LAB_EVENTS];
const due = (e: LabEvent, at: number, owner: CrewId) =>
  e.association.status === 'confirmed' && e.association.crewId === owner && Date.parse(e.occurredAt) <= at && Date.parse(e.receivedAt) <= at;
/** State of ONE canonical sample for its owner at `at`. Another profile's or the historical sample can never match. */
export function sampleStateAt(owner: CrewId, at: number, sampleId: string): LabState {
  const events = ALL_EVENTS.filter(e => e.sampleId === sampleId && due(e, at, owner));
  return events.some(e => e.kind === 'lab.result_available') ? 'result' : events.some(e => e.kind === 'lab.analysis_started') ? 'analyzing' : events.length ? 'collected' : 'waiting';
}
/** Lucía's blood/urine state (kept for the VOICE06/07 API). */
export function labStateAt(owner: CrewId, at: number, sampleType: 'blood' | 'urine'): LabState {
  return sampleStateAt(owner, at, sampleType === 'blood' ? BLOOD_SAMPLE : URINE_SAMPLE);
}

export interface ClipPair {
  question: VoiceClip; answer: VoiceClip;
  /** The answer reports an available result: the existing access to the lab detail is highlighted while Mate speaks. */
  resultAvailable?: boolean;
  /** Guided playback may open THIS sample's detail once after a successful end. Absent = open nothing automatically. */
  opensSampleId?: string;
  /** Which existing detail access the conversation highlights while Mate's ANSWER really plays (lab: only with a result). */
  highlight?: 'laboratory' | 'sleep' | 'exercise';
  /** Guided playback may open Sleep with this exact night selected, once, without moving the clock. */
  opensSleepFd?: number;
  /** Guided playback may open Exercise on this exact session/section once, without moving the clock or the profile. */
  opensExercise?: { sessionId?: string; fd: number; focus: 'session' | 'comparison' };
}
const LUCIA_PAIRS: Record<string, { id: string; file: string; resultAvailable: boolean; opensSampleId?: string }> = {
  'waiting|waiting': { id: 'waiting', file: LAB_WAITING_FILE, resultAvailable: false },
  'analyzing|analyzing': { id: 'analyzing', file: LAB_ANALYZING_FILE, resultAvailable: false },
  'result|analyzing': { id: 'blood-result', file: LAB_BLOOD_RESULT_FILE, resultAvailable: true, opensSampleId: BLOOD_SAMPLE },
  'result|result': { id: 'both-results', file: LAB_BOTH_RESULTS_FILE, resultAvailable: true }, // two samples: no default one
};

export function labDialogueClips(owner: CrewId, turn: Pick<Turn, 'reply' | 'answer'>): ClipPair | null {
  if (turn.reply !== 'laboratory' || !turn.answer || turn.answer.detail !== 'laboratory') return null;
  const at = turn.answer.at, base = labAudioBase();
  const clip = (id: string, file: string, voice: 'crew' | 'mate'): VoiceClip => ({ id, url: `${base}${file}`, voice });
  if (owner === LAB_AUDIO_OWNER) {
    const pair = LUCIA_PAIRS[`${labStateAt(owner, at, 'blood')}|${labStateAt(owner, at, 'urine')}`];
    return pair ? { question: clip('question', LAB_QUESTION_FILE, 'crew'), answer: clip(pair.id, pair.file, 'mate'), resultAvailable: pair.resultAvailable,
      ...(pair.resultAvailable ? { highlight: 'laboratory' as const } : {}), ...(pair.opensSampleId ? { opensSampleId: pair.opensSampleId } : {}) } : null;
  }
  if (owner === 'iss:crew-ti' && sampleStateAt(owner, at, TI_BLOOD_SAMPLE) === 'result')
    return { question: clip('tomas-question', TOMAS_QUESTION_FILE, 'crew'), answer: clip('tomas-answer', TOMAS_ANSWER_FILE, 'mate'), resultAvailable: true, highlight: 'laboratory', opensSampleId: TI_BLOOD_SAMPLE };
  if (owner === 'iss:crew-mo' && sampleStateAt(owner, at, MO_URINE_SAMPLE) === 'analyzing')
    return { question: clip('mei-question', MEI_QUESTION_FILE, 'crew'), answer: clip('mei-answer', MEI_ANSWER_FILE, 'mate'), resultAvailable: false };
  return null;
}
