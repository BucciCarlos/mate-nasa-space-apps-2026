import { scheduleClock, scheduleInterval } from '../../demo/fd30Day';
import { useLocale } from '../../i18n/I18nProvider';
import type { GroundMedicalPerson } from './groundMedical';
import { GROUND_MEDICAL_TEXT } from './groundMedicalText';
import { GroundSleepChart } from './GroundSleepChart';
import './groundMedical.css';

export function GroundMedicalDashboard({ data }: { data: GroundMedicalPerson }) {
  const locale = useLocale(), t = GROUND_MEDICAL_TEXT[locale];
  const latestNight = data.sleep.points.at(-1), latestExercise = data.exercise.latest;
  const nightDuration = (minutes: number) => `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  const number = (value: number | null) => value === null ? t.unavailable : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  // Historical records retain their own times; the operational day clip must not turn FD29 into 00:00.
  const recordInterval = (record: { start: string; end: string }) => `${scheduleClock(record.start)}–${scheduleClock(record.end)} ${t.utc}`;
  return <section className="gmd" data-ground-medical={data.id} aria-labelledby="gmd-h">
    <div className="gmd-heading"><h2 id="gmd-h">{t.title}</h2><p>{t.intro}</p></div>
    <div className="gmd-top">
      <div className="gmd-vitals" data-health-block="vitals">
        <article data-health-metric="pulse" data-value={data.pulse.value ?? 'missing'} data-origin={data.pulse.kind}>
          <h3>{t.heart}</h3><p className="gmd-value">{data.pulse.value ?? '—'}<small>{t.bpm}</small></p>
          <p>{data.pulse.kind === 'exercise' ? t.sessionPulse : t.clockPattern}</p>
          {data.pulse.value === null && <p>{t.missingPulse}</p>}
          <time>{scheduleClock(data.time)} {t.utc}</time>
        </article>
        <article data-health-metric="spo2" data-value={data.spo2.value} data-origin={data.spo2.kind}>
          <h3>{t.spo2}</h3><p className="gmd-value">{data.spo2.value}<small>{t.percent}</small></p><p>{t.clockPattern}</p>
          <time>{scheduleClock(data.time)} {t.utc}</time>
        </article>
      </div>
      <div className="gmd-sleep" data-health-block="sleep">
        <p className="gmd-latest">{t.sleepLatest}: {latestNight ? <strong>{`FD${latestNight.fd} · ${nightDuration(latestNight.durationMinutes)}`}</strong> : t.sleepMissing}</p>
        {!data.sleep.points.some(p => p.fd === 30) && <p className="gmd-empty" data-gap="sleep">{data.scenario.sleep ? t.fd30Missing : t.fd30NotInScenario}</p>}
        <GroundSleepChart trend={data.sleep} compact />
      </div>
    </div>
    <div className="gmd-records">
      <section className="gmd-panel" data-health-block="laboratory" aria-labelledby="gmd-lab-h">
        <h3 id="gmd-lab-h">{t.laboratory}</h3>
        {!data.labs.length ? <p className="gmd-empty" data-gap="laboratory">{data.scenario.laboratory ? t.noSamples : t.noSamplesScenario}</p> : <ul>{data.labs.map(sample => <li key={sample.id}>
          <strong>{sample.sampleType === 'blood' ? t.blood : t.urine}</strong><span>{sample.stored ? t.stored : t[sample.stage]}</span>
          <time>{`${sample.occurredAt.slice(0, 10)} · ${scheduleClock(sample.occurredAt)} ${t.utc}`}</time>
          <small>{sample.stage === 'result' ? t.noValues : t.noResult}{sample.incomplete && ` · ${t.incomplete}`}</small>
        </li>)}</ul>}
      </section>
      <section className="gmd-panel" data-health-block="exercise" aria-labelledby="gmd-exercise-h">
        <h3 id="gmd-exercise-h">{t.exercise}</h3>
        {data.exercise.live ? <p><strong>{t.live}</strong> · <time>{scheduleClock(data.exercise.live.start)} {t.utc}</time><span>{number(data.exercise.live.elapsedMinutes)} {t.elapsed}</span></p> : <p className="gmd-empty" data-gap="exercise-live">{data.scenario.exercise ? t.noLive : t.noLiveScenario}</p>}
        {latestExercise ? <p data-exercise-record={latestExercise.id}><strong>{t.completed} · {`FD${latestExercise.fd}`}</strong><time>{recordInterval(latestExercise)}</time>
          <span>{number(latestExercise.durationMinutes)} {t.minutes} · {number(latestExercise.powerW)} {t.power} · {number(latestExercise.cadenceRpm)} {t.cadence}</span></p> : <p className="gmd-empty" data-gap="exercise-record">{data.scenario.exercise ? t.noSession : t.noSessionScenario}</p>}
        {data.exercise.reservation && <p className="gmd-reservation"><small>{t.reservation}</small><time>{scheduleInterval(data.exercise.reservation)}</time><span>{data.exercise.reservation.equipment?.[locale]}</span></p>}
      </section>
    </div>
    <details className="gmd-provenance"><summary>{t.details}</summary>
      <p>{t.source}: {data.pulse.sourceId} · {data.pulse.version} / {data.spo2.version}</p>
      <ul>{data.labs.map(s => <li key={s.id}><code>{s.id}</code> · {s.sourceId} · {s.version} · {t.occurred}: {s.occurredAt} · {t.received}: {s.receivedAt} · {t.noValues}</li>)}</ul>
      {data.exercise.live && <p><code>{data.exercise.live.id}</code> · {t.received}: {data.exercise.live.receivedAt}</p>}
      {latestExercise && <p><code>{latestExercise.id}</code> · {latestExercise.sourceId} · {latestExercise.version} · {t.received}: {latestExercise.receivedAt}</p>}
    </details>
  </section>;
}
