import type { RestWindowChange } from '../../state/types';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { fmtDelta, fmtDuration, fmtInterval } from '../../i18n/format';
import { durationMinutes } from '../../domain/time';
import { Badge } from './Badge';

/** Planned rest window before → after, with the delta. Always labelled planned, never measured. */
export function RestWindowCard({ rest, name, emphasis = false }: { rest: RestWindowChange | null; name?: string; emphasis?: boolean }) {
  const t = useT();
  const locale = useLocale();
  if (!rest) return <p className="font-semibold">{t.agenda.restUnchanged}</p>;
  const before = fmtDuration(durationMinutes(rest.before));
  const after = fmtDuration(durationMinutes(rest.after));
  const delta = fmtDelta(rest.deltaMinutes);
  const unchanged = rest.deltaMinutes === 0;
  return (
    <div className={`border border-line rounded-md px-3 py-3 my-2 bg-bg3${emphasis ? ' bg-bg2 shadow-lg' : ''}${unchanged ? '' : ' border-l-4 border-l-amber'}`}>
      {name && <div className="font-bold mb-1">{name}</div>}
      <p className="font-semibold">{unchanged ? t.agenda.restUnchanged : t.agenda.restChange({ before, after, delta })}</p>
      <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-center my-2">
        <div className="flex flex-col"><span className="text-[11px] uppercase tracking-[0.06em] text-fg2">{t.agenda.before}</span><span className="font-mono text-fs2">{fmtInterval(rest.before, locale)}</span><span className="text-fg2 font-mono">{before}</span></div>
        <div className="text-fs3 text-fg2" aria-hidden="true">→</div>
        <div className="flex flex-col"><span className="text-[11px] uppercase tracking-[0.06em] text-fg2">{t.agenda.after}</span><span className="font-mono text-fs2">{fmtInterval(rest.after, locale)}</span><span className="text-fg2 font-mono">{after}</span></div>
        {!unchanged && <div className="font-mono text-fs3 font-bold text-amber px-3 py-1 border-2 border-amber rounded-md bg-amber-bg">{delta}</div>}
      </div>
      <p className="text-fg2 text-fs0">{t.agenda.plannedNotMeasured} <Badge kind="calculated" /></p>
    </div>
  );
}
