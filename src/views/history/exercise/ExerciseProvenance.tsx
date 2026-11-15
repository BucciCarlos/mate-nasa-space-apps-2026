import { EXERCISE_SOURCE } from '../../../demo/history/exerciseSource';
import { useLocale } from '../../../i18n/I18nProvider';
import { EXERCISE_TEXT } from './exerciseText';

export function ExerciseProvenance() {
  const t = EXERCISE_TEXT[useLocale()];
  return <section className="evd-block" data-fd30-exercise-source aria-labelledby="fd30-exercise-source-h">
    <h4 id="fd30-exercise-source-h">{t.sourceTitle}</h4><p>{t.sourceIntro}</p><p>{t.sourceTiming}</p><p>{t.sourceAccess}</p><p>{t.sourceComparison}</p><p>{t.sourceSeparate}</p>
    <dl><dt>{t.fields}</dt><dd>{EXERCISE_SOURCE.adapter} · {EXERCISE_SOURCE.version} · {EXERCISE_SOURCE.dataClass} · {EXERCISE_SOURCE.scope}</dd><dt>{t.file}</dt><dd><code>{EXERCISE_SOURCE.file}</code></dd></dl>
  </section>;
}
