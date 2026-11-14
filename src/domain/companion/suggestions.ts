// Chips and simulated-voice suggestions: docs/specs/02-architecture-contracts.md §8.2, §8.5
import type { AppState, IntentId, MissionId } from '../../state/types';
import { latestNotice } from './respond';

export const NOTICE_CHIPS: IntentId[] = ['schedule.what_changed', 'schedule.show_change', 'rest.how_much', 'observation.start'];
export const BASE_CHIPS: IntentId[] = ['monitoring.explain', 'link.status', 'privacy.who_sees', 'help'];
export const ALL_CHIPS: IntentId[] = [...NOTICE_CHIPS, 'rest.effect_on_me', 'why.it_matters', ...BASE_CHIPS];

export function suggestedIntents(state: AppState, missionId: MissionId): IntentId[] {
  return latestNotice(state, missionId) ? NOTICE_CHIPS : BASE_CHIPS;
}
