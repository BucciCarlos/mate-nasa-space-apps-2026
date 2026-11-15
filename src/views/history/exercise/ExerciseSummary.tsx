import type { CrewId, PreviewState } from '../../../demo/fd30';
import { exerciseHistory } from '../../../demo/history/exercise';
import { fdLabel } from '../../../demo/history/sleep';
import { useLocale } from '../../../i18n/I18nProvider';
import { EXERCISE_TEXT } from './exerciseText';

export function ExerciseSummary({ state, owner, time }: { state: PreviewState; owner: CrewId; time: number }) {
  const locale = useLocale(), t = EXERCISE_TEXT[locale];
  const view = exerciseHistory(state, { perspective: 'onboard', owner }, time, 'last7');
  if (!view) return null;
  return <div data-exercise-summary={owner}><p>{t.demo}</p><p data-exercise-latest>{view.latest ? t.latest(fdLabel(view.latest.fd), new Intl.NumberFormat(locale).format(view.latest.durationMinutes)) : t.noRecord}</p><p>{t.count(view.records.length, view.days.length)}</p></div>;
}
