import { describe, expect, it } from 'vitest';
import { createInitialState } from './initialState';
import { reduce } from './reducer';
import type { AppState, LinkMessage, MissionId } from './types';
import type { Action } from './actions';

const T0 = 1_000_000;
const ISS_T = 4000;

function send(s: AppState, taskId: string, min: 30 | 60 | 90 | 120, now: number, missionId: MissionId = 'iss') {
  return reduce(s, { type: 'plan/change_sent', missionId, taskId, advanceMinutes: min, nowMs: now });
}
function share(s: AppState, now: number, comment: string) {
  return reduce(s, { type: 'observation/saved', missionId: 'iss', crewId: 'iss:crew-lf', topics: ['rest'], privateNote: { text: 'private', lang: 'es' }, relatedChangeId: null, share: { comment: { text: comment, lang: 'en' } }, nowMs: now });
}
function link(s: AppState, status: 'up' | 'down', now: number, missionId: MissionId = 'iss') {
  return reduce(s, { type: 'link/status_set', missionId, status, nowMs: now });
}
const tick = (s: AppState, now: number) => reduce(s, { type: 'clock/tick', nowMs: now });
const msgs = (s: AppState, m: MissionId = 'iss'): LinkMessage[] => [...s.missions[m].messages].sort((a, b) => a.seq - b.seq);

describe('U-LINK-01', () => {
  it('send with link up → in_transit; early tick same object; later tick delivers with notice for lf only', () => {
    let s = send(createInitialState(T0), 'iss:blk-16', 90, T0);
    expect(msgs(s)[0].status).toBe('in_transit');
    const before = s;
    s = tick(s, T0 + ISS_T - 1);
    expect(s).toBe(before);
    s = tick(s, T0 + ISS_T);
    expect(msgs(s)[0].status).toBe('delivered');
    expect(s.missions.iss.onboard.plan.version).toBe(2);
    expect(s.missions.iss.onboard.notices).toHaveLength(1);
    expect(s.missions.iss.onboard.notices[0].crewId).toBe('iss:crew-lf');
    // Mei-only change: no notice
    s = send(s, 'iss:blk-20', 60, T0 + 5000);
    s = tick(s, T0 + 5000 + ISS_T);
    expect(s.missions.iss.onboard.plan.version).toBe(3);
    expect(s.missions.iss.onboard.notices).toHaveLength(1);
  });
});

describe('U-LINK-02', () => {
  it('link down: queued; down during transit → queued with same seq; nothing delivered while down; up → in order, each ≥ transitMs', () => {
    let s = link(createInitialState(T0), 'down', T0);
    s = send(s, 'iss:blk-16', 30, T0 + 10);
    expect(msgs(s)[0].status).toBe('queued');
    s = link(s, 'up', T0 + 100);
    s = send(s, 'iss:blk-16', 30, T0 + 200);
    expect(msgs(s)[1].status).toBe('in_transit');
    const seqs = msgs(s).map((m) => m.seq);
    s = link(s, 'down', T0 + 300);
    expect(msgs(s).every((m) => m.status === 'queued')).toBe(true);
    expect(msgs(s).map((m) => m.seq)).toEqual(seqs);
    s = tick(s, T0 + 60_000);
    expect(msgs(s).every((m) => m.status === 'queued')).toBe(true);
    const up = T0 + 70_000;
    s = link(s, 'up', up);
    s = tick(s, up + ISS_T - 1);
    expect(msgs(s).every((m) => m.status === 'in_transit')).toBe(true);
    const delivered: number[] = [];
    for (let t = up + ISS_T; t <= up + ISS_T + 5000; t += 100) {
      s = tick(s, t);
      for (const m of msgs(s)) if (m.status === 'delivered' && !delivered.includes(m.seq)) { delivered.push(m.seq); expect(m.deliveredAtMs! - up).toBeGreaterThanOrEqual(ISS_T); }
    }
    expect(delivered).toEqual(seqs);
    expect(s.missions.iss.onboard.plan.version).toBe(3);
    expect(s.missions.iss.onboard.notices).toHaveLength(2);
  });
});

describe('U-LINK-03 mixed sequence, FIFO per mission (02 §7.1)', () => {
  for (const interval of [50, 500, 1000]) {
    it(`tick interval ${interval} ms`, () => {
      let s = createInitialState(T0);
      const seen: string[] = [];
      const versions: number[] = [];
      const guardCalls: string[] = [];
      const origWarn = console.warn;
      console.warn = (...a: unknown[]) => guardCalls.push(String(a[0]));
      const observe = (st: AppState) => {
        for (const m of msgs(st)) {
          if (m.status === 'delivered' && !seen.includes(m.id)) {
            // L1: every earlier seq must already be delivered
            for (const e of msgs(st)) if (e.seq < m.seq) expect(e.status).toBe('delivered');
            seen.push(m.id);
          }
        }
        const v = st.missions.iss.onboard.plan.version;
        if (versions[versions.length - 1] !== v) versions.push(v);
      };
      const run = (from: number, to: number) => { for (let t = from; t <= to; t += interval) { s = tick(s, t); observe(s); } };

      // 1. deliver A (v2)
      s = send(s, 'iss:blk-16', 30, T0);
      run(T0, T0 + 6000);
      expect(s.missions.iss.onboard.plan.version).toBe(2);
      // 2. link down; B (v3), C (v4) affecting lf; S1
      let t = T0 + 7000;
      s = link(s, 'down', t);
      s = send(s, 'iss:blk-16', 30, t + 10); const B = msgs(s).at(-1)!.id;
      s = send(s, 'iss:blk-16', 30, t + 20); const C = msgs(s).at(-1)!.id;
      s = share(s, t + 30, 'S1'); const S1 = msgs(s).at(-1)!.id;
      run(t, t + 3000);
      expect(seen).toHaveLength(1);
      // 3. link up at tUp; at +100 send D (v5, Mei) and S2
      const tUp = t + 4000;
      s = link(s, 'up', tUp);
      s = send(s, 'iss:blk-20', 60, tUp + 100); const D = msgs(s).at(-1)!.id;
      s = share(s, tUp + 100, 'S2'); const S2 = msgs(s).at(-1)!.id;
      // 5. meanwhile a cislunar change
      s = send(s, 'cis:blk-20', 30, tUp + 100, 'cislunar');
      // 4. second cut before everything is delivered, then up again
      run(tUp, tUp + 4500);
      const cut = tUp + 4600;
      s = link(s, 'down', cut);
      expect(msgs(s).filter((m) => m.status !== 'delivered').every((m) => m.status === 'queued')).toBe(true);
      run(cut, cut + 2000);
      const up2 = cut + 2500;
      s = link(s, 'up', up2);
      run(up2, up2 + 20_000);
      console.warn = origWarn;

      const issOrder = seen.filter((id) => id.startsWith('iss:'));
      expect(issOrder.slice(1)).toEqual([B, C, S1, D, S2]);
      expect(versions.filter((v) => v >= 3)).toEqual([3, 4, 5]);
      const notices = s.missions.iss.onboard.notices;
      expect(notices.map((n) => n.changeId)).toHaveLength(3); // A, B, C — none for D
      expect(guardCalls.some((g) => g.includes('ignored'))).toBe(false);
      // L4: cislunar delivered on its own pacing (6000 ms after send), unaffected by ISS cuts
      const cis = msgs(s, 'cislunar')[0];
      expect(cis.status).toBe('delivered');
      expect(cis.deliveredAtMs! - cis.createdAtMs).toBeGreaterThanOrEqual(6000);
      expect(cis.deliveredAtMs! - cis.createdAtMs).toBeLessThan(6000 + interval + 1);
      expect(s.missions.cislunar.messages).toHaveLength(1);
    });
  }
});

describe('U-ISO', () => {
  it('U-ISO-01: an ISS change leaves cislunar deep-equal, and vice versa', () => {
    const s0 = createInitialState(T0);
    const s1 = send(s0, 'iss:blk-16', 90, T0);
    expect(s1.missions.cislunar).toEqual(s0.missions.cislunar);
    const s2 = tick(s1, T0 + 10_000);
    expect(s2.missions.cislunar).toEqual(s0.missions.cislunar);
    const c1 = send(s0, 'cis:blk-20', 60, T0, 'cislunar');
    expect(c1.missions.iss).toEqual(s0.missions.iss);
    const c2 = tick(c1, T0 + 10_000);
    expect(c2.missions.iss).toEqual(s0.missions.iss);
    expect(c2.missions.cislunar.log.map((l) => l.kind)).toContain('plan_delivered');
    expect(c2.missions.cislunar.onboard.notices).toHaveLength(0);
  });
  it('U-ISO-02: wrong prefix → same state', () => {
    const s0 = createInitialState(T0);
    const a: Action = { type: 'plan/change_sent', missionId: 'cislunar', taskId: 'iss:blk-16', advanceMinutes: 90, nowMs: T0 };
    expect(reduce(s0, a)).toBe(s0);
    const b: Action = { type: 'observation/saved', missionId: 'iss', crewId: 'cis:crew-nh', topics: ['rest'], privateNote: null, relatedChangeId: null, share: null, nowMs: T0 };
    expect(reduce(s0, b)).toBe(s0);
    const c: Action = { type: 'notice/seen', missionId: 'iss', noticeId: 'cis:ntc-1' };
    expect(reduce(s0, c)).toBe(s0);
  });
});
