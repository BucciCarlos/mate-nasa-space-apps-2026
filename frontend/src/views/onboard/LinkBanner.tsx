import { useApp } from '../../state/AppProvider';
import { useT } from '../../i18n/I18nProvider';
import { useMissionTime } from '../shared/useMissionTime';
import { ONBOARD_MISSION_ID } from '../../state/types';

export function LinkBanner() {
  const { state } = useApp();
  const t = useT();
  const mt = useMissionTime(ONBOARD_MISSION_ID);
  const link = state.missions[ONBOARD_MISSION_ID].link;
  if (link.status === 'up' || link.downSinceMs === null) return null;
  return (
    <div className="my-2 px-3 py-2 rounded-md border border-red border-l-4 bg-red-bg text-red font-semibold" role="status">
      <span aria-hidden="true">⚠</span> {t.onboard.linkDownBanner({ time: mt.time(link.downSinceMs) })}
    </div>
  );
}
