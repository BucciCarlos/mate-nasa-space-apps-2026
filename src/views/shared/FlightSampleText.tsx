import { METRIC_UNITS } from '../../domain/monitoring';
import { fmtDateTime, fmtNumber } from '../../i18n/format';
import { useLocale, useT } from '../../i18n/I18nProvider';
import type { FlightSample } from '../../state/types';

export function FlightSampleText({ sample }: { sample: FlightSample }) {
  const t = useT().monitoring;
  const locale = useLocale();
  return <>{t.metrics[sample.metric]} · {fmtNumber(sample.value, locale)} {METRIC_UNITS[sample.metric]} · {fmtDateTime(sample.at, locale)} · {t.simulated}</>;
}
