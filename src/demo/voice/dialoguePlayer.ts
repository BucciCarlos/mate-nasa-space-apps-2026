/**
 * VOICE04: dialogue player for Mate. Plays ONE question clip and then ONE compatible answer clip.
 * Not connected to the chat yet. No microphone, no autoplay, no retries, no audio files of its own.
 *
 * Contract (see interno/voice02/README.md, "Reproducción futura"):
 * - Starts only when `play()` is called by an explicit user action.
 * - Plays the question first, then the answer. If either is missing or invalid nothing is created or played.
 * - `stop()` cancels the current clip and the next one (the answer clip is not even created while the question runs).
 * - Any audio failure cancels the sequence and reports `error`, so the chat keeps working in text.
 * - The chat text is never changed by this module.
 */
export interface VoiceClip { id: string; url: string; voice?: 'crew' | 'mate' }
/** A single playable clip. `start` settles when the clip ends ('ended') or was stopped ('stopped'); it rejects on failure. */
export interface ClipHandle { start(): Promise<'ended' | 'stopped'>; stop(): void }
export type ClipFactory = (clip: VoiceClip) => ClipHandle;

export type PlayerStatus = 'idle' | 'playing' | 'ended' | 'cancelled' | 'error' | 'unavailable';
export type PlayerStage = 'question' | 'answer';
export interface PlayerState { status: PlayerStatus; stage: PlayerStage | null; key: string | null; error: string | null }
export interface PlayResult { status: Exclude<PlayerStatus, 'idle' | 'playing'>; stage: PlayerStage | null; error: string | null }
export interface PlayRequest { question?: VoiceClip | null; answer?: VoiceClip | null; /** Opaque id of the chat turn, echoed in `state.key`. */ key?: string }

const valid = (clip: VoiceClip | null | undefined): clip is VoiceClip =>
  !!clip && typeof clip.id === 'string' && clip.id !== '' && typeof clip.url === 'string' && clip.url !== '';
const message = (error: unknown) => error instanceof Error ? error.message : String(error ?? 'audio error');

export function createDialoguePlayer(options: { createClip: ClipFactory }) {
  let state: PlayerState = { status: 'idle', stage: null, key: null, error: null };
  let run = 0; // each play()/stop() invalidates the previous sequence
  let current: ClipHandle | null = null;
  const listeners = new Set<(s: PlayerState) => void>();
  const set = (next: PlayerState) => { state = next; listeners.forEach(l => l(state)); };

  /** Cancels the active clip and the pending one. Safe at any time; a no-op when nothing is playing. */
  function stop() {
    if (state.status !== 'playing') return;
    run++;
    const clip = current; current = null;
    try { clip?.stop(); } catch { /* A clip that cannot stop is already gone. */ }
    set({ status: 'cancelled', stage: state.stage, key: state.key, error: null });
  }

  async function play(request: PlayRequest): Promise<PlayResult> {
    if (state.status === 'playing') stop(); // a new explicit action replaces the previous sequence
    const key = request.key ?? null;
    const { question, answer } = request;
    if (!valid(question) || !valid(answer)) {
      run++;
      set({ status: 'unavailable', stage: null, key, error: null });
      return { status: 'unavailable', stage: null, error: null };
    }
    const mine = ++run;
    const finish = (status: PlayResult['status'], stage: PlayerStage | null, error: string | null): PlayResult => {
      if (run === mine) { current = null; set({ status, stage, key, error }); }
      return { status, stage, error };
    };
    for (const [stage, clip] of [['question', question], ['answer', answer]] as const) {
      if (run !== mine) return { status: 'cancelled', stage, error: null };
      set({ status: 'playing', stage, key, error: null });
      try {
        const handle = options.createClip(clip); // answer clip is created only after the question ended
        current = handle;
        const outcome = await handle.start();
        if (run !== mine) return { status: 'cancelled', stage, error: null };
        if (outcome === 'stopped') return finish('cancelled', stage, null);
      } catch (error) {
        if (run !== mine) return { status: 'cancelled', stage, error: null };
        return finish('error', stage, message(error));
      }
    }
    return finish('ended', 'answer', null);
  }

  return {
    play, stop,
    get state() { return state; },
    subscribe(listener: (s: PlayerState) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
export type DialoguePlayer = ReturnType<typeof createDialoguePlayer>;

/**
 * For the integrator: call on every cursor change. Rewinding to before the moment of the query cancels playback,
 * because the answer being heard no longer exists at that time. Returns true when it cancelled.
 */
export function cancelOnRewind(player: DialoguePlayer, cursor: number, queryAt: number | null | undefined): boolean {
  if (queryAt == null || !(cursor < queryAt) || player.state.status !== 'playing') return false;
  player.stop();
  return true;
}
