/** Public adapter metadata only. Never attach private rows or per-owner counts. */
export const EXERCISE_SOURCE = {
  adapter: 'demo-exercise', version: 'fd30-exercise-history.1', dataClass: 'fictional_fd30',
  scope: 'crew_private', file: 'src/demo/history/exercise.ts',
} as const;
