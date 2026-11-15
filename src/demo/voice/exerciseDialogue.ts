import type { CrewId, Turn } from '../fd30';
import { exerciseFactsAt } from '../history/exerciseFacts';
import type { ClipPair } from './labDialogue';
import { labAudioBase } from './labDialogue';

/**
 * EXERCISE-VOICE02: the approved spoken Exercise dialogues (interno/exercise-voice01). A clip pair is enabled only when, at the
 * moment of the query (`answer.at`), the PROFILE, the SESSION and the available records match the approved script exactly
 * (`exerciseFactsAt`: existing records and the shared comparison selector, receipts <= cursor; no fixed hours). Otherwise it is
 * text only and the question is not played either. Audio is always English; the written answer describes the same session.
 */
export const exerciseClipFile = (profile: 'lucia' | 'tomas' | 'mei', role: 'question' | 'answer') => `mate-exercise-${profile}-${role}-en-ev01.mp3`;

export function exerciseDialogueClips(owner: CrewId, turn: Pick<Turn, 'reply' | 'answer'>): ClipPair | null {
  if (turn.reply !== 'exercise' || !turn.answer || turn.answer.detail !== 'exercise') return null;
  const facts = exerciseFactsAt(owner, turn.answer.at);
  if (!facts) return null;
  const base = labAudioBase(), profile = facts.profile;
  const clips = { question: { id: `exercise-${profile}-question`, url: `${base}${exerciseClipFile(profile, 'question')}`, voice: 'crew' as const },
    answer: { id: `exercise-${profile}-answer`, url: `${base}${exerciseClipFile(profile, 'answer')}`, voice: 'mate' as const }, highlight: 'exercise' as const };
  // Destinations (guided mode): Lucía -> her FD30 session; Tomás -> his comparison section with FD29 as context; Mei -> her FD29 session.
  if (facts.profile === 'lucia') return { ...clips, opensExercise: { sessionId: facts.sessionId, fd: 30, focus: 'session' } };
  if (facts.profile === 'tomas') return { ...clips, opensExercise: { sessionId: facts.latestId, fd: 29, focus: 'comparison' } };
  return { ...clips, opensExercise: { sessionId: facts.sessionId, fd: 29, focus: 'session' } };
}
