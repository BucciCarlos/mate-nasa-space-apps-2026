import { DAY_END, DAY_START, EXERCISE_SESSION, OWNER, exerciseSessions } from './fd30';
import type { CrewId, ExerciseEvent, PreviewState } from './fd30';
import { planFor, plannedExercise } from './fd30Plan';
import { labEvents, labPlanSlots, labSamples } from './laboratory';
import type { LabEvent } from './laboratory';

// View geometry only: the existing plan and mission cursor remain authoritative.
export const SCHEDULE_START = DAY_START;
export const SCHEDULE_END = DAY_END;
export const SCHEDULE_PIXELS_PER_MINUTE = 8;
export const scheduleX = (time: number) => (time - SCHEDULE_START) / 60_000 * SCHEDULE_PIXELS_PER_MINUTE;

/** Exact existing plan→record associations, never inferred from a title or the active viewer. */
export function scheduleBlockView(state: PreviewState, owner: CrewId, blockId: string, time: number) {
  const block = planFor(owner).find(b => b.id === blockId);
  if (!block) return null;
  let module: 'exercise' | 'laboratory' | null = null;
  let events: (ExerciseEvent | LabEvent)[] = [];
  let rootKind: ExerciseEvent['kind'] | LabEvent['kind'] | null = null;
  if (owner === OWNER && block.id === plannedExercise(OWNER)?.id && block.kind === 'exercise') {
    module = 'exercise'; rootKind = 'exercise.started';
    events = exerciseSessions(state, owner).filter(s => s.id === EXERCISE_SESSION)
      .flatMap(s => [s.start, s.finish].filter((e): e is ExerciseEvent => !!e && e.sessionId === s.id));
  } else if (labPlanSlots(owner).some(slot => slot.id === block.id)) {
    // Exact plan -> own sample association (each owner has only their own planned collections).
    module = 'laboratory'; rootKind = 'lab.sample_taken';
    const recordId = labPlanSlots(owner).find(slot => slot.id === block.id)!.sampleId;
    events = labSamples(state, owner).filter(s => s.id === recordId)
      .flatMap(s => labEvents(s).filter(e => e.sampleId === s.id && e.sampleType === s.sampleType));
  }
  const received = events.filter(e => e.missionId === block.missionId && e.association.status === 'confirmed'
    && e.association.crewId === owner && Date.parse(e.occurredAt) <= time && Date.parse(e.receivedAt) <= time)
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.scenarioSequence - b.scenarioSequence);
  const root = received.find(e => e.kind === rootKind && Date.parse(e.occurredAt) >= Date.parse(block.start)
    && Date.parse(e.occurredAt) < Date.parse(block.end));
  const event = root ? received.at(-1)! : null;
  return { block, event, module: event ? module : null };
}

export { scheduleClock, scheduleInterval, scheduleContinuation } from './fd30Day';
