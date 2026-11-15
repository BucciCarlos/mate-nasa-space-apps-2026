import type { ClipFactory } from './dialoguePlayer';

/** Browser clip factory over HTMLAudioElement. The element is created on `start()`, never before. */
export const htmlAudioClip: ClipFactory = clip => {
  let audio: HTMLAudioElement | null = null;
  let settle: ((outcome: 'ended' | 'stopped') => void) | null = null;
  return {
    start() {
      return new Promise((resolve, reject) => {
        if (typeof Audio === 'undefined') { reject(new Error('Audio is not available')); return; }
        audio = new Audio(clip.url);
        settle = resolve;
        audio.addEventListener('ended', () => resolve('ended'), { once: true });
        audio.addEventListener('error', () => reject(new Error(`Audio failed: ${clip.id}`)), { once: true });
        // Autoplay policies or a missing source reject here; the player turns that into an error state.
        audio.play().catch(reject);
      });
    },
    stop() {
      audio?.pause();
      settle?.('stopped'); settle = null;
    },
  };
};
