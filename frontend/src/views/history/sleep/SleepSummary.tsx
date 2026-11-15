import type { CrewId, PreviewState } from '../../../demo/fd30';
import { fdLabel, sleepDuration, sleepHistory } from '../../../demo/history/sleep';
import { useLocale } from '../../../i18n/I18nProvider';
import { SLEEP_TEXT } from './sleepText';
import './sleep.css';

export function SleepSummary({ state, owner, time }: { state: PreviewState; owner: CrewId; time: number }) {
  const t = SLEEP_TEXT[useLocale()];
  const view = sleepHistory(state, { perspective: 'onboard', owner }, time, 'last7');
  if (!view) return null;
  const today = view.days.at(-1)!;
  return <div className="sleep-summary" data-sleep-summary={owner}>
    <p className="sleep-demo">{t.demo}</p><p>{t.current}</p><strong>{today.record ? `${sleepDuration(today.record.durationMinutes)} ${t.units}` : t.notReceived}</strong>
    <p data-sleep-latest>{view.latest ? t.latest(fdLabel(view.latest.fd), sleepDuration(view.latest.durationMinutes)) : t.empty}</p>
    <p>{t.coverage(view.records.length, view.days.length)}</p>
  </div>;
}
