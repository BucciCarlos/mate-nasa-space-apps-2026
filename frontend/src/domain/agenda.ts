// Planning rule (simulated): docs/specs/02-architecture-contracts.md §6.3
import type {
  AdvanceMinutes, BlockMove, CrewChange, Interval, PlanVersion, RestWindowChange, ScheduleBlock,
} from '../state/types';
import { ADVANCE_OPTIONS } from '../state/types';
import { MINUTE_MS, durationMinutes, overlaps, sameInterval, shift, toMs } from './time';

export type AdvanceFailure = 'not_movable' | 'invalid_amount' | 'conflict' | 'rest_window_eliminated';
export type AdvanceResult =
  | { ok: true; plan: PlanVersion; perCrew: CrewChange[] }
  | { ok: false; reason: AdvanceFailure; blockIds: string[] };

function blocksOf(plan: PlanVersion, crewId: string): ScheduleBlock[] {
  return plan.blocks.filter((b) => b.crewIds.includes(crewId));
}

function latestEndingAtOrBefore(blocks: ScheduleBlock[], kind: ScheduleBlock['kind'], limitMs: number): ScheduleBlock | null {
  let best: ScheduleBlock | null = null;
  for (const b of blocks) {
    if (b.kind !== kind || toMs(b.end) > limitMs) continue;
    if (!best || toMs(b.end) > toMs(best.end)) best = b;
  }
  return best;
}

export function advanceTask(plan: PlanVersion, taskId: string, minutes: number): AdvanceResult {
  if (!ADVANCE_OPTIONS.includes(minutes as AdvanceMinutes)) return { ok: false, reason: 'invalid_amount', blockIds: [] };
  const task = plan.blocks.find((b) => b.id === taskId);
  if (!task || task.missionId !== plan.missionId || !task.movable) return { ok: false, reason: 'not_movable', blockIds: taskId ? [taskId] : [] };

  const deltaMs = minutes * MINUTE_MS;
  const newTask: Interval = { start: shift(task.start, -deltaMs), end: shift(task.end, -deltaMs) };
  const updated = new Map<string, Interval>();
  updated.set(task.id, newTask);

  for (const crewId of task.crewIds) {
    const mine = blocksOf(plan, crewId).filter((b) => b.id !== task.id);
    const P = latestEndingAtOrBefore(mine, 'post_sleep', toMs(task.start));
    const S = latestEndingAtOrBefore(mine, 'sleep', P ? toMs(P.start) : toMs(task.start));
    const current = (b: ScheduleBlock): Interval => updated.get(b.id) ?? b;
    const O = mine.filter((b) => overlaps(current(b), newTask));
    if (O.length === 0) continue;
    const others = O.filter((b) => b.id !== P?.id && b.id !== S?.id);
    if (others.length > 0) return { ok: false, reason: 'conflict', blockIds: others.map((b) => b.id) };

    let wakeMs = toMs(newTask.start);
    if (P) {
      const dur = toMs(P.end) - toMs(P.start);
      const movedP: Interval = { start: shift(newTask.start, -dur), end: newTask.start };
      const clash = mine.filter((b) => b.id !== P.id && b.id !== S?.id && overlaps(current(b), movedP));
      if (clash.length > 0) return { ok: false, reason: 'conflict', blockIds: clash.map((b) => b.id) };
      updated.set(P.id, movedP);
      wakeMs = toMs(movedP.start);
    }
    if (S) {
      const cur = current(S);
      const newEnd = Math.min(toMs(cur.end), wakeMs);
      if (newEnd <= toMs(cur.start)) return { ok: false, reason: 'rest_window_eliminated', blockIds: [S.id] };
      updated.set(S.id, { start: cur.start, end: shift(cur.start, newEnd - toMs(cur.start)) });
    }
  }

  const next: PlanVersion = {
    missionId: plan.missionId,
    version: plan.version + 1,
    changeId: null,
    blocks: plan.blocks.map((b) => {
      const u = updated.get(b.id);
      return u ? { ...b, start: u.start, end: u.end } : b;
    }),
  };
  const perCrew = task.crewIds.map((crewId) => diffForCrew(plan, next, crewId));
  return { ok: true, plan: next, perCrew };
}

/** Moved blocks of one crew member (task first) and the planned rest window change. */
export function diffForCrew(prev: PlanVersion, next: PlanVersion, crewId: string): CrewChange {
  const moves: BlockMove[] = [];
  for (const nb of next.blocks) {
    if (!nb.crewIds.includes(crewId)) continue;
    const pb = prev.blocks.find((b) => b.id === nb.id);
    if (!pb || sameInterval(pb, nb)) continue;
    moves.push({ blockId: nb.id, kind: nb.kind, title: nb.title, before: { start: pb.start, end: pb.end }, after: { start: nb.start, end: nb.end } });
  }
  const order = (m: BlockMove) => (m.kind === 'task' || m.kind === 'exercise' || m.kind === 'conference' ? 0 : m.kind === 'post_sleep' ? 1 : 2);
  moves.sort((a, b) => order(a) - order(b));

  const movedSleep = moves.find((m) => m.kind === 'sleep');
  let rest: RestWindowChange | null = null;
  if (movedSleep) {
    rest = {
      sleepBlockId: movedSleep.blockId,
      before: movedSleep.before,
      after: movedSleep.after,
      deltaMinutes: durationMinutes(movedSleep.after) - durationMinutes(movedSleep.before),
    };
  } else if (moves.length > 0) {
    // A task moved without touching sleep: report the unchanged rest window that precedes it.
    const task = moves[0];
    const mine = next.blocks.filter((b) => b.crewIds.includes(crewId) && b.id !== task.blockId);
    const S = latestEndingAtOrBefore(mine, 'sleep', toMs(task.before.start));
    if (S) rest = { sleepBlockId: S.id, before: { start: S.start, end: S.end }, after: { start: S.start, end: S.end }, deltaMinutes: 0 };
  }
  return { crewId, moves, rest };
}

/** Range covering all before/after intervals of a change, with 1 h margins (02 §8.2). */
export function changeRange(change: CrewChange): Interval | null {
  const intervals: Interval[] = [];
  for (const m of change.moves) intervals.push(m.before, m.after);
  if (change.rest) intervals.push(change.rest.before, change.rest.after);
  if (intervals.length === 0) return null;
  const startMs = Math.min(...intervals.map((i) => toMs(i.start))) - 60 * MINUTE_MS;
  const endMs = Math.max(...intervals.map((i) => toMs(i.end))) + 60 * MINUTE_MS;
  return { start: shift(intervals[0].start, startMs - toMs(intervals[0].start)), end: shift(intervals[0].start, endMs - toMs(intervals[0].start)) };
}
