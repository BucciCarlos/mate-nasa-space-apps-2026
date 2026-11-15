import { SLEEP_SOURCE } from '../../../demo/history/sleepSource';
import { useLocale } from '../../../i18n/I18nProvider';
import { SLEEP_TEXT } from './sleepText';

/** Public documentation only, without rows, values, profile counts or access to private selectors. */
export function SleepProvenance() {
  const t = SLEEP_TEXT[useLocale()];
  return <section className="evd-block" data-fd30-sleep-source aria-labelledby="fd30-sleep-source-h">
    <h4 id="fd30-sleep-source-h">{t.sourceTitle}</h4><p>{t.sourceIntro}</p><p>{t.sourceCoverage}</p><p>{t.sourceTiming}</p><p>{t.sourceAccess}</p><p>{t.sourceCalc}</p>
    <dl><dt>{t.sourceFields}</dt><dd>{SLEEP_SOURCE.adapter} · {SLEEP_SOURCE.version} · {SLEEP_SOURCE.dataClass} · {SLEEP_SOURCE.scope} · {SLEEP_SOURCE.unit}</dd><dt>{t.sourceFile}</dt><dd><code>{SLEEP_SOURCE.file}</code></dd></dl>
    <p>{t.sourceSeparate}</p>
  </section>;
}
