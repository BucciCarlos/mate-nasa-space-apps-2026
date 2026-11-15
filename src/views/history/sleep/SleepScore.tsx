import type { CrewId, PreviewState } from '../../../demo/fd30';
import { fdLabel } from '../../../demo/history/sleep';
import { sleepScoreDetail } from '../../../demo/history/sleepScore';
import { useLocale } from '../../../i18n/I18nProvider';
import { SLEEP_SCORE_TEXT } from './sleepScoreText';
import './sleep-score.css';

export function SleepScore({ state, owner, time, fd }: { state: PreviewState; owner: CrewId; time: number; fd: number }) {
  const locale = useLocale(), t = SLEEP_SCORE_TEXT[locale];
  const detail = sleepScoreDetail(state, { perspective: 'onboard', owner }, time, fd);
  if (!detail) return null;
  const { score, comparison, episode } = detail;
  const number = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });
  return <section className="sleep-score" aria-label={t.title} data-sleep-score-fd={fd}>
    <h3>{t.title}</h3>
    {score ? <>
      <strong data-sleep-score={score.display}>{score.display} / {100}</strong><p>{t.points}</p>
      <dl><dt>{t.duration}</dt><dd>{number(score.durationPoints)}</dd>
        <dt>{t.efficiency}</dt><dd>{number(score.efficiencyPoints)}</dd>
        <dt>{t.bed}</dt><dd>{number(score.timeInBed)}</dd><dt>{t.percent}</dt><dd>{number(score.efficiencyPercent)}</dd>
        <dt>{t.awakenings}</dt><dd>{episode?.awakeningsCount === undefined ? t.noAwakenings : number(episode.awakeningsCount)}</dd>
      </dl>
      <p data-sleep-score-comparison>{comparison ? <>
        {t.compared} {fdLabel(detail.previousFd)} · {comparison.direction === 'steady' ? t.steady : <>
          <span aria-hidden="true">{comparison.direction === 'up' ? '↑' : '↓'}</span> {comparison.direction === 'up' ? '+' : '−'}{comparison.points} {t.delta}
        </>}
      </> : t.noComparison}</p>
    </> : <p data-sleep-score-unavailable>{t[detail.reason!]}</p>}
    <p>{t.parameters}</p><p>{t.explanation}</p><p className="sleep-score-formula">{t.formula}</p>
  </section>;
}
