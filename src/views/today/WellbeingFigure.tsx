import { useId } from 'react';
import type { ReactNode } from 'react';
import { useLocale } from '../../i18n/I18nProvider';
import { WELLBEING_TEXT } from './wellbeingText';
import { fdLabel } from '../../demo/history/sleep';
import './wellbeing.css';

const PERSON = 'M14 20H26Q31 20 32 26L36 46H32L28 32V78H22.5L20 50L17.5 78H12V32L8 46H4L8 26Q9 20 14 20Z';

/** Standing figure in anatomical position. Its fill height is the wellbeing index; null shows the empty outline. */
export function WellbeingFigure({ index, sleepFd }: { index: number | null; sleepFd: number | null }) {
  const locale = useLocale(), t = WELLBEING_TEXT[locale];
  const clipId = `wb-clip-${useId().replace(/:/g, '')}`;
  const level = index === null ? 0 : Math.max(0, Math.min(100, index));
  const fillHeight = (level / 100) * 80;
  const fd = index !== null && sleepFd !== null ? fdLabel(sleepFd) : null;
  const label = index === null ? `${t.figure}: ${t.noData}` : `${t.figure}: ${index} / 100${fd ? ` · ${fd}` : ''}`;
  return <span className="wb-figure-wrap"><svg className="wb-figure" viewBox="0 0 40 80" role="img" aria-label={label} data-wellbeing={index ?? 'missing'} data-sleep-fd={sleepFd ?? 'missing'}>
    <title>{label}</title>
    <defs><clipPath id={clipId}><rect x="0" y={80 - fillHeight} width="40" height={fillHeight} /></clipPath></defs>
    <circle cx="20" cy="10" r="7" className="wb-outline" />
    <path d={PERSON} className="wb-outline" />
    <g clipPath={`url(#${clipId})`} className="wb-fill">
      <circle cx="20" cy="10" r="7" />
      <path d={PERSON} />
    </g>
  </svg>{fd && <small className="wb-fd">{fd}</small>}</span>;
}

/** Two circles: the current heart rate (resting pattern, or the live session value) and the simulated SpO2 cycle; extra circles (HYD02) follow. */
export function HeartCircles({ now, spo2, children }: { now: number; spo2: number; children?: ReactNode }) {
  const t = WELLBEING_TEXT[useLocale()];
  return <div className="wb-hearts" data-heart-now={now}>
    <span className="wb-circle" aria-label={`${t.heartNow}: ${now} ${t.unit}`}><strong>{now}</strong><small>{t.unit}</small><em>{t.heartNow}</em></span>
    <span className="wb-circle wb-circle-session" aria-label={`${t.spo2Label}: ${spo2} ${t.spo2Unit}`} data-spo2={spo2}>
      <strong>{spo2}</strong><small>{t.spo2Unit}</small><em>{t.spo2Label}</em>
    </span>
    {children}
  </div>;
}
