// CAT08: the detail dialog of a catalog card. A native <dialog> opened with showModal(): inert background, focus trap and Escape come
// from the platform. Focus goes to the title on open and back to the card's button on close. Content is read once, when it opens.
import { useEffect, useMemo, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { Locale } from '../../state/types';
import { buildModal } from './catalogModalData';
import type { BarSlot, ModalChart, ModalContent, ModalSection } from './catalogModalData';
import { MODAL_UI } from './catalogModalText';
import type { CatalogModule, CatalogProps } from './catalogTypes';

function Bars({ chart }: { chart: Extract<ModalChart, { kind: 'bars' }> }) {
  return <figure className="mcat-fig">
    <div className="mcat-bars" aria-hidden="true">{chart.slots.map((s: BarSlot) => <div key={s.key} className={`mcat-col${s.current ? ' mcat-col-now' : ''}`} data-gap={s.value === null ? 'true' : undefined}>
      <span className="mcat-track">{s.value === null ? <i className="mcat-gapdot" /> : <i className="mcat-bar" style={{ height: `${Math.max(6, Math.min(100, s.value / chart.max * 100))}%` }} />}</span>
      <span className="mcat-colabel">{s.fd}</span></div>)}</div>
    <figcaption>{chart.caption}</figcaption>
    <ul className="sr-only">{chart.slots.map(s => <li key={s.key}>{s.label}</li>)}</ul>
  </figure>;
}
function Radiation({ chart }: { chart: Extract<ModalChart, { kind: 'radiation' }> }) {
  const c = chart.chart;
  return <figure className="mcat-fig mcat-rad">
    <svg viewBox={`0 0 ${c.w} ${c.h}`} role="img" aria-label={chart.label} data-chart="radiation-mini">
      {c.yTicks.map(k => <g key={k.value}><line className="mcat-grid" x1={c.plot.l} x2={c.plot.r} y1={k.y} y2={k.y} /><text className="mcat-axis" x={c.plot.l - 4} y={k.y + 3} textAnchor="end">{k.value}</text></g>)}
      {c.gaps.map((g, i) => <rect key={i} className="mcat-gapband" data-gap={g.kind} x={g.x0} y={c.plot.t} width={Math.max(2, g.x1 - g.x0)} height={c.plot.b - c.plot.t} />)}
      <line className="mcat-axisline" x1={c.plot.l} x2={c.plot.r} y1={c.plot.b} y2={c.plot.b} />
      {c.xTicks.map(k => <text key={k.ms} className="mcat-axis" x={k.x} y={c.plot.b + 14} textAnchor="middle">{new Date(k.ms).toISOString().slice(5, 10)}</text>)}
      {c.runs.map((run, i) => run.points.length > 1
        ? <polyline key={i} className="mcat-line" fill="none" points={run.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />
        : <circle key={i} className="mcat-dot" cx={run.points[0].x} cy={run.points[0].y} r="2" />)}
    </svg>
    <figcaption>{chart.unit}</figcaption>
  </figure>;
}
function Strip({ chart }: { chart: Extract<ModalChart, { kind: 'strip' }> }) {
  return <figure className="mcat-fig"><svg viewBox={`0 0 ${chart.w} ${chart.h}`} role="img" aria-label={chart.caption} data-chart="evidence-strip">
    {chart.points.map(p => <circle key={p.key} className="mcat-dot" cx={p.x} cy={p.y} r="3" />)}</svg><figcaption>{chart.caption}</figcaption></figure>;
}
function Section({ s, label }: { s: ModalSection; label: string }) {
  return <section className="mcat-sec" data-class={s.cls}>
    <h3><span className={`mcat-tag mcat-tag-${s.cls}`}>{label}</span>{s.title !== label ? <span className="mcat-sectitle"> {s.title.replace(`${label} · `, '')}</span> : null}</h3>
    {s.lines.map((l, i) => <p key={i}>{l}</p>)}
    {s.chart?.kind === 'bars' && <Bars chart={s.chart} />}
    {s.chart?.kind === 'radiation' && <Radiation chart={s.chart} />}
    {s.chart?.kind === 'strip' && <Strip chart={s.chart} />}
    {s.items.length > 0 && <ul>{s.items.map((it, i) => <li key={i}>{it}</li>)}</ul>}
    {s.table && <div className="mcat-tablewrap" tabIndex={0} role="region" aria-label={s.title}><table><thead><tr>{s.table.head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>{s.table.rows.map((r, i) => <tr key={i}>{r.map((cell, j) => j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}
  </section>;
}

export function CatalogModal({ module, props, locale, onClose }: { module: CatalogModule; props: CatalogProps; locale: Locale; onClose: () => void }) {
  const ui = MODAL_UI[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const content: ModalContent = useMemo(() => buildModal(module, props, locale), []); // read once, when it opens
  const closing = useRef(onClose); closing.current = onClose;
  useEffect(() => {
    const d = dialog.current!;
    let mounted = true;
    // A stale `close` event (StrictMode re-runs this effect: close, then showModal again) must not unmount an open dialog.
    const handle = () => { if (mounted && !d.open) closing.current(); };
    d.addEventListener('close', handle);
    if (!d.open) d.showModal();
    title.current?.focus();
    return () => { mounted = false; d.removeEventListener('close', handle); if (d.open) d.close(); };
  }, []);
  // Tab never leaves the dialog: the platform lets it reach the browser UI, so wrap explicitly at both ends.
  const trap = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== 'Tab' || !dialog.current) return;
    const items = [...dialog.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]')];
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1], active = document.activeElement;
    if (e.shiftKey && (active === first || active === title.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  };
  const id = `mcat-modal-${module.id}`;
  return <dialog ref={dialog} className="mcat-modal" aria-labelledby={`${id}-h`} data-module-dialog={module.id}
    onKeyDown={trap} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
    <div className="mcat-modal-body">
      <header className="mcat-modal-head">
        <h2 id={`${id}-h`} ref={title} tabIndex={-1}>{content.title}</h2>
        <button type="button" className="mcat-modal-close" aria-label={ui.close} onClick={() => dialog.current?.close()}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 3L13 13M3 13L13 3" stroke="currentColor" strokeWidth="1.6" /></svg>
        </button>
      </header>
      <div className="mcat-modal-scroll">
        <p className="mcat-first"><span className="mcat-eyebrow">{ui.first}</span>{content.first}</p>
        <p className="mcat-scope">{content.scope}</p>
        {content.sections.map((s, i) => <Section key={i} s={s} label={ui.classes[s.cls]} />)}
        <section className="mcat-sec"><h3>{ui.why}</h3><p>{content.why}</p></section>
        <section className="mcat-sec"><h3>{ui.missing}</h3><ul>{content.missing.map(m => <li key={m}>{m}</li>)}</ul></section>
        <p className="mcat-source">{ui.source}: <a href={content.source.url} target="_blank" rel="noopener noreferrer" lang="en">{content.source.title} · {content.source.publisher}</a>
          <span className="sr-only"> {ui.newTab}</span>
          {content.source.extras.map(x => <span key={x.url}> · <a href={x.url} target="_blank" rel="noopener noreferrer" lang="en">{x.title}</a><span className="sr-only"> {ui.newTab}</span></span>)}</p>
        {content.secondary && <p className="mcat-action"><a className="btn" href={content.secondary.href} onClick={() => dialog.current?.close()}>{content.secondary.label}</a></p>}
        {content.action && <p className="mcat-action"><a className="btn btn-primary" href={content.action.href} onClick={() => dialog.current?.close()}>{content.action.label}</a></p>}
      </div>
    </div>
  </dialog>;
}
