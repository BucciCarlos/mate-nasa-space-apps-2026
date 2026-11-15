import { useApp } from '../../state/AppProvider';
import { uiObservationPrefill } from '../../state/mateSlice';
import { selectOnboard, upcomingBlocks } from '../../state/selectors';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { fmtInterval, fmtDate } from '../../i18n/format';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../shared/Badge';
import { NoticeCard } from './NoticeCard';
import { LinkBanner } from './LinkBanner';
import { useNow } from '../../state/useNow';
import { missionTimeMs } from '../../domain/time';
import { ONBOARD_MISSION_ID } from '../../state/types';

// Block kind → left border color (matches base.css .next-item.kind-*).
const KIND_BORDER: Record<string, string> = {
  sleep: 'border-l-[rgba(80,100,160,0.6)]',
  pre_sleep: 'border-l-[rgba(80,100,160,0.4)]',
  post_sleep: 'border-l-[rgba(80,100,160,0.4)]',
  task: 'border-l-accent',
  exercise: 'border-l-green',
  meal: 'border-l-amber',
  personal: 'border-l-fg2',
  conference: 'border-l-fg2',
};

export function OnboardToday() {
  const { state, dispatch } = useApp();
  const t = useT();
  const locale = useLocale();
  const now = useNow(30_000);
  const navigate = useNavigate();
  const { mission, user, plan, notices } = selectOnboard(state);
  const missionNow = missionTimeMs(mission.clockStart, state.sessionStartMs, now);
  const next = upcomingBlocks(plan, user.id, missionNow, 3);
  const recent = [...notices].reverse();

  return (
    <div>
      <h1 id="view-h" tabIndex={-1}>{t.onboard.greeting({ name: user.name })}</h1>
      <p className="text-fg2">{t.onboard.todayIntro} <Badge kind="simulated" /></p>
      <LinkBanner />
      <section aria-labelledby="notices-h" className="border border-line rounded-md px-4 py-4 my-4 bg-bg2">
        <h2 id="notices-h">{t.onboard.notices}</h2>
        {recent.length === 0 ? <p className="text-center text-fg2 py-4">{t.onboard.noNotices}</p> : recent.map((n) => <NoticeCard key={n.id} notice={n} />)}
      </section>
      <section aria-labelledby="next-h" className="border border-line rounded-md px-4 py-4 my-4 bg-bg2">
        <h2 id="next-h">{t.onboard.nextBlocks}</h2>
        {next.length === 0 ? <p className="text-center text-fg2 py-4">{t.onboard.noNextBlocks}</p> : (
          <ul className="flex flex-col gap-2 my-2">
            {next.map((b) => (
              <li key={b.id} className={`flex flex-wrap gap-2 items-center px-3 py-2 rounded border border-line border-l-4 bg-bg3 ${KIND_BORDER[b.kind] ?? 'border-l-fg2'}`}>
                <span className="uppercase tracking-[0.06em] text-[9px] opacity-80">{t.blocks[b.kind]}</span>
                <span className="font-semibold">{b.title[locale]}</span>
                <span className="font-mono text-fs0 text-fg2">{fmtDate(b.start, locale)} · {fmtInterval(b, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="flex flex-wrap gap-2 my-3">
        <button type="button" className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-bold bg-accent text-accent-fg border border-transparent cursor-pointer" onClick={() => navigate('/onboard/agenda')}>{t.onboard.openAgenda}</button>
        <button type="button" className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-line bg-transparent text-fg cursor-pointer" onClick={() => { dispatch(uiObservationPrefill({ relatedChangeId: recent[0]?.changeId ?? null, topics: [] })); navigate('/onboard/observations'); }}>
          {t.onboard.logObservation}
        </button>
      </div>
      <span className="sr-only">{ONBOARD_MISSION_ID}</span>
    </div>
  );
}
