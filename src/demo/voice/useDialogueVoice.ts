import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { cancelOnRewind, createDialoguePlayer } from './dialoguePlayer';
import type { PlayerState } from './dialoguePlayer';
import { htmlAudioClip } from './htmlAudioClip';
import type { ClipPair } from './labDialogue';

export type { ClipPair } from './labDialogue';

/**
 * VOICE06 wiring around the VOICE04 player. One player per conversation owner (the Fd30Preview).
 * - Starts only from `toggle` (an explicit button press); never automatically, never with a microphone.
 * - `stop()` runs on: Stop, chat closed, profile change, Ground, any page change, rewind before the query, Restart, unmount.
 * - `onEnded` runs only after a fully successful sequence that was not cancelled (the player never resolves 'ended' otherwise).
 */
export function useDialogueVoice({ chatOpen, owner, onGround, page, cursor, onEnded }: {
  chatOpen: boolean; owner: string; onGround: boolean; page: string; cursor: number;
  /** Called only after a fully successful, non-cancelled sequence whose clip pair names ONE sample to open. */
  onEnded: (key: string, sampleId: string) => void;
}) {
  const player = useMemo(() => createDialoguePlayer({ createClip: htmlAudioClip }), []);
  const state: PlayerState = useSyncExternalStore(player.subscribe, () => player.state, () => player.state);
  const query = useRef<{ key: string; at: number } | null>(null);
  const ended = useRef(onEnded); ended.current = onEnded;

  useEffect(() => { player.stop(); }, [player, chatOpen, owner, onGround, page]);
  useEffect(() => { cancelOnRewind(player, cursor, query.current?.at); }, [player, cursor]);
  useEffect(() => () => player.stop(), [player]);

  const toggle = (key: string, queryAt: number, clips: ClipPair) => {
    if (player.state.status === 'playing' && player.state.key === key) { player.stop(); return; }
    query.current = { key, at: queryAt };
    void player.play({ question: clips.question, answer: clips.answer, key }).then(result => {
      // Guided opening only for the sample named by the compatible dialogue, never a fixed or default destination.
      if (result.status === 'ended' && clips.opensSampleId) ended.current(key, clips.opensSampleId);
    });
  };
  // `state` is the player's real state: the stage is never rewritten. The result highlight is decided by the clip pair.
  return { state, toggle, stop: () => player.stop() };
}
