/**
 * In-browser text-to-speech via runonweb (Kokoro 82M by default).
 * Singleton pattern: the TTS model is loaded once and survives SPA route
 * changes, so it isn't re-downloaded on every navigation.
 *
 * Audio is synthesized locally in the browser — no network calls.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type TextToSpeech = import('runonweb/tts').TextToSpeech;
type TTSResult = import('runonweb/tts').TTSResult;
type ProgressInfo = import('runonweb/tts').ProgressInfo;

let ttsInstance: TextToSpeech | null = null;
let ttsModulePromise: Promise<typeof import('runonweb/tts')> | null = null;
let progressListeners: Set<(info: ProgressInfo) => void> = new Set();

const loadTtsModule = () => (ttsModulePromise ??= import('runonweb/tts'));

/** Pick the best Kokoro voice for the given language. */
function voiceFor(lang: 'en' | 'es'): string {
  return lang === 'es' ? 'ef_dora' : 'af_heart';
}

export type TtsPhase = 'idle' | 'downloading' | 'loading' | 'speaking' | 'error';

export interface TtsProgress {
  /** 0–100 overall download progress. */
  percent: number;
  /** Human-readable label, e.g. "model.onnx (120/365 MB)". */
  label: string;
}

export interface UseTextToSpeech {
  phase: TtsPhase;
  error: string | null;
  /** Download progress (only meaningful while phase === 'downloading'). */
  progress: TtsProgress | null;
  /** Synthesize and play text. Resolves when playback finishes. */
  speak: (text: string, lang?: 'en' | 'es') => Promise<void>;
  /** Stop current playback. */
  stop: () => void;
}

export function useTextToSpeech(): UseTextToSpeech {
  const [phase, setPhase] = useState<TtsPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<TtsProgress | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Subscribe to global TTS download progress (shared across all hook instances).
  useEffect(() => {
    const listener = (info: ProgressInfo) => {
      if (info.status === 'progress' || info.status === 'progress_total') {
        const pct = info.progress ?? (info.total && info.loaded ? (info.loaded / info.total) * 100 : 0);
        const mb = (bytes?: number) => bytes ? `${(bytes / 1048576).toFixed(0)} MB` : '';
        const label = info.file
          ? `${info.file} (${mb(info.loaded)} / ${mb(info.total)})`
          : `${mb(info.loaded)} / ${mb(info.total)}`;
        setProgress({ percent: Math.round(pct), label });
      } else if (info.status === 'done' || info.status === 'init_done') {
        setProgress(null);
      }
    };
    progressListeners.add(listener);
    return () => { progressListeners.delete(listener); };
  }, []);

  const stop = useCallback(() => {
    sourceRef.current?.stop();
    sourceRef.current = null;
    setPhase('idle');
  }, []);

  const speak = useCallback(async (text: string, lang: 'en' | 'es' = 'en') => {
    stop();
    setError(null);
    setProgress(null);

    const isFirstLoad = !ttsInstance;
    setPhase(isFirstLoad ? 'downloading' : 'loading');

    try {
      const mod = await loadTtsModule();
      if (!ttsInstance) {
        ttsInstance = new mod.TextToSpeech({
          size: 'small',
          language: lang,
          voice: voiceFor(lang),
          onProgress: (info: ProgressInfo) => {
            progressListeners.forEach((fn) => fn(info));
          },
        });
      }
      setPhase('speaking');
      const result: TTSResult = await ttsInstance.speak(text, {
        language: lang,
        voice: voiceFor(lang),
      });

      // Play the PCM audio via Web Audio API.
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const buffer = ctx.createBuffer(1, result.audio.length, result.samplingRate);
      buffer.copyToChannel(result.audio as Float32Array<ArrayBuffer>, 0);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      sourceRef.current = source;
      source.onended = () => {
        sourceRef.current = null;
        setPhase('idle');
      };
      source.start();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'TTS failed';
      setError(msg);
      setPhase('error');
    }
  }, [stop]);

  // Cleanup on unmount: stop playback but keep the TTS instance (singleton).
  useEffect(() => {
    return () => {
      sourceRef.current?.stop();
      sourceRef.current = null;
    };
  }, []);

  return { phase, error, progress, speak, stop };
}
