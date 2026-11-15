import { useState } from 'react';
import type { FormEvent } from 'react';
import { FLIGHT_METRICS, METRIC_UNITS, MONITORING_CREW_IDS, TRAJECTORY_STAGES, latestFlightSample, monitoringSeries } from '../../domain/monitoring';
import { flightDay } from '../../domain/time';
import { fmtDateTime, fmtNumber } from '../../i18n/format';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { useApp } from '../../state/AppProvider';
import { selectCompanionPreferences, selectMonitoringProfile, selectOnboard, selectOwnMedicalReviews } from '../../state/selectors';
import type { FlightMetric, MessageStatus, TrajectoryStage } from '../../state/types';
import { FlightSampleText } from '../shared/FlightSampleText';
import { UserTextView } from '../shared/UserTextView';
import { useMissionTime } from '../shared/useMissionTime';
import { ResearchEvidence } from './ResearchEvidence';
import { CompanionSetup } from './CompanionSetup';

function DeliveryStatus({ status }: { status: MessageStatus }) {
  const t = useT();
  return <>{status === 'in_transit' ? t.message.inTransit : t.message[status]}</>;
}

function MetricTrend({ points, mean, label }: { points: { value: number | null }[]; mean: number | null; label: string }) {
  const values = points.flatMap((point) => point.value === null ? [] : [point.value]);
  if (mean !== null) values.push(mean);
  if (values.length === 0) return null;
  const low = Math.min(...values);
  const span = Math.max(...values) - low || 1;
  const x = (index: number) => 16 + index * 288 / (points.length - 1);
  const y = (value: number) => 96 - 80 * (value - low) / span;
  return (
    <svg className="metric-trend" viewBox="0 0 320 112" role="img" aria-label={label}>
      {mean !== null && <line className="metric-baseline" x1="16" x2="304" y1={y(mean)} y2={y(mean)} />}
      {points.map(({ value }, i) => {
        const previous = points[i - 1]?.value;
        if (value === null) return null;
        return (
          <g key={i}>
            {previous != null && <line x1={x(i - 1)} x2={x(i)} y1={y(previous)} y2={y(value)} />}
            <circle cx={x(i)} cy={y(value)} r="3" />
          </g>
        );
      })}
    </svg>
  );
}

export function FlightMonitoring() {
  const { state, dispatch } = useApp();
  const messages = useT();
  const t = messages.monitoring;
  const locale = useLocale();
  const { mission, user } = selectOnboard(state);
  const mt = useMissionTime(mission.id);
  const profile = selectMonitoringProfile(state, user.id);
  const [metric, setMetric] = useState<FlightMetric>('reaction');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState('');
  const { baseline, flight, mean } = monitoringSeries(user.id, metric);
  const sample = latestFlightSample(user.id, metric);
  const unit = METRIC_UNITS[metric];
  const delta = sample && mean !== null ? sample.value - mean : null;
  const valueText = (value: number | null) => value === null ? t.noValue : `${fmtNumber(value, locale)} ${unit}`;
  const reviews = selectOwnMedicalReviews(state);

  function submitReview(event: FormEvent) {
    event.preventDefault();
    if (!consent || !sample) return;
    dispatch({ type: 'monitoring/review_requested', crewId: user.id, metric, consent: true, nowMs: Date.now() });
    setConsent(false);
    setReviewOpen(false);
  }

  return (
    <div className="monitoring">
      <section className="panel" aria-labelledby="view-h">
        <h1 id="view-h" tabIndex={-1}>{t.title}</h1>
        <p>{t.intro}</p>
        <div className="monitoring-settings">
          <label>{t.profile}<select value={user.id} onChange={(event) => dispatch({ type: 'monitoring/profile_selected', crewId: event.target.value })}>
            {mission.crew.filter((crew) => MONITORING_CREW_IDS.includes(crew.id)).map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}
          </select></label>
          <label>{t.stage}<select value={profile.stage ?? 'flight'} onChange={(event) => dispatch({ type: 'monitoring/stage_set', stage: event.target.value as TrajectoryStage })}>
            {TRAJECTORY_STAGES.map((stage) => <option key={stage} value={stage}>{t.stages[stage]}</option>)}
          </select></label>
        </div>
        <p className="muted small">{t.trajectoryNote}</p>
      </section>

      <section className="panel" aria-labelledby="metric-h">
        <div className="monitoring-buttons" role="group" aria-label={t.measurements}>
          {FLIGHT_METRICS.map((id) => <button key={id} className={`btn ${id === metric ? 'btn-primary' : 'btn-ghost'}`} type="button" aria-pressed={id === metric} onClick={() => {
            setMetric(id);
            setConsent(false);
          }}>{t.metrics[id]}</button>)}
        </div>
        <h2 id="metric-h">{t.metrics[metric]}</h2>
        <p className="muted small">{t.simulated} · {t.calculated}</p>
        <dl className="monitoring-values">
          <div><dt>{t.latest}</dt><dd>{valueText(sample?.value ?? null)}</dd>{sample && <dd className="small">{fmtDateTime(sample.at, locale)}</dd>}</div>
          <div><dt>{t.baseline}</dt><dd>{valueText(mean)}</dd></div>
          <div><dt>{t.difference}</dt><dd>{delta === null ? t.noValue : `${delta > 0 ? '+' : ''}${valueText(delta)}`}</dd></div>
        </dl>
        <MetricTrend points={flight} mean={mean} label={`${t.metrics[metric]} · ${t.simulated} · ${t.baseline}`} />
        <ol className="metric-days" aria-label={t.flightDay}>
          {flight.map((point) => <li key={point.at}>{messages.common.flightDay({ day: flightDay(mission.flightDayOne, Date.parse(point.at)) })}</li>)}
        </ol>
        <details>
          <summary>{t.measurements}</summary>
          <table className="monitoring-table">
            <thead><tr><th scope="col">{t.date}</th><th scope="col">{t.flightDay}</th><th scope="col">{t.value}</th></tr></thead>
            <tbody>{flight.map((point) => <tr key={point.at}><td>{fmtDateTime(point.at, locale)}</td><td>{flightDay(mission.flightDayOne, Date.parse(point.at))}</td><td>{valueText(point.value)}</td></tr>)}</tbody>
          </table>
        </details>
        <details>
          <summary>{t.baselineMeasurements}</summary>
          <p>{t.baselineMethod}</p>
          <ul>{baseline.map((point) => <li key={point.at}>{fmtDateTime(point.at, locale)} · {valueText(point.value)}</li>)}</ul>
        </details>
        <button className="btn btn-ghost" type="button" onClick={() => {
          dispatch({ type: 'ui/companion_toggle', open: true });
          dispatch({ type: 'companion/asked', missionId: mission.id, input: { mode: 'chip', intent: 'monitoring.explain', metric, text: { text: messages.intents['monitoring.explain'], lang: locale } }, nowMs: Date.now() });
        }}>{messages.intents['monitoring.explain']}</button>
      </section>

      <section className="panel">
        <h2>{t.actions}</h2>
        <p className="muted small">{t.suggestion}</p>
        <p>{t.breakSuggestion}</p>
        <div className="monitoring-buttons">
          <button className="btn btn-ghost" type="button" onClick={() => dispatch({ type: 'monitoring/activity_saved', crewId: user.id, metric, kind: 'personal_break', nowMs: Date.now() })}>{t.recordBreak}</button>
          <button className="btn btn-primary" type="button" aria-expanded={reviewOpen} disabled={!sample} onClick={() => {
            setReviewOpen(!reviewOpen);
            setConsent(false);
          }}>{t.request}</button>
        </div>
        {reviewOpen && sample && (
          <form className="monitoring-review" onSubmit={submitReview}>
            <h3>{t.preview}</h3>
            <p>{user.name} · <FlightSampleText sample={sample} /></p>
            <p>{t.privateBody}</p>
            <label className="monitoring-consent"><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} />{t.consent}</label>
            <button className="btn btn-primary" type="submit" disabled={!consent}>{t.send}</button>
          </form>
        )}
        <form className="monitoring-settings" onSubmit={(event) => {
          event.preventDefault();
          if (!note.trim()) return;
          dispatch({ type: 'monitoring/activity_saved', crewId: user.id, metric, kind: 'journal', note: { text: note.trim(), lang: locale }, nowMs: Date.now() });
          setNote('');
        }}>
          <label>{t.journal}<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={600} /></label>
          <button className="btn btn-ghost" type="submit" disabled={!note.trim()}>{t.saveNote}</button>
        </form>
        <h3>{t.log}</h3>
        {profile.activities.length === 0 ? <p>{t.empty}</p> : (
          <ul className="row-list">{[...profile.activities].reverse().map((activity) => (
            <li className="row" key={activity.id}>{mt.dateTime(activity.atMs)} · {activity.kind === 'journal' ? t.journalSaved : t[activity.kind]} · {t.metrics[activity.metric]}
              {activity.note && <span className="monitoring-note">{t.personal} · <UserTextView text={activity.note} /></span>}
            </li>
          ))}</ul>
        )}
        <h3>{t.outbox}</h3>
        <p>{t.link} · {mission.link.status === 'up' ? messages.link.up : messages.link.down}</p>
        <div role="status">
          {reviews.length === 0 ? <p>{t.empty}</p> : (
            <ul className="row-list">{reviews.map((review) => <li className="row" key={review.id}><FlightSampleText sample={review.sample} /> · <DeliveryStatus status={review.status} /></li>)}</ul>
          )}
        </div>
      </section>
      <CompanionSetup initial={selectCompanionPreferences(state, user.id)} stage={profile.stage ?? 'flight'} />
      <ResearchEvidence />
    </div>
  );
}
