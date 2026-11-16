import type { Dispatch } from 'react';
import { useLocale, useT } from '../i18n/I18nProvider';
import { CLOCK_SPEEDS, DAY_EVENTS, DAY_START, END, ENTRY } from './fd30';
import type { ClockSpeed, PreviewAction, PreviewState } from './fd30';

export function Fd30Timebar({ state, time, dispatch, onSeek }: {
  state: PreviewState; time: number; dispatch: Dispatch<PreviewAction>; onSeek: (target: number) => void;
}) {
  const t = useT().fd30;
  const locale = useLocale();
  const format = (value: number) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(value);
  const previous = [...DAY_EVENTS].reverse().find(e => Date.parse(e.receivedAt) < time);
  return <fieldset className="fd-timebar">
    <legend>{t.timeSlider}</legend>
    <div className="fd-timebar-range">
      <span>{format(DAY_START)}</span>
      <input type="range" min={DAY_START} max={END} step={60_000} value={time} aria-label={t.timeSlider}
        aria-valuetext={`${format(time)} UTC, FD30`} onChange={e => onSeek(Number(e.target.value))} />
      <output>{format(time)} {/* i18n-ignore — UTC is a time standard */}UTC</output>
    </div>
    <div className="fd-timebar-scale" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i}>{String(i * 3).padStart(2, '0')}</span>)}</div>
    <p className="fd-timebar-close">{t.timeClose}</p>
    <div className="fd-timebar-controls">
      <button type="button" disabled={time <= DAY_START} onClick={() => onSeek(time - 15 * 60_000)}>{t.timeBack}</button>
      <button type="button" disabled={!previous} onClick={() => previous && onSeek(Date.parse(previous.receivedAt))}>{t.timePrevious}</button>
      <button type="button" disabled={time >= END} onClick={() => onSeek(time + 15 * 60_000)}>{t.timeForward}</button>
      <button type="button" disabled={time >= END} aria-pressed={state.running}
        onClick={() => dispatch({ type: 'running/set', now: Date.now(), running: !state.running })}>{state.running ? t.timePause : t.timePlay}</button>
      <label><span>{t.timeSpeed}</span><select aria-label={t.timeSpeed} value={state.speed} onChange={e => dispatch({ type: 'speed/set', now: Date.now(), speed: Number(e.target.value) as ClockSpeed })}>
        {CLOCK_SPEEDS.map(speed => <option key={speed} value={speed}>{speed}×</option>)}
      </select></label>
      <label><span>{t.timeMode}</span><select aria-label={t.timeMode} value={state.playback} onChange={e => dispatch({ type: 'playback/set', mode: e.target.value as PreviewState['playback'] })}>
        <option value="explore">{t.timeExplore}</option><option value="guided">{t.timeGuided}</option>
      </select></label>
      <button type="button" onClick={() => onSeek(ENTRY)}>{t.timeEntry}</button>
      <span>{time >= END ? t.timeFinished : state.running ? t.timeRunning(state.speed) : t.timePaused}</span>
    </div>
    <p>{t.timeHint}</p>
  </fieldset>;
}
