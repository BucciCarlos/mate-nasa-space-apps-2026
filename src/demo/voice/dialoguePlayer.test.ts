import { afterEach, describe, expect, it, vi } from 'vitest';
import { cancelOnRewind, createDialoguePlayer } from './dialoguePlayer';
import type { ClipFactory, ClipHandle, VoiceClip } from './dialoguePlayer';
import { htmlAudioClip } from './htmlAudioClip';

const q: VoiceClip = { id: 'question', url: '/audio/q.mp3', voice: 'crew' };
const a: VoiceClip = { id: 'both-results', url: '/audio/a.mp3', voice: 'mate' };

/** Fake clips whose end/failure the test controls. Records every create/start/stop in order. */
function harness() {
  const log: string[] = [];
  const clips = new Map<string, { end(): void; fail(e?: Error): void; stopped: boolean; started: boolean }>();
  const createClip: ClipFactory = clip => {
    log.push(`create:${clip.id}`);
    let resolve!: (v: 'ended' | 'stopped') => void, reject!: (e: Error) => void;
    const control = { end: () => resolve('ended'), fail: (e = new Error('boom')) => reject(e), stopped: false, started: false };
    clips.set(clip.id, control);
    const handle: ClipHandle = {
      start() { log.push(`start:${clip.id}`); control.started = true; return new Promise((res, rej) => { resolve = res; reject = rej; }); },
      stop() { log.push(`stop:${clip.id}`); control.stopped = true; resolve('stopped'); },
    };
    return handle;
  };
  return { log, clips, player: createDialoguePlayer({ createClip }) };
}
const tick = () => new Promise(r => setTimeout(r, 0));

describe('dialogue player', () => {
  it('plays the question and then the answer, creating the answer clip only after the question ends', async () => {
    const { log, clips, player } = harness();
    const seen: string[] = [];
    player.subscribe(s => seen.push(`${s.status}:${s.stage}`));
    const done = player.play({ question: q, answer: a, key: 'turn-3' });
    await tick();
    expect(log).toEqual(['create:question', 'start:question']);
    expect(player.state).toMatchObject({ status: 'playing', stage: 'question', key: 'turn-3' });
    clips.get('question')!.end(); await tick();
    expect(log).toEqual(['create:question', 'start:question', 'create:both-results', 'start:both-results']);
    expect(player.state).toMatchObject({ status: 'playing', stage: 'answer' });
    clips.get('both-results')!.end();
    expect(await done).toEqual({ status: 'ended', stage: 'answer', error: null });
    expect(player.state).toMatchObject({ status: 'ended', key: 'turn-3', error: null });
    expect(seen).toEqual(['playing:question', 'playing:answer', 'ended:answer']);
  });

  it('never starts by itself', async () => {
    const { log, player } = harness();
    await tick();
    expect(log).toEqual([]);
    expect(player.state).toEqual({ status: 'idle', stage: null, key: null, error: null });
    player.stop(); // stopping an idle player is a no-op
    expect(player.state.status).toBe('idle');
  });

  for (const [name, request] of [
    ['answer missing', { question: q }], ['answer null', { question: q, answer: null }], ['question missing', { answer: a }],
    ['both missing', {}], ['empty url', { question: q, answer: { ...a, url: '' } }], ['empty id', { question: { ...q, id: '' }, answer: a }],
  ] as const) it(`plays nothing when ${name}`, async () => {
    const { log, player } = harness();
    expect(await player.play({ ...request, key: 'k' })).toEqual({ status: 'unavailable', stage: null, error: null });
    expect(log).toEqual([]); // no clip is even created
    expect(player.state).toMatchObject({ status: 'unavailable', key: 'k' });
  });

  it('stop during the question cancels it and never creates the answer clip, even if the question later ends', async () => {
    const { log, clips, player } = harness();
    const done = player.play({ question: q, answer: a });
    await tick();
    player.stop();
    expect(await done).toEqual({ status: 'cancelled', stage: 'question', error: null });
    expect(log).toEqual(['create:question', 'start:question', 'stop:question']);
    expect(player.state).toMatchObject({ status: 'cancelled', stage: 'question' });
    clips.get('question')!.end(); await tick(); // a late end must not advance the sequence
    expect(log).not.toContain('create:both-results');
  });

  it('stop during the answer cancels the answer', async () => {
    const { log, clips, player } = harness();
    const done = player.play({ question: q, answer: a });
    await tick(); clips.get('question')!.end(); await tick();
    player.stop();
    expect(await done).toMatchObject({ status: 'cancelled', stage: 'answer' });
    expect(log.at(-1)).toBe('stop:both-results');
    expect(clips.get('both-results')!.stopped).toBe(true);
  });

  it('reports an error and lets the chat continue in text when a clip fails', async () => {
    for (const failing of ['question', 'answer'] as const) {
      const { log, clips, player } = harness();
      const done = player.play({ question: q, answer: a, key: 't' });
      await tick();
      if (failing === 'answer') { clips.get('question')!.end(); await tick(); }
      clips.get(failing === 'question' ? 'question' : 'both-results')!.fail(new Error('decode failed'));
      expect(await done).toEqual({ status: 'error', stage: failing, error: 'decode failed' }); // resolves, never throws
      expect(player.state).toMatchObject({ status: 'error', stage: failing, error: 'decode failed', key: 't' });
      if (failing === 'question') expect(log).not.toContain('create:both-results'); // no retry, no skipping ahead
      expect(log.filter(l => l === 'create:question')).toHaveLength(1);
    }
  });

  it('reports an error when the clip cannot even be created, and can play again on a new explicit call', async () => {
    let fail = true;
    const player = createDialoguePlayer({ createClip: () => { if (fail) throw new Error('no audio device'); return { start: async () => 'ended', stop() {} }; } });
    expect(await player.play({ question: q, answer: a })).toEqual({ status: 'error', stage: 'question', error: 'no audio device' });
    fail = false;
    expect(await player.play({ question: q, answer: a })).toMatchObject({ status: 'ended' });
  });

  it('a new play replaces the running sequence', async () => {
    const { log, clips, player } = harness();
    const first = player.play({ question: q, answer: a, key: 'one' });
    await tick();
    const second = player.play({ question: q, answer: a, key: 'two' });
    expect(await first).toMatchObject({ status: 'cancelled' });
    await tick();
    expect(log.slice(0, 4)).toEqual(['create:question', 'start:question', 'stop:question', 'create:question']);
    expect(player.state).toMatchObject({ status: 'playing', key: 'two' });
    clips.get('question')!.end(); await tick(); clips.get('both-results')!.end();
    expect(await second).toMatchObject({ status: 'ended' });
  });

  describe('cancelOnRewind', () => {
    it('cancels only when the cursor goes back before the time of the query', async () => {
      const { player } = harness();
      const at = (hhmm: string) => Date.parse(`2027-03-10T${hhmm}:00Z`);
      void player.play({ question: q, answer: a }); await tick();
      expect(cancelOnRewind(player, at('11:46'), at('11:45'))).toBe(false); // forward: keeps playing
      expect(cancelOnRewind(player, at('11:45'), at('11:45'))).toBe(false); // same instant: keeps playing
      expect(cancelOnRewind(player, at('11:50'), null)).toBe(false);
      expect(player.state.status).toBe('playing');
      expect(cancelOnRewind(player, at('09:00'), at('11:45'))).toBe(true);
      expect(player.state.status).toBe('cancelled');
      expect(cancelOnRewind(player, at('08:00'), at('11:45'))).toBe(false); // nothing left to cancel
    });
  });
});

describe('htmlAudioClip', () => {
  afterEach(() => vi.unstubAllGlobals());
  function fakeAudio(playImpl: () => Promise<void> = () => Promise.resolve()) {
    const instances: { src: string; paused: boolean; fire(type: string): void }[] = [];
    class FakeAudio {
      src: string; paused = false; handlers: Record<string, () => void> = {};
      constructor(src: string) { this.src = src; instances.push(this as never); }
      addEventListener(type: string, handler: () => void) { this.handlers[type] = handler; }
      play() { return playImpl(); }
      pause() { this.paused = true; }
      fire(type: string) { this.handlers[type]?.(); }
    }
    vi.stubGlobal('Audio', FakeAudio);
    return instances;
  }
  it('creates the element only on start and resolves on ended', async () => {
    const instances = fakeAudio();
    const clip = htmlAudioClip(q);
    expect(instances).toHaveLength(0);
    const started = clip.start(); await tick();
    expect(instances[0].src).toBe(q.url);
    instances[0].fire('ended');
    expect(await started).toBe('ended');
  });
  it('rejects on an audio error and on a refused play()', async () => {
    const instances = fakeAudio();
    const clip = htmlAudioClip(q), started = clip.start(); await tick();
    instances[0].fire('error');
    await expect(started).rejects.toThrow(/Audio failed/);
    fakeAudio(() => Promise.reject(new Error('NotAllowedError')));
    await expect(htmlAudioClip(q).start()).rejects.toThrow('NotAllowedError');
  });
  it('resolves "stopped" and pauses on stop; rejects when Audio does not exist', async () => {
    const instances = fakeAudio();
    const clip = htmlAudioClip(q), started = clip.start(); await tick();
    clip.stop();
    expect(await started).toBe('stopped');
    expect(instances[0].paused).toBe(true);
    vi.unstubAllGlobals();
    await expect(htmlAudioClip(q).start()).rejects.toThrow(/not available/);
  });
  it('works end to end with the player: a failing file falls back to an error state', async () => {
    fakeAudio(() => Promise.reject(new Error('missing file')));
    const player = createDialoguePlayer({ createClip: htmlAudioClip });
    expect(await player.play({ question: q, answer: a })).toEqual({ status: 'error', stage: 'question', error: 'missing file' });
  });
});
