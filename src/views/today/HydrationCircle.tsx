import { useEffect, useId, useRef, useState } from 'react';
import { useLocale } from '../../i18n/I18nProvider';
import { HYDRATION_TEXT } from './hydrationText';
import { hydrationLevel } from '../../demo/hydration';
import './hydration.css';

const GLASS = 'M3 2H27L24 40Q23.7 42 22 42H8Q6.3 42 6 40Z';

/** Third Home indicator: a glass that rises with the intakes logged so far today, and a counter. A count of simulated detections only. */
export function HydrationCircle({ count }: { count: number }) {
  const locale = useLocale(), t = HYDRATION_TEXT[locale];
  const uid = useId().replace(/:/g, ''), clipId = `hy-clip-${uid}`, helpId = `hy-help-${uid}`;
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLSpanElement>(null);
  const help = useRef<HTMLParagraphElement>(null);
  const level = hydrationLevel(count), fill = level * 40;
  useEffect(() => {
    if (!open) return;
    help.current?.scrollIntoView({ block: 'nearest' });
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setOpen(false); button.current?.focus(); } };
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', close); window.addEventListener('pointerdown', outside);
    return () => { window.removeEventListener('keydown', close); window.removeEventListener('pointerdown', outside); };
  }, [open]);
  return <span className="wb-hydration" ref={root} id="td-hydration" data-hydration-count={count} data-hydration-level={level} role="group" aria-label={t.count(count)}>
    <span className="wb-circle wb-circle-hydration">
      <svg className="hy-glass" viewBox="0 0 30 44" aria-hidden="true" focusable="false">
        <defs><clipPath id={clipId}><rect x="0" y={42 - fill} width="30" height={fill + 2} /></clipPath></defs>
        <path d={GLASS} className="hy-outline" />
        <path d={GLASS} className="hy-fill" clipPath={`url(#${clipId})`} />
      </svg>
      <strong>{count}</strong><em>{t.label}</em>
    </span>
    <button className="hy-info" ref={button} type="button" aria-expanded={open} aria-controls={open ? helpId : undefined} aria-label={open ? t.infoClose : t.info} onClick={() => setOpen(v => !v)}>
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.6" /><circle cx="10" cy="6.2" r="1.15" fill="currentColor" /><path d="M10 9V14.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    </button>
    {open && <p className="hy-help" ref={help} id={helpId} role="note">{t.help}</p>}
  </span>;
}
