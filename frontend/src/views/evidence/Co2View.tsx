import { useLocale } from '../../i18n/I18nProvider';
import type { Co2Status, EvidenceSource } from './evidenceTypes';
import { EVIDENCE_TEXT } from './evidenceText';
import { MeasurementCard, SourceList } from './parts';

/** Context card and "Pending verification". This stage accepts no readings, so no value and no numeric chart can appear. */
export function Co2View({ status, sources }: { status?: Co2Status; sources: EvidenceSource[] }) {
  const locale = useLocale();
  const t = EVIDENCE_TEXT[locale];
  const C = t.co2;
  const mine = sources.filter(s => s.id === 'osdr-eda' || s.id === 'nasa-std-3001-v2');
  const card: [string, string][] = [
    [C.detector, C.detectorValue], [C.location, C.locationValue], [C.dates, C.datesValue], [C.unit, C.unitValue],
    [C.coverage, C.coverageValue], [C.measures, C.measuresValue], [C.notRepresent, C.notRepresentValue],
  ];
  return (
    <section className="evd-panel" aria-labelledby="evd-co2-h" data-evidence="co2" data-state="pending">
      <h3 id="evd-co2-h">{C.title}</h3>
      <p className="evd-nodata-state" role="status"><strong>{C.state}</strong>{status?.reason ? ` · ${C.reasonLabel}: ${status.reason[locale]}` : ''}</p>
      <p>{C.body}</p>
      <MeasurementCard title={C.card} rows={card} />
      <p className="evd-standard">{C.standard}</p>
      <SourceList sources={mine} t={t} locale={locale} />
    </section>
  );
}
