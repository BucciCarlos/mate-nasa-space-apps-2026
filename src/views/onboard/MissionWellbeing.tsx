import { useEffect, useRef, useState } from 'react';
import { toHash } from '../../app/routes';
import { FLIGHT_METRICS, METRIC_UNITS, MONITORING_CREW_IDS, TRAJECTORY_STAGES, latestFlightSample } from '../../domain/monitoring';
import { fmtDateTime, fmtInterval, fmtNumber } from '../../i18n/format';
import { HOUR_MS, toMs } from '../../domain/time';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { useApp } from '../../state/AppProvider';
import { selectCompanionPreferences, selectMonitoringProfile, selectOnboard, upcomingBlocks } from '../../state/selectors';
import type { OnboardPage, TrajectoryStage, WellbeingActivity, WellbeingCheckIn, WellbeingProfile } from '../../state/types';
import { useNow } from '../../state/useNow';
import { Badge } from '../shared/Badge';
import { UserTextView } from '../shared/UserTextView';
import { useMissionTime } from '../shared/useMissionTime';
import { CompanionSetup } from './CompanionSetup';
import { LinkBanner } from './LinkBanner';
import { MateAvatar } from './MateAvatar';

const FEELINGS = ['calm', 'tired', 'tense', 'low', 'good'] as const;
const HOBBIES = ['music', 'reading', 'quiet'] as const;
const ACTIVITIES = ['breathing', 'quiet', 'music', 'reading', 'group'] as const;
const onboardHref = (page: OnboardPage) => toHash({ view: 'onboard', page });

function Scale({ label, value, onChange }: { label: string; value?: number; onChange: (value?: number) => void }) {
  const t = useT().wellbeing;
  const locale = useLocale();
  return <label>{label}<select value={value ?? ''} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)}>
    <option value="">{t.skip}</option>
    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 1 ? t.lowEnd : n === 5 ? t.highEnd : fmtNumber(n, locale, 0)}</option>)}
  </select></label>;
}

export function MissionWellbeing() {
  const { state, dispatch } = useApp();
  const messages = useT();
  const t = messages.wellbeing;
  const m = messages.monitoring;
  const locale = useLocale();
  const { mission, user, plan, notices } = selectOnboard(state);
  const mt = useMissionTime(mission.id);
  const now = mt.missionMs(useNow(30_000));
  const upcoming = upcomingBlocks(plan, user.id, now, 3);
  const profile = selectMonitoringProfile(state, user.id);
  const wellbeing = profile.wellbeing;
  const preferences = selectCompanionPreferences(state, user.id);
  const stage = profile.stage ?? 'flight';
  const receivedAt = toMs(mission.clockStart) - HOUR_MS;
  const sentAt = receivedAt - (user.id === MONITORING_CREW_IDS[0] ? 6 : 12) * HOUR_MS;
  const [entry, setEntry] = useState<Omit<WellbeingCheckIn, 'atMs'>>({});
  const [suggestion, setSuggestion] = useState<WellbeingActivity | null>(null);
  const suggestionHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (suggestion) suggestionHeading.current?.focus();
  }, [suggestion]);
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState('');
  const canSave = entry.feeling || entry.stress !== undefined || entry.satisfaction !== undefined || entry.fatigue !== undefined;
  const tasks = plan.blocks.filter((block) => block.kind === 'task' && block.crewIds.includes(user.id));
  const patch = (fields: Partial<typeof entry>) => { setEntry({ ...entry, ...fields }); setSaved(false); };
  const diary = [
    ...(wellbeing?.notes ?? []).map((item, index) => ({
      key: `note-${index}`, at: item.atMs, body: <UserTextView text={item.text} />,
    })),
    ...(wellbeing?.checkIns ?? []).map((checkIn, index) => ({
      key: `check-${index}`, at: checkIn.atMs,
      body: <>{t.check}{checkIn.feeling && <> · {t[checkIn.feeling]}</>}
        {checkIn.stress !== undefined && <> · {t.stress} {checkIn.stress}/5</>}
        {checkIn.taskId && <> · {tasks.find((task) => task.id === checkIn.taskId)?.title[locale] ?? t.task}</>}
        {checkIn.satisfaction !== undefined && <> · {t.satisfaction} {checkIn.satisfaction}/5</>}
        {checkIn.fatigue !== undefined && <> · {t.fatigue} {checkIn.fatigue}/5</>}</>,
    })),
    ...(wellbeing?.decisions ?? []).map((decision, index) => ({
      key: `decision-${index}`, at: decision.atMs,
      body: <>{t[decision.activity]} · {decision.decision === 'completed' ? t.done : t.discard}</>,
    })),
    ...profile.activities.filter((activity) => activity.kind !== 'medical_review').map((activity) => ({
      key: activity.id, at: activity.atMs,
      body: activity.note ? <UserTextView text={activity.note} /> : <>{m.personal_break}</>,
    })),
  ].sort((a, b) => b.at - a.at);

  return (
    <div className="mission-wellbeing">
      <section className="wellbeing-intro" aria-labelledby="view-h">
        <MateAvatar preferences={preferences} stage={stage} />
        <div>
          <h1 id="view-h" tabIndex={-1}>{t.title}</h1>
          <h2>{messages.onboard.greeting({ name: user.name })}</h2>
          <p><strong>{preferences.name}</strong> · {m.guided} · {m.stages[stage]}</p>
          <p>{t.greet}</p>
          <div className="monitoring-buttons">
            <a className="btn btn-primary" href={onboardHref('monitoring')}>{messages.shell.nav.monitoring}</a>
            <button className="btn btn-ghost" type="button" onClick={() => {
              document.getElementById('wellbeing-check')?.focus();
            }}>{t.check}</button>
            <button className="btn btn-ghost" type="button" onClick={() => {
              dispatch({ type: 'ui/companion_toggle', open: true });
              document.getElementById('companion-toggle')?.focus();
            }}>{t.voice}</button>
          </div>
        </div>
      </section>
      <LinkBanner />
      <div className="monitoring-settings">
        <label>{m.profile}<select value={user.id} onChange={(event) => dispatch({ type: 'monitoring/profile_selected', crewId: event.target.value })}>
          {mission.crew.filter((member) => MONITORING_CREW_IDS.includes(member.id)).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select></label>
        <label>{m.stage}<select value={stage} onChange={(event) => dispatch({ type: 'monitoring/stage_set', stage: event.target.value as TrajectoryStage })}>
          {TRAJECTORY_STAGES.map((id) => <option key={id} value={id}>{m.stages[id]}</option>)}
        </select></label>
      </div>
      <div className="wellbeing-grid">
        <section className="panel">
          <h2>{t.indicators}</h2>
          <Badge kind="simulated" />
          <dl>{FLIGHT_METRICS.map((metric) => {
            const sample = latestFlightSample(user.id, metric);
            return <div key={metric}><dt>{m.metrics[metric]}</dt><dd>{sample ? <>{fmtNumber(sample.value, locale)} {METRIC_UNITS[metric]} · {fmtDateTime(sample.at, locale)}</> : m.noValue}</dd></div>;
          })}</dl>
          <a href={onboardHref('monitoring')}>{t.share}</a>
        </section>
        <section className="panel">
          <h2>{messages.onboard.nextBlocks}</h2>
          {upcoming.length === 0 ? <p>{messages.onboard.noNextBlocks}</p> : <ul>{upcoming.map((block) => (
            <li key={block.id}>{block.title[locale]} · {fmtInterval(block, locale)}</li>
          ))}</ul>}
          <div className="monitoring-buttons">
            <a href={onboardHref('agenda')}>{messages.onboard.openAgenda}</a>
            <a href={onboardHref('today')}>{messages.onboard.notices} · {notices.length}</a>
            <a href={onboardHref('observations')}>{messages.shell.nav.observations}</a>
          </div>
        </section>
      </div>
      <section className="panel">
        <h2 id="wellbeing-check" tabIndex={-1}>{t.check}</h2>
        <p>{t.private} {t.scale}</p>
        <form className="monitoring-settings" onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) return;
          dispatch({ type: 'wellbeing/check_in', crewId: user.id, entry: { ...entry, atMs: Date.now() } });
          setSuggestion(entry.feeling === 'tense' ? 'breathing' : wellbeing?.hobby ?? 'quiet');
          setEntry({});
          setSaved(true);
        }}>
          <label>{t.feeling}<select value={entry.feeling ?? ''} onChange={(event) => patch({ feeling: (event.target.value || undefined) as WellbeingCheckIn['feeling'] })}>
            <option value="">{t.skip}</option>
            {FEELINGS.map((feeling) => <option key={feeling} value={feeling}>{t[feeling]}</option>)}
          </select></label>
          <Scale label={t.stress} value={entry.stress} onChange={(stress) => patch({ stress })} />
          <label>{t.task}<select value={entry.taskId ?? ''} onChange={(event) => patch({ taskId: event.target.value || undefined, satisfaction: undefined, fatigue: undefined })}>
            <option value="">{t.skip}</option>
            {tasks.map((task) => <option key={task.id} value={task.id}>{task.title[locale]}</option>)}
          </select></label>
          {entry.taskId && <>
            <Scale label={t.satisfaction} value={entry.satisfaction} onChange={(satisfaction) => patch({ satisfaction })} />
            <Scale label={t.fatigue} value={entry.fatigue} onChange={(fatigue) => patch({ fatigue })} />
          </>}
          <button className="btn btn-primary" type="submit" disabled={!canSave}>{t.save}</button>
        </form>
        {saved && <p role="status">{t.saved}</p>}
        {suggestion && <div className="wellbeing-suggestion" aria-labelledby="wellbeing-suggestion-h">
          <h3 id="wellbeing-suggestion-h" tabIndex={-1} ref={suggestionHeading}>{t.suggest} · {t[suggestion]}</h3>
          <p>{t[`${suggestion}Body`]}</p>
          <p className="small muted">{t.source}</p>
          <div className="monitoring-buttons">
            {(['completed', 'dismissed'] as const).map((decision) => <button type="button" className="btn btn-ghost" key={decision} onClick={() => {
              dispatch({ type: 'wellbeing/decision', crewId: user.id, activity: suggestion, decision, atMs: Date.now() });
              setSuggestion(null);
              document.getElementById('wellbeing-activities')?.focus();
            }}>{t[decision]}</button>)}
          </div>
        </div>}
      </section>
      <section className="panel">
        <h2 id="wellbeing-activities" tabIndex={-1}>{t.activity}</h2>
        <label className="monitoring-select">{t.hobby}<select value={wellbeing?.hobby ?? ''} onChange={(event) => dispatch({
          type: 'wellbeing/hobby', crewId: user.id, hobby: (event.target.value || undefined) as WellbeingProfile['hobby'],
        })}>
          <option value="">{t.skip}</option>
          {HOBBIES.map((hobby) => <option key={hobby} value={hobby}>{t[hobby]}</option>)}
        </select></label>
        <div className="monitoring-buttons">{ACTIVITIES.map((activity) => <button key={activity} type="button" className="btn btn-ghost" onClick={() => {
          setSuggestion(activity);
          if (suggestion === activity) document.getElementById('wellbeing-suggestion-h')?.focus();
        }}>{t[activity]}</button>)}</div>
      </section>
      <div className="wellbeing-grid">
        <section className="panel">
          <h2>{t.history}</h2>
          <form className="monitoring-settings" onSubmit={(event) => {
            event.preventDefault();
            if (!note.trim()) return;
            dispatch({ type: 'wellbeing/note', crewId: user.id, note: { text: note.trim(), lang: locale }, atMs: Date.now() });
            setNote('');
          }}>
            <label>{m.journal}<textarea maxLength={600} value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <button type="submit" className="btn btn-ghost" disabled={!note.trim()}>{m.saveNote}</button>
          </form>
          {diary.length ? <ul className="row-list">{diary.map((item) => <li className="row" key={item.key}>{mt.dateTime(item.at)} · {item.body}</li>)}</ul> : <p>{m.empty}</p>}
        </section>
        <section className="panel">
          <h2>{t.family}</h2>
          <p className="muted small">{t.familySent} · {fmtDateTime(sentAt, locale)}<br />{t.familyReceived} · {fmtDateTime(receivedAt, locale)}</p>
          <p>{user.id === MONITORING_CREW_IDS[0] ? t.familyBody : t.familyAlternate}</p>
          {wellbeing?.familyRead ? <p role="status">{t.read}</p> : <button type="button" className="btn btn-ghost" onClick={() =>
            dispatch({ type: 'wellbeing/family_read', crewId: user.id })}>{t.familyRead}</button>}
        </section>
      </div>
      <CompanionSetup initial={preferences} stage={stage} />
    </div>
  );
}
