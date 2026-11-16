import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechToText = import('runonweb/stt').SpeechToText;

// Lazy import: keeps the ONNX runtime + model loader out of the main chunk
// until the user actually taps the mic (weights then download from HF once).
let sttModulePromise: Promise<typeof import('runonweb/stt')> | null = null;
const loadSttModule = () => (sttModulePromise ??= import('runonweb/stt'));

// Multilingual tiny: the English-only model rejects `task`/`language` at
// generation time, which breaks bilingual (en/es) transcription.
const STT_MODEL = 'onnx-community/whisper-tiny';

// Module-scoped singleton: the app is a SPA, so components unmount on every
// route change. If each hook instance owned its pipeline (and disposed it on
// unmount), the weights would be re-fetched and re-initialized on every
// navigation. One shared instance keeps the loaded pipeline alive for the
// whole session; the browser Cache Storage keeps the weights across reloads.
let sharedStt: SpeechToText | null = null;
let sharedSttPromise: Promise<SpeechToText> | null = null;
const getSharedStt = (): Promise<SpeechToText> => (sharedSttPromise ??= (async () => {
  const { SpeechToText } = await loadSttModule();
  sharedStt = new SpeechToText({ model: STT_MODEL });
  return sharedStt;
})());

export type SttPhase = 'idle' | 'loading' | 'ready' | 'recording' | 'transcribing';

export interface SpeechToTextApi {
  phase: SttPhase;
  error: string | null;
  /** Mic capture is available (HTTPS/localhost + getUserMedia). */
  supported: boolean;
  /** Start the model download on demand (idempotent). */
  load: () => Promise<void>;
  /** Start recording; no-ops with an error if the model can't be ready. */
  start: () => Promise<void>;
  /** Stop recording, transcribe, and return the transcript. */
  transcribe: () => Promise<string>;
  /** Cancel whatever is in flight; safe to call anytime. */
  cancel: () => void;
}

/**
 * In-browser speech-to-text (Whisper via runonweb/Scribe) for the FD30 chat.
 *
 * The model is lazily downloaded on first use and cached; audio never leaves
 * the tab. Recording is a single MediaRecorder blob that Scribe decodes and
 * resamples to 16 kHz mono itself.
 */
/**
 * `getLanguage` supplies the transcript language per call, so the caller can
 * keep it in sync with its own i18n selection. Without it, tiny slips into
 * English translation instead of a same-language transcript.
 */
export function useSpeechToText(getLanguage?: () => 'en' | 'es'): SpeechToTextApi {
  const [phase, setPhase] = useState<SttPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const phaseRef = useRef<SttPhase>('idle');
  phaseRef.current = phase;
  const languageRef = useRef(getLanguage);
  languageRef.current = getLanguage;

  const setPhaseSafe = useCallback((p: SttPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const ensureStt = useCallback(async () => getSharedStt(), []);

  const load = useCallback(async () => {
    setError(null);
    setPhaseSafe('loading');
    try {
      await (await ensureStt()).load();
      setPhaseSafe(phaseRef.current === 'recording' ? 'recording' : 'ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the speech model');
      setPhaseSafe('idle');
      throw e;
    }
  }, [ensureStt, setPhaseSafe]);

  const stopRecording = useCallback((recorder: MediaRecorder) => {
    return new Promise<Blob>(resolve => {
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorder.stop();
    });
  }, []);

  const start = useCallback(async () => {
    if (phaseRef.current === 'recording') return;
    if (!supported) throw new Error('Mic capture is not available in this context');
    setError(null);
    await load();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
    recorder.start();
    recorderRef.current = recorder;
    setPhaseSafe('recording');
  }, [load, setPhaseSafe, supported]);

  const transcribe = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') throw new Error('Not recording');
    setPhaseSafe('transcribing');
    const blob = await stopRecording(recorder);
    try {
      const language = languageRef.current?.() ?? 'en';
      const { text } = await (await ensureStt()).transcribe(blob, { language });
      setPhaseSafe('ready');
      return text.trim();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transcription failed');
      setPhaseSafe('ready');
      throw e;
    }
  }, [ensureStt, setPhaseSafe, stopRecording]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      void stopRecording(recorder).catch(() => undefined);
    }
    setPhaseSafe('idle');
  }, [setPhaseSafe, stopRecording]);

  useEffect(() => () => {
    // Release the mic on unmount. The model itself lives in the module-scoped
    // singleton (see getSharedStt) and is intentionally NOT disposed: the app
    // is a SPA and re-loading it on every navigation re-downloads the weights.
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  return { phase, error, supported, load, start, transcribe, cancel };
}
