import { useState } from 'react';
import { useApp } from '../../state/AppProvider';
import { selectAgendaRange, selectOnboard } from '../../state/selectors';
import { useT } from '../../i18n/I18nProvider';
import { Timeline } from '../shared/Timeline';
import { RestWindowCard } from '../shared/RestWindowCard';
import { Badge } from '../shared/Badge';
import { SourceCard } from '../shared/SourceCard';
import { LinkBanner } from './LinkBanner';
import { useNow } from '../../state/useNow';
import { missionTimeMs, toIso, toMs, HOUR_MS } from '../../domain/time';
import { fmtClock } from '../../i18n/format';

export function OnboardAgenda() {
  const { state, dispatch } = useApp();
  const t = useT();
  const now = useNow(30_000);
  const { mission, user, plan, notices } = selectOnboard(state);
  const range = selectAgendaRange(state);
  const hl = state.ui.highlight;
  const [showSource, setShowSource] = useState(false);

  const notice = hl?.kind === 'change' ? notices.find((n) => n.changeId === hl.changeId) ?? null : null;
  const moves = notice ? notice.moves : [];
  const highlightBlockId = hl?.kind === 'block' ? hl.blockId : null;
  const latest = notices.length > 0 ? notices[notices.length - 1] : null;
  const restToShow = notice?.rest ?? (highlightBlockId ? latest?.rest ?? null : null);
  const missionNow = missionTimeMs(mission.clockStart, state.sessionStartMs, now);
  const lanes = [{ crew: user, blocks: plan.blocks.filter((b) => b.crewIds.includes(user.id)) }];

  const shiftRange = (hours: number) => dispatch({ type: 'ui/range_set', range: { start: toIso(toMs(range.start) + hours * HOUR_MS), end: toIso(toMs(range.end) + hours * HOUR_MS) } });

  return (
    <div className="onboard-agenda">
      <h1 id="view-h" tabIndex={-1}>{t.agenda.title}</h1>
      <LinkBanner />
      <p className="muted">{t.agenda.blocksOf({ name: user.name })} · {t.agenda.planVersion({ version: plan.version })} <Badge kind="simulated" /></p>
      <div className="range-tools" role="group" aria-label={t.agenda.range}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => shiftRange(-6)}>← 6 h</button>
        <span className="mono">{fmtClock(range.start)} → {fmtClock(range.end)} {t.common.utc}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => shiftRange(6)}>6 h →</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'ui/range_set', range: null })}>{t.agenda.resetRange}</button>
        {hl && <button type="button" className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'ui/highlight_set', target: null })}>{t.agenda.clearHighlight}</button>}
      </div>
      {(notice || highlightBlockId) && (
        <section className="card is-highlight-card" aria-label={t.agenda.highlightOn}>
          <h2>{t.agenda.restWindow}</h2>
          <RestWindowCard rest={restToShow} emphasis />
        </section>
      )}
      <Timeline range={range} lanes={lanes} moves={moves} highlightBlockId={highlightBlockId} nowMs={missionNow} compact />
      <section className="card" aria-labelledby="sleep-h">
        <h2 id="sleep-h">{t.agenda.sleepRecords}</h2>
        <div className="empty-state">
          <span className="status status-noEvidence">{t.companion.noEvidence}</span>
          <p>{t.agenda.noSleepRecords}</p>
          <p className="muted small">{t.agenda.noSleepRecordsBody}</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" aria-expanded={showSource} onClick={() => setShowSource((v) => !v)}>{t.agenda.whyMatters}</button>
        {showSource && <SourceCard sourceId="nasa-hrp-risk-sleep" onClose={() => setShowSource(false)} />}
      </section>
    </div>
  );
}
