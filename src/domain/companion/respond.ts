// Reply building: docs/specs/02-architecture-contracts.md §8.2–§8.3
import type { AppState, CompanionReply, FlightMetric, IntentId, MissionId, Notice, UiAction } from '../../state/types';
import { latestFlightSample, monitoringSeries } from '../monitoring';
import { changeRange } from '../agenda';

/** 02 §6.4: M1 has no source of self-reported sleep entries. */
export function findComparableSleepRecords(_state: AppState, _missionId: MissionId, _crewId: string): never[] {
  return [];
}

export function latestNotice(state: AppState, missionId: MissionId): Notice | null {
  const mission = state.missions[missionId];
  const notices = mission.onboard.notices.filter((notice) => notice.crewId === mission.onboardUserId);
  return notices.length > 0 ? notices[notices.length - 1] : null;
}

function reply(templateId: CompanionReply['templateId'], params: CompanionReply['params'] = {}, status: CompanionReply['status'] = 'ok',
  sourceIds: string[] = [], actions: UiAction[] = []): CompanionReply {
  return { templateId, params, status, sourceIds, actions, executed: false };
}

export function respond(state: AppState, missionId: MissionId, intent: IntentId, metric: FlightMetric = 'reaction'): CompanionReply {
  const m = state.missions[missionId];
  const notice = latestNotice(state, missionId);
  const linkDownSinceMs = m.link.downSinceMs ?? 0;

  switch (intent) {
    case 'monitoring.explain': {
      const crewId = m.onboardUserId ?? '';
      const sample = latestFlightSample(crewId, metric);
      const { mean } = monitoringSeries(crewId, metric);
      if (!sample || mean === null) return reply('noComparableRecords', {}, 'no_evidence');
      return reply('monitoringExplanation', { metric, value: sample.value, delta: sample.value - mean, at: sample.at });
    }
    case 'schedule.show_change': {
      if (!notice) return reply('changeNone');
      const actions: UiAction[] = [{ type: 'navigate', route: { view: 'onboard', page: 'agenda' } }];
      const range = changeRange({ crewId: notice.crewId, moves: notice.moves, rest: notice.rest });
      if (range) actions.push({ type: 'select_range', range });
      actions.push({ type: 'highlight', target: { kind: 'change', changeId: notice.changeId } });
      return reply('showChange', { noticeId: notice.id, moved: notice.moves.length }, 'ok', [], actions);
    }
    case 'rest.effect_on_me': {
      const records = findComparableSleepRecords(state, missionId, m.onboardUserId ?? '');
      if (records.length === 0) return reply('noComparableRecords', {}, 'no_evidence');
      return reply('noComparableRecords', {}, 'no_evidence');
    }
    case 'rest.how_much': {
      if (!notice) return reply('changeNone');
      if (!notice.rest || notice.rest.deltaMinutes === 0) return reply('restUnchanged', { noticeId: notice.id });
      return reply('restDelta', {
        noticeId: notice.id, beforeStart: notice.rest.before.start, beforeEnd: notice.rest.before.end,
        afterStart: notice.rest.after.start, afterEnd: notice.rest.after.end, deltaMinutes: notice.rest.deltaMinutes,
      }, 'ok', [], [{ type: 'highlight', target: { kind: 'block', blockId: notice.rest.sleepBlockId } }]);
    }
    case 'why.it_matters':
      return reply('whyItMatters', {}, 'ok', ['nasa-hrp-risk-sleep', 'nasa-hrp-risk-ops-support'], [{ type: 'open_source', sourceId: 'nasa-hrp-risk-sleep' }]);
    case 'schedule.what_changed': {
      if (!notice) return linkDownSinceMs > 0 ? reply('changeNoneLinkDown', { linkDownSinceMs }) : reply('changeNone');
      return reply('changeSummary', {
        noticeId: notice.id, taskId: notice.taskId, advanceMinutes: notice.trace.advanceMinutes,
        deltaMinutes: notice.rest ? notice.rest.deltaMinutes : 0, hasRest: notice.rest ? 1 : 0, linkDownSinceMs,
      });
    }
    case 'observation.start':
      return reply('observationStart', {}, 'ok', [], [{ type: 'open_observation_form', prefill: { relatedChangeId: notice?.changeId ?? null, topics: ['schedule'] } }]);
    case 'privacy.who_sees':
      return reply('whoSees');
    case 'link.status':
      return m.link.status === 'up' ? reply('linkUp') : reply('linkDown', { linkDownSinceMs });
    case 'help':
      return reply('help');
    case 'unknown':
    default:
      return reply('notUnderstood', {}, 'not_understood');
  }
}
