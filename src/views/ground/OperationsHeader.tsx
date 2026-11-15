import { toHash } from '../../app/routes';
import { flightDay } from '../../domain/time';
import { fmtNumber, fmtTime } from '../../i18n/format';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { useApp } from '../../state/AppProvider';
import { selectGroundLinkRows } from '../../state/selectors';
import type { GroundPage, MissionId } from '../../state/types';
import { useNow } from '../../state/useNow';
import { Badge, StatusBadge } from '../shared/Badge';
import { useMissionTime } from '../shared/useMissionTime';

export function OperationsHeader({ missionId, page }: { missionId: MissionId; page: GroundPage }) {
  const { state } = useApp();
  const t = useT();
  const locale = useLocale();
  const now = useMissionTime(missionId).missionMs(useNow(10_000));
  const mission = state.missions[missionId];
  const isCommander = page === 'commander';
  const stats = [
    { page: 'crew', label: t.shell.nav.crew, value: mission.crew.length },
    { page: 'agenda', label: t.operations.activities, value: (isCommander ? mission.onboard.plan : mission.ground.plan).blocks.length },
  ] as const;
  const pending = isCommander ? null : selectGroundLinkRows(state, missionId, state.groundRole)
    .filter((message) => message.status !== 'delivered').length;

  return (
    <section className="operations-header" aria-labelledby="operations-h">
      <div className="operations-context">
        <div>
          <p id="operations-h" className="operations-title">{t.operations.title}</p>
          <p>{t.shell.mission[missionId]} · {t.common.flightDay({ day: flightDay(mission.flightDayOne, now) })} · <time className="mono" dateTime={new Date(now).toISOString()}>{fmtTime(now, locale)}</time></p>
        </div>
        <div className="operations-indicators">
          <Badge kind="simulated" />
          <StatusBadge kind={mission.link.status} label={t.link[mission.link.status]} />
          <span>{isCommander ? t.shell.nav.commander : state.groundRole === 'mission_operator' ? t.shell.role.missionOperator : t.shell.role.medicalProfessional}</span>
        </div>
      </div>
      <ul className="operations-stats">
        {stats.map((stat) => (
          <li key={stat.page}>
            {isCommander ? <div>
              <span>{stat.label}</span><strong className="mono">{fmtNumber(stat.value, locale, 0)}</strong>
            </div> : <a href={toHash({ view: 'ground', missionId, page: stat.page })}>
              <span>{stat.label}</span><strong className="mono">{fmtNumber(stat.value, locale, 0)}</strong>
            </a>}
          </li>
        ))}
        {pending !== null && <li><a href={toHash({ view: 'ground', missionId, page: 'link' })}>
          <span>{t.operations.pending}</span><strong className="mono">{fmtNumber(pending, locale, 0)}</strong>
        </a></li>}
      </ul>
    </section>
  );
}
