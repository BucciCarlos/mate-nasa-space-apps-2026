import type { RestWindowChange } from '../../state/types';
import { useLocale, useT } from '../../i18n/I18nProvider';
import { fmtDelta, fmtDuration, fmtInterval } from '../../i18n/format';
import { durationMinutes } from '../../domain/time';
import { Badge } from './Badge';

/** Planned rest window before → after, with the delta. Always labelled planned, never measured. */
export function RestWindowCard({ rest, name, emphasis = false }: { rest: RestWindowChange | null; name?: string; emphasis?: boolean }) {
  const t = useT();
  const locale = useLocale();
  if (!rest) return <p className="rest-line">{t.agenda.restUnchanged}</p>;
  const before = fmtDuration(durationMinutes(rest.before));
  const after = fmtDuration(durationMinutes(rest.after));
  const delta = fmtDelta(rest.deltaMinutes);
  const unchanged = rest.deltaMinutes === 0;
  return (
    <div className={`rest-card${emphasis ? ' is-emphasis' : ''}${unchanged ? '' : ' is-changed'}`}>
      {name && <div className="rest-name">{name}</div>}
      <p className="rest-line">{unchanged ? t.agenda.restUnchanged : t.agenda.restChange({ before, after, delta })}</p>
      <div className="rest-compare">
        <div className="rest-col"><span className="rest-label">{t.agenda.before}</span><span className="rest-val">{fmtInterval(rest.before, locale)}</span><span className="rest-dur">{before}</span></div>
        <div className="rest-arrow" aria-hidden="true">→</div>
        <div className="rest-col"><span className="rest-label">{t.agenda.after}</span><span className="rest-val">{fmtInterval(rest.after, locale)}</span><span className="rest-dur">{after}</span></div>
        {!unchanged && <div className="rest-delta">{delta}</div>}
      </div>
      <p className="muted small">{t.agenda.plannedNotMeasured} <Badge kind="calculated" /></p>
    </div>
  );
}
