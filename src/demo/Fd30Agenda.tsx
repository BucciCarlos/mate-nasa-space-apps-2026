import { useLocale, useT } from '../i18n/I18nProvider';
import { EQUIPMENT, PLAN_SOURCE, PLAN_VERSION, planFor } from './fd30Plan';
import type { CrewId } from './fd30';

export function Fd30Agenda({ owner, time }: { owner: CrewId; time: number }) {
  const t = useT().fd30;
  const locale = useLocale();
  return <details className="fd-own-agenda">
    <summary>{t.agendaTitle}</summary>
    <p>{t.agendaLimit}</p>
    <ol>{planFor(owner).map(b => <li key={b.id}>
      <span className="fd-agenda-time">{b.start.slice(11, 16)}–{b.end.slice(11, 16)}</span>
      <div><strong>{b.title[locale]}</strong>
        {Date.parse(b.start) <= time && time < Date.parse(b.end) && <span className="fd-tag">{t.agendaCurrent}</span>}
        {b.equipmentId && <small>{EQUIPMENT[b.equipmentId][locale]} · {t.equipmentUnverified}</small>}
      </div>
    </li>)}</ol>
    <small>{PLAN_SOURCE} · {PLAN_VERSION} · {t.clock}</small>
  </details>;
}
