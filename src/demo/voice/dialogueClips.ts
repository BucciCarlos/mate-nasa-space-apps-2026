import type { CrewId, Turn } from '../fd30';
import { labDialogueClips } from './labDialogue';
import type { ClipPair } from './labDialogue';
import { sleepDialogueClips } from './sleepDialogue';
import { exerciseDialogueClips } from './exerciseDialogue';

/** One entry point for the conversation: Laboratory, Sleep and Exercise dialogues share the player, controls and cancellation rules. */
export function dialogueClips(owner: CrewId, turn: Pick<Turn, 'reply' | 'answer'>): ClipPair | null {
  return turn.reply === 'sleep' ? sleepDialogueClips(owner, turn) : turn.reply === 'exercise' ? exerciseDialogueClips(owner, turn) : labDialogueClips(owner, turn);
}
