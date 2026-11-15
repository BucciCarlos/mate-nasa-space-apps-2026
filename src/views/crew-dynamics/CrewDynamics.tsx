import { useContext, useId, useState } from 'react';
import { ViewerNameContext } from '../../demo/viewerName';
import { CREW, DAY_END } from '../../demo/fd30';
import type { CrewId, PreviewState } from '../../demo/fd30';
import { PLAN_SOURCE, PLAN_VERSION } from '../../demo/fd30Plan';
import { scheduleClock } from '../../demo/fd30Day';
import { useLocale } from '../../i18n/I18nProvider';
import { crewDynamics, crewTotals } from './crewDynamics';
import type { CrewRange, CrewViewer } from './crewDynamics';
import { CREW_DYNAMICS_TEXT } from './crewDynamicsText';
import './crew-dynamics.css';

export function CrewDynamics({ state, viewer, initialRange = 7 }: {
  state: PreviewState; viewer: CrewViewer; initialRange?: CrewRange;
}) {
  const locale = useLocale(), t = CREW_DYNAMICS_TEXT[locale], id = useId();
  const [range, setRange] = useState<CrewRange>(initialRange);
  const [mine, setMine] = useState(false);
  const model = crewDynamics(state, viewer, range);
  if (!model) return <p role="status">{t.unavailable}</p>;
  const owner = viewer.perspective === 'onboard' ? viewer.owner : null;
  const viewerName = useContext(ViewerNameContext);
  const nameOf = (id: CrewId) => viewerName && viewerName.id === id ? viewerName.name : CREW.find(c => c.id === id)!.name;
  const crew = CREW.filter(c => !mine || !owner || c.id === owner);
  const rows = model.rows.filter(r => crew.some(c => c.id === r.owner));
  const names = (ids: readonly CrewId[]) => ids.map(id => nameOf(id)).join(', ');
  return <section className="crew-dynamics" aria-labelledby={id}>
    <header><h1 id={id} tabIndex={-1}>{t.title}</h1><p>{t.intro}</p></header>
    <p className="crew-dynamics-note">{t.limit}</p>
    <div className="crew-dynamics-controls" role="group" aria-label={t.range}>
      <button type="button" aria-pressed={range === 7} onClick={() => setRange(7)}>{t.seven}</button>
      <button type="button" aria-pressed={range === 30} onClick={() => setRange(30)}>{t.thirty}</button>
    </div>
    <p>{t.coverage}</p>
    <details className="crew-dynamics-days"><summary>{t.days} · {`FD${String(model.firstFd).padStart(2, '0')}–FD30`}</summary>
      <ul>{Array.from({ length: 31 - model.firstFd }, (_, i) => model.firstFd + i).map(fd => <li key={fd} data-crew-day={fd}>{`FD${String(fd).padStart(2, '0')}`} · {fd === model.coveredFd ? t.covered : t.noPlan}</li>)}</ul>
    </details>
    {owner && <div className="crew-dynamics-controls" role="group" aria-label={t.filter}>
      <button type="button" aria-pressed={!mine} onClick={() => setMine(false)}>{t.mission}</button>
      <button type="button" aria-pressed={mine} onClick={() => setMine(true)}>{t.mine}</button>
    </div>}
    <p id={`${id}-scroll`}>{t.scrollHint}</p>
    <div className="crew-dynamics-scroll" tabIndex={0} role="region" aria-label={t.summary} aria-describedby={`${id}-scroll`}>
      <table><caption>{t.summary}</caption><thead><tr>
        {[t.person, t.plannedMinutes, t.sharedMinutes, t.overlapMinutes, t.withoutMinutes, t.restMinutes].map(label => <th scope="col" key={label}>{label}</th>)}
      </tr></thead><tbody>{crew.map(c => {
        const totals = crewTotals(model.rows, c.id);
        return <tr key={c.id}><th scope="row">{nameOf(c.id)}</th>{[totals.planned, totals.shared, totals.overlap, totals.withoutOverlap, totals.rest].map((v, i) => <td key={i}>{v.toLocaleString(locale)}</td>)}</tr>;
      })}</tbody></table>
    </div><p>{t.totalsNote}</p>
    <div className="crew-dynamics-scroll" tabIndex={0} role="region" aria-label={t.mission} aria-describedby={`${id}-scroll`}>
      <table><caption>{t.mission} · {`FD30 · ${t.utc}`}</caption><thead><tr>
        {[t.person, t.interval, t.activity, t.relation].map(label => <th scope="col" key={label}>{label}</th>)}
      </tr></thead><tbody>{rows.map(r => <tr key={`${r.owner}:${r.start}`} data-crew-owner={r.owner}>
        <th scope="row">{names([r.owner])}</th>
        <td className="crew-dynamics-time">{scheduleClock(r.start)}–{r.end === DAY_END ? '24:00' : scheduleClock(r.end)}</td>
        <td>{r.rest ? t.rest : r.sharedWith.length ? t.shared : t.personal}</td>
        <td>{r.sharedWith.length > 0 && <div>{t.shared}: {names(r.sharedWith)}</div>}
          {r.simultaneousWith.length > 0 && <div>{t.simultaneous}: {names(r.simultaneousWith)}</div>}
          {!r.sharedWith.length && !r.simultaneousWith.length && t.without}</td>
      </tr>)}</tbody></table>
      {!rows.length && <p>{t.empty}</p>}
    </div>
    <p>{t.continuation}</p><footer>{t.provenance} · {PLAN_SOURCE} · {PLAN_VERSION}</footer>
  </section>;
}
