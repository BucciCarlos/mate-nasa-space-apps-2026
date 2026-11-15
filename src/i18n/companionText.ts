// Renders a companion reply from its raw params in the current locale (02 §8.3).
import type { AppState, CompanionReply, FlightMetric, Locale, MissionId } from '../state/types';
import { METRIC_UNITS } from '../domain/monitoring';
import type { Messages } from './en';
import { selectCompanionPreferences } from '../state/selectors';
import { fmtDateTime, fmtNumber, fmtDelta, fmtDuration, fmtInterval, fmtTime } from './format';
import { durationMinutes, missionTimeMs } from '../domain/time';

function missionTime(state: AppState, missionId: MissionId, realMs: number, locale: Locale): string {
  const m = state.missions[missionId];
  return fmtTime(missionTimeMs(m.clockStart, state.sessionStartMs, realMs), locale);
}

export function renderReply(reply: CompanionReply, state: AppState, missionId: MissionId, locale: Locale, t: Messages): string {
  const p = reply.params;
  const m = state.missions[missionId];
  const tt = t.companion.t;
  switch (reply.templateId) {
    case 'monitoringExplanation': {
      const metric = (p.metric ?? 'reaction') as FlightMetric;
      const unit = METRIC_UNITS[metric];
      const values = {
        metric: t.monitoring.metrics[metric],
        value: `${fmtNumber(Number(p.value), locale)} ${unit}`,
        delta: `${fmtNumber(Number(p.delta), locale)} ${unit}`,
        date: fmtDateTime(String(p.at), locale),
      };
      const preferences = selectCompanionPreferences(state, m.onboardUserId ?? '');
      return preferences.style === 'brief' ? t.monitoring.explainBrief(values) : t.monitoring.explainGuided(values);
    }
    case 'changeSummary': {
      const task = m.onboard.plan.blocks.find((b) => b.id === p.taskId);
      const linkDown = Number(p.linkDownSinceMs) > 0;
      return tt.changeSummary({
        task: task ? task.title[locale] : String(p.taskId),
        advance: fmtDuration(Number(p.advanceMinutes)),
        delta: fmtDelta(Number(p.deltaMinutes)),
        hasRest: Number(p.hasRest) === 1,
        linkDown,
        since: linkDown ? missionTime(state, missionId, Number(p.linkDownSinceMs), locale) : '',
      });
    }
    case 'changeNoneLinkDown':
      return tt.changeNoneLinkDown({ time: missionTime(state, missionId, Number(p.linkDownSinceMs), locale) });
    case 'restDelta': {
      const before = { start: String(p.beforeStart), end: String(p.beforeEnd) };
      const after = { start: String(p.afterStart), end: String(p.afterEnd) };
      return tt.restDelta({
        before: fmtDuration(durationMinutes(before)),
        after: fmtDuration(durationMinutes(after)),
        delta: fmtDelta(Number(p.deltaMinutes)),
        beforeRange: fmtInterval(before, locale),
        afterRange: fmtInterval(after, locale),
      });
    }
    case 'linkDown':
      return tt.linkDown({ time: missionTime(state, missionId, Number(p.linkDownSinceMs), locale) });
    case 'changeNone': return tt.changeNone;
    case 'showChange': return tt.showChange;
    case 'restUnchanged': return tt.restUnchanged;
    case 'noComparableRecords': return tt.noComparableRecords;
    case 'whyItMatters': return tt.whyItMatters;
    case 'observationStart': return tt.observationStart;
    case 'whoSees': return tt.whoSees;
    case 'linkUp': return tt.linkUp;
    case 'help': return tt.help;
    case 'notUnderstood': return tt.notUnderstood;
  }
}
