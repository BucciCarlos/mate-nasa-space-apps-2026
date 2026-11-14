import { useApp } from '../../state/AppProvider';
import { uiObservationPrefill } from '../../state/mateSlice';
import { selectOnboard, upcomingBlocks } from '../../state/selectors';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { fmtInterval, fmtDate } from '../../i18n/format';
import { navigate } from '../../app/routes';
import { Badge } from '../shared/Badge';
import { NoticeCard } from './NoticeCard';
import { LinkBanner } from './LinkBanner';
import { useNow } from '../../state/useNow';
import { missionTimeMs } from '../../domain/time';
import { ONBOARD_MISSION_ID } from '../../state/types';

export function OnboardToday() {
  const { state } = useApp();
  const t = useT();
  const locale = useLocale();
  const now = useNow(30_000);
  const { mission, user, plan, notices } = selectOnboard(state);
  const missionNow = missionTimeMs(mission.clockStart, state.sessionStartMs, now);
  const next = upcomingBlocks(plan, user.id, missionNow, 3);
  const recent = [...notices].reverse();

  return (
    <div className="onboard-today">
      <h1 id="view-h" tabIndex={-1}>{t.onboard.greeting({ name: user.name })}</h1>
      <p className="muted">{t.onboard.todayIntro} <Badge kind="simulated" /></p>
      <LinkBanner />
      <section aria-labelledby="notices-h" className="card">
        <h2 id="notices-h">{t.onboard.notices}</h2>
        {recent.length === 0 ? <p className="empty">{t.onboard.noNotices}</p> : recent.map((n) => <NoticeCard key={n.id} notice={n} />)}
      </section>
      <section aria-labelledby="next-h" className="card">
        <h2 id="next-h">{t.onboard.nextBlocks}</h2>
        {next.length === 0 ? <p className="empty">{t.onboard.noNextBlocks}</p> : (
          <ul className="next-list">
            {next.map((b) => (
              <li key={b.id} className={`next-item kind-${b.kind}`}>
                <span className="blk-kind">{t.blocks[b.kind]}</span>
                <span className="next-title">{b.title[locale]}</span>
                <span className="mono">{fmtDate(b.start, locale)} · {fmtInterval(b, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="quick-actions">
        <button type="button" className="btn btn-primary" onClick={() => navigate({ view: 'onboard', page: 'agenda' })}>{t.onboard.openAgenda}</button>
        <button type="button" className="btn" onClick={() => { uiObservationPrefill({ relatedChangeId: recent[0]?.changeId ?? null, topics: [] }); navigate({ view: 'onboard', page: 'observations' }); }}>
          {t.onboard.logObservation}
        </button>
      </div>
      <span className="sr-only">{ONBOARD_MISSION_ID}</span>
    </div>
  );
}
