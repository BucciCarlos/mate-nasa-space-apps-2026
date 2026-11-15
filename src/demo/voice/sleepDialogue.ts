import type { CrewId, Turn } from '../fd30';
import { SLEEP_RECORDS } from '../history/sleep';
import type { SleepRecord } from '../history/sleep';
import { scoreNight } from '../history/sleepScore';
import type { ClipPair } from './labDialogue';
import { labAudioBase } from './labDialogue';

/**
 * SLEEP-VOICE03: the approved spoken Sleep dialogues (interno/sleep-voice02). A clip pair is enabled only when, at the moment
 * of the query (`answer.at`), the PROFILE and its latest received night match the approved dialogue exactly: same record,
 * same duration, same time in bed and the same score computed by the app (`scoreNight`). Nothing depends on a fixed hour, on
 * another night's score or on the text language. Anything else (e.g. Lucía's FD30 without time in bed) is text only and
 * the question is not played either. Audio is always English.
 */
interface Approved { profile: 'lucia' | 'tomas' | 'mei'; recordId: string; fd: number; durationMinutes: number; timeInBedMinutes: number; score: number }
export const SLEEP_DIALOGUES: Record<string, Approved> = {
  'iss:crew-lf': { profile: 'lucia', recordId: 'iss:sleep:lf:fd29', fd: 29, durationMinutes: 395, timeInBedMinutes: 470, score: 71 },
  'iss:crew-ti': { profile: 'tomas', recordId: 'iss:sleep:ti:fd29', fd: 29, durationMinutes: 430, timeInBedMinutes: 490, score: 82 },
  'iss:crew-mo': { profile: 'mei', recordId: 'iss:sleep:mo:fd29', fd: 29, durationMinutes: 445, timeInBedMinutes: 465, score: 93 },
};
export const sleepClipFile = (profile: Approved['profile'], role: 'question' | 'answer') => `mate-sleep-${profile}-${role}-en-sv02.mp3`;

/** Latest night received at `at` by the fixture rule (owner, occurrence and receipt ≤ cursor). Same rule as `sleepHistory`. */
export function latestNightAt(owner: CrewId, at: number): SleepRecord | null {
  const available = SLEEP_RECORDS.filter(r => r.owner === owner && Date.parse(r.occurredAt) <= at && Date.parse(r.receivedAt) <= at);
  return available.reduce<SleepRecord | null>((latest, r) => !latest || r.fd > latest.fd ? r : latest, null);
}

export function sleepDialogueClips(owner: CrewId, turn: Pick<Turn, 'reply' | 'answer'>): ClipPair | null {
  const approved = SLEEP_DIALOGUES[owner];
  if (!approved || turn.reply !== 'sleep' || !turn.answer || turn.answer.detail !== 'sleep') return null;
  const at = turn.answer.at, latest = latestNightAt(owner, at);
  if (!latest || latest.id !== approved.recordId || latest.fd !== approved.fd || latest.durationMinutes !== approved.durationMinutes) return null;
  const scored = scoreNight(latest, at);
  if (!scored.score || scored.score.display !== approved.score || scored.score.timeInBed !== approved.timeInBedMinutes) return null;
  const base = labAudioBase();
  return {
    question: { id: `sleep-${approved.profile}-question`, url: `${base}${sleepClipFile(approved.profile, 'question')}`, voice: 'crew' },
    answer: { id: `sleep-${approved.profile}-answer`, url: `${base}${sleepClipFile(approved.profile, 'answer')}`, voice: 'mate' },
    highlight: 'sleep', opensSleepFd: approved.fd,
  };
}
