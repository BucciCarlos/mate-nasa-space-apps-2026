import { useState } from 'react';
import { DAY_MS, HOUR_MS, toIso, toMs } from '../../domain/time';
import { useT } from '../../i18n/I18nProvider';
import { Timeline } from '../shared/Timeline';
import type { TimelineProps } from '../shared/Timeline';

export function OperationsTimeline({ missionStart, ...props }: Omit<TimelineProps, 'range'> & { missionStart: string }) {
  const t = useT();
  const [offset, setOffset] = useState(0);
  const [hours, setHours] = useState(48);
  const dayStart = Math.floor(toMs(missionStart) / DAY_MS) * DAY_MS;
  const start = dayStart + offset * HOUR_MS;
  const range = { start: toIso(start), end: toIso(start + hours * HOUR_MS) };

  return (
    <>
      <div className="operations-time-controls" role="group" aria-label={t.operations.timeControls}>
        <div>
          <button className="btn btn-ghost" type="button" onClick={() => setOffset(offset - hours)}>{t.operations.previous}</button>
          <button className="btn btn-ghost" type="button" onClick={() => setOffset(Math.floor(((props.nowMs ?? dayStart) - dayStart) / (hours * HOUR_MS)) * hours)}>{t.operations.current}</button>
          <button className="btn btn-ghost" type="button" onClick={() => setOffset(offset + hours)}>{t.operations.next}</button>
        </div>
        <label>{t.operations.zoom}
          <select value={hours} onChange={(event) => {
            const next = Number(event.target.value);
            const nowOffset = ((props.nowMs ?? dayStart) - dayStart) / HOUR_MS;
            const anchor = nowOffset >= offset && nowOffset < offset + hours ? nowOffset : offset;
            setOffset(Math.floor(anchor / next) * next);
            setHours(next);
          }}>
            {[6, 12, 24, 48].map((value) => <option key={value} value={value}>{t.operations.hours({ hours: value })}</option>)}
          </select>
        </label>
      </div>
      <Timeline {...props} range={range} operations />
    </>
  );
}
