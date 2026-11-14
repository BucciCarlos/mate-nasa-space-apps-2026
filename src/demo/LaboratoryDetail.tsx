import { useEffect, useRef } from 'react';
import { useT } from '../i18n/I18nProvider';
import { OWNER } from './fd30';
import type { CrewId, PreviewState } from './fd30';
import { BLOOD_SAMPLE, HISTORICAL_BLOOD_SAMPLE, LAB_PLAN, LAB_VERSION, URINE_SAMPLE, labEvents, labIncomplete, labSamples } from './laboratory';
import type { LabSample, SampleType } from './laboratory';

export const labHeadingId = (id: string) => `fd-lab-${id}`;

function Sample({ sample, sampleType, historical = false, highlighted = false }: {
  sample?: LabSample; sampleType: SampleType; historical?: boolean; highlighted?: boolean;
}) {
  const t = useT().fd30;
  const heading = useRef<HTMLHeadingElement>(null);
  const plan = LAB_PLAN[sampleType];
  const id = sample?.id ?? (sampleType === 'blood' ? BLOOD_SAMPLE : URINE_SAMPLE);
  const events = sample ? labEvents(sample) : [];
  const review = sample?.result?.sourceReview ?? 'not_reported';
  const steps = [
    { label: t.labTaken, event: sample?.collection },
    { label: t.labAnalyzing, event: sample?.analysis },
    { label: t.labResult, event: sample?.result },
  ];
  useEffect(() => {
    if (highlighted) { heading.current?.focus(); heading.current?.scrollIntoView({ block: 'center' }); }
  }, [highlighted]);
  return <article className={`fd-lab-sample${highlighted ? ' fd-session-highlight' : ''}`} data-sample-id={id} aria-labelledby={labHeadingId(id)}>
    <div className="fd-record-heading"><h2 id={labHeadingId(id)} ref={heading} tabIndex={-1}>{historical ? t.labHistoryTitle : sampleType === 'blood' ? t.labBlood : t.labUrine}</h2><span className="fd-tag">{t.simulated}</span>{highlighted && <span className="fd-tag">{t.labHighlight}</span>}</div>
    <p className="fd-eyebrow">{historical ? t.historySource : t.labCurrent}</p>
    {historical ? <><p>{t.labHistoryBody}</p><p className="fd-lab-stored">{sample?.collection?.handlingStatus === 'stored_awaiting_analysis' ? t.labStored : t.labHandlingMissing}</p><p>{t.labNoResult}</p></> : <>
      <aside className="fd-lab-future"><strong>{t.labFuture}</strong><p>{t.labFutureBody}</p></aside>
      <ol className="fd-lab-timeline" aria-label={sampleType === 'blood' ? t.labBlood : t.labUrine}>
        <li className="fd-lab-planned"><span className="fd-eyebrow">{t.planLane}</span><h3>{t.labPlan}</h3><p><time dateTime={plan.start}>{plan.start}</time> → <time dateTime={plan.end}>{plan.end}</time></p><p>{t.labPlanBody}</p><small>{LAB_VERSION} · demo-plan · {plan.id}</small></li>
        {steps.map(({ label, event }) => <li key={label} data-received={!!event}>
          <h3>{label}</h3><p>{event ? <time dateTime={event.occurredAt}>{event.occurredAt}</time> : t.labUnavailable}</p>
          {event && <small>{t.simulated} · {event.sourceId} · {event.id}</small>}
        </li>)}
      </ol>
      {sample && labIncomplete(sample) && <p className="fd-lab-incomplete">{t.labIncomplete}</p>}
      <aside className="fd-lab-storage"><strong>{t.labStorageContext}</strong><p>{t.labStorageBody}</p><small>{sample?.collection?.handlingStatus === 'stored_awaiting_analysis' ? t.labStored : t.labHandlingMissing}</small></aside>
    </>}
    <section className="fd-lab-result" aria-label={t.availability}>
      <p className="fd-eyebrow">{t.availability}</p>
      <h3>{sample?.result ? t.labResult : t.labNoResult}</h3>
      {!historical && <p className="fd-lab-future-label">{t.labFuture}</p>}
      <strong className="fd-lab-values">{t.labNoValues}</strong><p>{t.labNoValuesBody}</p>
      <h3>{t.labNoComparison}</h3><p>{t.labNoComparisonBody}</p>
      <p className="fd-lab-review">{review === 'flagged' ? t.labReviewFlagged : review === 'not_flagged' ? t.labReviewNotFlagged : t.labReviewMissing}</p>
      <p>{t.labReviewLimit}</p>
      {sample?.result && review !== 'not_reported' && <small>{t.simulated} · {sample.result.sourceId} · {sample.result.id} · {sample.result.occurredAt}</small>}
    </section>
    <details className="fd-report-details"><summary>{t.details}</summary><dl>
      <dt>{t.instrument}</dt><dd>{historical ? t.labHistoryAdapter : t.labAdapter}</dd>
      <dt>{t.variable}</dt><dd>{t.labVariable}</dd>
      <dt>{t.nature}</dt><dd>{historical ? t.labHistoryNature : t.labNature}</dd>
      <dt>{t.availability}</dt><dd>{historical ? t.labHistoryAvailability : t.labAvailability}</dd>
      <dt>{t.attribution}</dt><dd>{t.attributionValue}</dd>
      <dt>{t.source}</dt><dd>{id}{events.map(event => <div key={event.id}>{event.sourceId} · {event.id}</div>)}</dd>
      <dt>{t.timing}</dt><dd>{events.length ? events.map(event => <div key={event.id}>{event.occurredAt} / {event.receivedAt}</div>) : t.labUnavailable}</dd>
      <dt>{t.version}</dt><dd>{LAB_VERSION}</dd>
    </dl></details>
  </article>;
}

export function LaboratoryDetail({ state, owner }: { state: PreviewState; owner: CrewId }) {
  const t = useT().fd30;
  const samples = labSamples(state, owner);
  const selected = state.profiles[owner].highlightedSampleId;
  const history = samples.find(s => s.id === HISTORICAL_BLOOD_SAMPLE);
  return <>
    <div className="fd-page-intro"><p className="fd-eyebrow">{t.personal} / {t.laboratory}</p><h1 id="fd-view-h" tabIndex={-1}>{t.labTitle}</h1><p>{t.labIntro}</p></div>
    {owner === OWNER ? <>
      <Sample sample={samples.find(s => s.id === BLOOD_SAMPLE)} sampleType="blood" highlighted={selected === BLOOD_SAMPLE} />
      <details className="fd-lab-secondary" open={selected === URINE_SAMPLE || undefined}><summary>{t.labSecondary}</summary><p>{t.labSecondaryBody}</p><Sample sample={samples.find(s => s.id === URINE_SAMPLE)} sampleType="urine" highlighted={selected === URINE_SAMPLE} /></details>
      <section className="fd-history"><p className="fd-eyebrow">{t.history}</p>{history && <Sample sample={history} sampleType="blood" historical highlighted={selected === HISTORICAL_BLOOD_SAMPLE} />}</section>
    </> : <section className="fd-record"><h2>{t.labEmpty}</h2><p className="fd-no-record">{t.noRecord}</p><p>{t.labNoValues}</p><p>{t.labNoComparison}</p><p>{t.labReviewMissing}</p></section>}
  </>;
}
