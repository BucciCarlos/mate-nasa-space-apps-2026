import type { GroundRole, MissionId } from '../../state/types';
import { useApp } from '../../state/AppProvider';
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
    if (items.length === 0) return <p className="empty">{t.link.noMessages}</p>;
    return (
      <ul className="row-list">
        {items.map((r) => (
          <li key={r.id} className="row">
            <span className="mono">{mt.time(r.createdAtMs)}</span>
            <span>{r.direction === 'uplink' ? t.link.planUpdate({ version: r.planVersion }) : t.ground.downlinkPending}</span>
            <StatusBadge kind={r.status} label={statusLabel(r.status)} />
            <span className="muted small">{since(r)}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="ground-link">
      <section className="panel" aria-labelledby="link-h">
        <div className="panel-head">
          <h1 id="link-h">{t.shell.nav.link}</h1>
          <StatusBadge kind={up ? 'up' : 'down'} label={up ? t.link.up : t.link.down} />
          <Badge kind="simulated" />
        </div>
        {!up && m.link.downSinceMs !== null && <p className="warn">{t.link.downSince({ time: mt.time(m.link.downSinceMs) })}</p>}
        <p className="muted">{t.link.pacingNote} · {t.link.transit({ seconds: String(m.link.transitMs / 1000) })}</p>
        <p className="muted small">{t.link.confirmationNote}</p>
        {canToggle ? (
          <button type="button" className={`btn ${up ? 'btn-danger' : 'btn-primary'}`} onClick={() => dispatch({ type: 'link/status_set', missionId, status: up ? 'down' : 'up', nowMs: Date.now() })}>
            {up ? t.link.setDown : t.link.setUp}
          </button>
        ) : <p className="muted">{t.link.operatorOnly}</p>}
      </section>
      <div className="operations-streams">
        <section className="panel" aria-labelledby="uplink-h">
          <h2 id="uplink-h">{t.link.uplink}</h2>
          {list('uplink')}
        </section>
        <section className="panel" aria-labelledby="downlink-h">
          <h2 id="downlink-h">{t.link.downlink}</h2>
          {list('downlink')}
        </section>
      </div>
    </div>
  );
}
