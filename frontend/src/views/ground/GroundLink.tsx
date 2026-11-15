import type { GroundRole, MissionId } from '../../state/types';
import { useApp } from '../../state/AppProvider';
import { linkStatusSet } from '../../state/mateSlice';
import { selectGroundLinkRows } from '../../state/selectors';
import type { GroundLinkRow } from '../../state/selectors';
import { useT } from '../../i18n/I18nProvider';
import { StatusBadge, Badge } from '../shared/Badge';
import { useMissionTime } from '../shared/useMissionTime';

export function GroundLink({ missionId, role }: { missionId: MissionId; role: GroundRole }) {
  const { state, dispatch } = useApp();
  const t = useT();
  const mt = useMissionTime(missionId);
  const m = state.missions[missionId];
  const rows = selectGroundLinkRows(state, missionId, role);
  const up = m.link.status === 'up';
  const canToggle = role === 'mission_operator';
  const statusLabel = (s: GroundLinkRow['status']) => (s === 'queued' ? t.message.queued : s === 'in_transit' ? t.message.inTransit : t.message.delivered);
  const since = (r: GroundLinkRow) => (r.status === 'queued' ? t.link.queuedSince({ time: mt.time(r.statusSinceMs) }) : r.status === 'in_transit' ? t.link.inTransitSince({ time: mt.time(r.statusSinceMs) }) : t.link.deliveredAt({ time: mt.time(r.deliveredAtMs ?? r.statusSinceMs) }));

  const list = (dir: 'uplink' | 'downlink') => {
    const items = rows.filter((r) => r.direction === dir);
    if (items.length === 0) return <p className="text-center text-fg2 py-4">{t.link.noMessages}</p>;
    return (
      <ul className="flex flex-col divide-y divide-line border border-line rounded-md overflow-hidden">
        {items.map((r) => (
          <li key={r.id} className="flex flex-wrap gap-2 items-center px-3 py-2">
            <span className="font-mono text-fs0 text-fg2">{mt.time(r.createdAtMs)}</span>
            <span>{r.direction === 'uplink' ? t.link.planUpdate({ version: r.planVersion }) : t.ground.downlinkPending}</span>
            <StatusBadge kind={r.status} label={statusLabel(r.status)} />
            <span className="text-fg2 text-fs0">{since(r)}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="border border-line rounded-md bg-bg2 p-4" aria-labelledby="link-h">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 id="link-h">{t.shell.nav.link}</h1>
          <StatusBadge kind={up ? 'up' : 'down'} label={up ? t.link.up : t.link.down} />
          <Badge kind="simulated" />
        </div>
        {!up && m.link.downSinceMs !== null && <p className="text-red text-fs0 font-semibold mt-2">{t.link.downSince({ time: mt.time(m.link.downSinceMs) })}</p>}
        <p className="text-fg2 text-fs0 mt-2">{t.link.pacingNote} · {t.link.transit({ seconds: String(m.link.transitMs / 1000) })}</p>
        <p className="text-fg2 text-fs0">{t.link.confirmationNote}</p>
        {canToggle ? (
          <button type="button" className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-md font-bold border cursor-pointer ${up ? 'bg-red text-white border-red' : 'bg-accent text-accent-fg border-transparent'}`} onClick={() => dispatch(linkStatusSet(missionId, up ? 'down' : 'up', Date.now()))}>
            {up ? t.link.setDown : t.link.setUp}
          </button>
        ) : <p className="text-fg2 text-fs0 mt-2">{t.link.operatorOnly}</p>}
      </section>
      <section className="border border-line rounded-md bg-bg2 p-4" aria-labelledby="uplink-h">
        <h2 id="uplink-h">{t.link.uplink}</h2>
        {list('uplink')}
      </section>
      <section className="border border-line rounded-md bg-bg2 p-4" aria-labelledby="downlink-h">
        <h2 id="downlink-h">{t.link.downlink}</h2>
        {list('downlink')}
      </section>
    </div>
  );
}
