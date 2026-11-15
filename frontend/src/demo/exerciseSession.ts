import { EXERCISE_SESSION, exerciseSessions } from './fd30';
import type { CrewId, PreviewState } from './fd30';
import { currentTelemetry, visibleTelemetry } from './exerciseTelemetry';

/** Session visibility uses confirmed workflow receipts and the shared mission cursor only. */
export function exerciseSessionView(state: PreviewState, owner: CrewId, time: number) {
  const session = exerciseSessions(state, owner).find(s => s.id === EXERCISE_SESSION);
  const started = !!session?.start && session.start.association.status === 'confirmed'
    && session.start.association.crewId === owner && Date.parse(session.start.occurredAt) <= time && Date.parse(session.start.receivedAt) <= time;
  const finished = started && !!session?.finish && session.finish.association.status === 'confirmed'
    && session.finish.association.crewId === owner && Date.parse(session.finish.occurredAt) <= time && Date.parse(session.finish.receivedAt) <= time;
  const points = started ? visibleTelemetry(finished ? Math.min(time, Date.parse(session!.finish!.occurredAt)) : time, owner)
    .filter(p => p.sessionId === session!.id && Date.parse(p.occurredAt) >= Date.parse(session!.start!.occurredAt)) : [];
  const elapsedSeconds = started ? Math.max(0, Math.floor(((finished ? Date.parse(session!.finish!.occurredAt) : time) - Date.parse(session!.start!.occurredAt)) / 1000)) : null;
  return { session, phase: finished ? 'completed' as const : started ? 'live' as const : 'planned' as const,
    points, current: started && !finished ? currentTelemetry(points, time) : null, elapsedSeconds };
}
