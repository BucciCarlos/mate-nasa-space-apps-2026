import type { GroundRole, MissionId } from '../../state/types';
import { useApp } from '../../state/AppProvider';
import { selectGroundLog } from '../../state/selectors';
import { useT } from '../../i18n/I18nProvider';
import { LogList } from '../shared/LogList';

export function GroundLog({ missionId, role }: { missionId: MissionId; role: GroundRole }) {
  const { state } = useApp();
  const t = useT();
  const entries = selectGroundLog(state, missionId, role);
  return (
    <section className="border border-line rounded-md bg-bg2 p-4" aria-labelledby="log-h">
      <h1 id="log-h">{t.ground.logTitle}</h1>
      <p className="text-fg2 text-fs0 mt-1 mb-3">{t.ground.roleNote}</p>
      <LogList entries={entries} missionId={missionId} />
    </section>
  );
}
