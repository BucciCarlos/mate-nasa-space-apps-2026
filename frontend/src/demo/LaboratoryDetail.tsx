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
  const eyebrow = 'text-fd-quiet text-[12px] font-semibold uppercase tracking-[.13em] leading-[1.6]';
  return <article className={`p-6 my-6 border border-fd-rule rounded overflow-wrap-anywhere ${highlighted ? 'outline-2 outline-fd-rust outline-offset-[3px] bg-[#eee0cd55]' : ''}`} data-sample-id={id} aria-labelledby={labHeadingId(id)}>
    <div className="flex flex-wrap items-center gap-3"><h2 id={labHeadingId(id)} ref={heading} tabIndex={-1} className="m-0 text-lg font-[550]">{historical ? t.labHistoryTitle : sampleType === 'blood' ? t.labBlood : t.labUrine}</h2><span className="text-[12px] px-[7px] py-[3px] border border-[#c4cabb] rounded">{t.simulated}</span>{highlighted && <span className="text-[12px] px-[7px] py-[3px] border border-[#c4cabb] rounded">{t.labHighlight}</span>}</div>
    <p className={eyebrow}>{historical ? t.historySource : t.labCurrent}</p>
    {historical ? <><p className="text-[15px] leading-[1.65] text-fd-quiet">{t.labHistoryBody}</p><p className="text-[24px] font-serif !font-normal">{sample?.collection?.handlingStatus === 'stored_awaiting_analysis' ? t.labStored : t.labHandlingMissing}</p><p className="text-[15px] leading-[1.65] text-fd-quiet">{t.labNoResult}</p></> : <>
      <aside className="border-l-[3px] border-[#a36846] px-4 py-3 bg-[#eee0cd66] my-5"><strong className="text-[15px] font-semibold">{t.labFuture}</strong><p className="mb-0 text-[15px] leading-[1.65] text-fd-quiet">{t.labFutureBody}</p></aside>
      <ol className="list-none px-0 pl-5 my-7" aria-label={sampleType === 'blood' ? t.labBlood : t.labUrine}>
        <li className="fd-lab-planned border-l-2 border-fd-rule relative pb-6 pl-[22px]"><span className="absolute w-[9px] h-[9px] border-2 border-[#85947f] rounded-full bg-[#f7f5ec] -left-1.5 top-[5px]" aria-hidden="true" /><span className={eyebrow}>{t.planLane}</span><h3 className="text-lg font-[550] m-0">{t.labPlan}</h3><p className="my-2 text-[15px] leading-[1.65] text-fd-quiet"><time dateTime={plan.start}>{plan.start}</time> → <time dateTime={plan.end}>{plan.end}</time></p><p className="my-2 text-[15px] leading-[1.65] text-fd-quiet">{t.labPlanBody}</p><small className="text-[12px] text-fd-quiet">{LAB_VERSION} · demo-plan · {plan.id}</small></li>
        {steps.map(({ label, event }) => <li key={label} className="border-l-2 border-fd-rule relative pb-6 pl-[22px] last:border-l-transparent last:pb-0" data-received={!!event}>
          <span className="absolute w-[9px] h-[9px] border-2 rounded-full -left-1.5 top-[5px]" style={{ background: event ? '#233d3e' : '#f7f5ec', borderColor: event ? '#233d3e' : '#85947f' }} aria-hidden="true" />
          <h3 className="text-lg font-[550] m-0">{label}</h3><p className="my-2 text-[15px] leading-[1.65] text-fd-quiet">{event ? <time dateTime={event.occurredAt}>{event.occurredAt}</time> : t.labUnavailable}</p>
          {event && <small className="text-[12px] text-fd-quiet">{t.simulated} · {event.sourceId} · {event.id}</small>}
        </li>)}
      </ol>
      {sample && labIncomplete(sample) && <p className="border-l-2 border-[#a36846] pl-3 text-[15px] leading-[1.65] text-fd-quiet">{t.labIncomplete}</p>}
      <aside className="border-t border-fd-rule pt-[18px]"><strong className="text-[15px] font-semibold">{t.labStorageContext}</strong><p className="mb-0 text-[15px] leading-[1.65] text-fd-quiet">{t.labStorageBody}</p><small className="block mt-2.5 text-[12px] text-fd-quiet">{sample?.collection?.handlingStatus === 'stored_awaiting_analysis' ? t.labStored : t.labHandlingMissing}</small></aside>
    </>}
    <section className="border-t border-fd-rule pt-5" aria-label={t.availability}>
      <p className={eyebrow}>{t.availability}</p>
      <h3 className="text-lg font-[550]">{sample?.result ? t.labResult : t.labNoResult}</h3>
      {!historical && <p className="text-fs1">{t.labFuture}</p>}
      <strong className="block font-serif text-[30px] font-normal mt-6">{t.labNoValues}</strong><p className="text-[15px] leading-[1.65] text-fd-quiet">{t.labNoValuesBody}</p>
      <h3 className="text-lg font-[550]">{t.labNoComparison}</h3><p className="text-[15px] leading-[1.65] text-fd-quiet">{t.labNoComparisonBody}</p>
      <p className="border-l-2 border-[#a36846] pl-3 text-[15px] leading-[1.65] text-fd-quiet">{review === 'flagged' ? t.labReviewFlagged : review === 'not_flagged' ? t.labReviewNotFlagged : t.labReviewMissing}</p>
      <p className="text-[15px] leading-[1.65] text-fd-quiet">{t.labReviewLimit}</p>
      {sample?.result && review !== 'not_reported' && <small className="text-[12px] text-fd-quiet">{t.simulated} · {sample.result.sourceId} · {sample.result.id} · {sample.result.occurredAt}</small>}
    </section>
    <details className="text-fs1 border-t border-fd-rule pt-3.5"><summary className="cursor-pointer font-[550]">{t.details}</summary><dl className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-2 gap-x-4 mb-0">
      <dt className="text-fd-quiet">{t.instrument}</dt><dd className="m-0 overflow-wrap-anywhere">{historical ? t.labHistoryAdapter : t.labAdapter}</dd>
      <dt className="text-fd-quiet">{t.variable}</dt><dd className="m-0 overflow-wrap-anywhere">{t.labVariable}</dd>
      <dt className="text-fd-quiet">{t.nature}</dt><dd className="m-0 overflow-wrap-anywhere">{historical ? t.labHistoryNature : t.labNature}</dd>
      <dt className="text-fd-quiet">{t.availability}</dt><dd className="m-0 overflow-wrap-anywhere">{historical ? t.labHistoryAvailability : t.labAvailability}</dd>
      <dt className="text-fd-quiet">{t.attribution}</dt><dd className="m-0 overflow-wrap-anywhere">{t.attributionValue}</dd>
      <dt className="text-fd-quiet">{t.source}</dt><dd className="m-0 overflow-wrap-anywhere">{id}{events.map(event => <div key={event.id}>{event.sourceId} · {event.id}</div>)}</dd>
      <dt className="text-fd-quiet">{t.timing}</dt><dd className="m-0 overflow-wrap-anywhere">{events.length ? events.map(event => <div key={event.id}>{event.occurredAt} / {event.receivedAt}</div>) : t.labUnavailable}</dd>
      <dt className="text-fd-quiet">{t.version}</dt><dd className="m-0 overflow-wrap-anywhere">{LAB_VERSION}</dd>
    </dl></details>
  </article>;
}

export function LaboratoryDetail({ state, owner }: { state: PreviewState; owner: CrewId }) {
  const t = useT().fd30;
  const samples = labSamples(state, owner);
  const selected = state.profiles[owner].highlightedSampleId;
  const history = samples.find(s => s.id === HISTORICAL_BLOOD_SAMPLE);
  const eyebrow = 'text-fd-quiet text-[12px] font-semibold uppercase tracking-[.13em] leading-[1.6]';
  return <>
    <div className="mt-[34px] mb-7"><p className={eyebrow}>{t.personal} / {t.laboratory}</p><h1 id="fd-view-h" tabIndex={-1} className="font-serif text-[clamp(32px,5vw,46px)] font-normal tracking-[-.035em] leading-[1.12] my-2 mb-3">{t.labTitle}</h1><p className="text-fd-quiet text-fs1">{t.labIntro}</p></div>
    {owner === OWNER ? <>
      <Sample sample={samples.find(s => s.id === BLOOD_SAMPLE)} sampleType="blood" highlighted={selected === BLOOD_SAMPLE} />
      <details className="border-t border-fd-rule py-6" open={selected === URINE_SAMPLE || undefined}><summary className="cursor-pointer text-[15px] font-semibold">{t.labSecondary}</summary><p className="text-[15px] leading-[1.65] text-fd-quiet">{t.labSecondaryBody}</p><Sample sample={samples.find(s => s.id === URINE_SAMPLE)} sampleType="urine" highlighted={selected === URINE_SAMPLE} /></details>
      <section className="border-t border-fd-rule py-6"><p className={eyebrow}>{t.history}</p>{history && <Sample sample={history} sampleType="blood" historical highlighted={selected === HISTORICAL_BLOOD_SAMPLE} />}</section>
    </> : <section className="py-7"><h2 className="text-lg font-[550]">{t.labEmpty}</h2><p className="block font-serif font-normal text-[clamp(28px,4.5vw,38px)] my-3">{t.noRecord}</p><p className="text-[15px] leading-[1.65] text-fd-quiet">{t.labNoValues}</p><p className="text-[15px] leading-[1.65] text-fd-quiet">{t.labNoComparison}</p><p className="text-[15px] leading-[1.65] text-fd-quiet">{t.labReviewMissing}</p></section>}
  </>;
}
