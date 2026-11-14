import type { MissionId } from '../../state/types';
import { useApp } from '../../state/AppProvider';
import { useNow } from '../../state/useNow';
import { selectCommander } from '../../state/selectors';
import { useT } from '../../i18n/I18nProvider';
import { useMissionTime } from '../shared/useMissionTime';
import { OperationsTimeline } from './OperationsTimeline';
import { Badge } from '../shared/Badge';

export function Commander({ missionId }: { missionId: MissionId }) {
  const { state } = useApp();
  const t = useT();
  const { plan, crew, linkStatus, clockStart } = selectCommander(state, missionId);
  const nowMs = useMissionTime(missionId).missionMs(useNow(10_000));
  return (
    <section className="panel" aria-labelledby="view-h">
      <div className="panel-head"><h1 id="view-h" tabIndex={-1}>{t.monitoring.commander}</h1><Badge kind="simulated" /></div>
      <p>{t.monitoring.commanderIntro}</p>
      <p role="status">{linkStatus === 'up' ? t.link.up : t.link.down}</p>
      <OperationsTimeline key={missionId} missionStart={clockStart} lanes={crew.map((member) => ({ crew: member, blocks: plan.blocks.filter((block) => block.crewIds.includes(member.id)) }))} nowMs={nowMs} />
    </section>
  );
}
