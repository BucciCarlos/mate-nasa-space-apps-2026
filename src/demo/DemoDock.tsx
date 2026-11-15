import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { sessionStorageOrNull } from '../state/persistence';

/** Demo-mode dock: a round button on the left edge (vertical drag only) that toggles a floating, non-modal panel. */
export const DEMO_DOCK_KEY = 'mate:fd30:demo-dock:v1';
export const DEMO_DOCK_EVENT = 'fd-demo-dock';
export const DEMO_DOCK_DEFAULT = 0.4;
const SIZE = 48, MARGIN = 8, MIN_TOP = 76, DRAG_THRESHOLD = 8;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function readDockY(raw: string | null): number {
  try {
    const value = raw === null ? NaN : (JSON.parse(raw) as { y?: unknown }).y;
    return typeof value === 'number' && Number.isFinite(value) ? clamp01(value) : DEMO_DOCK_DEFAULT;
  } catch { return DEMO_DOCK_DEFAULT; }
}
/** Pure geometry: fraction ↔ top px inside the visible viewport. */
export function dockBounds(viewport: { height: number; offsetTop: number }) {
  const top = viewport.offsetTop + MIN_TOP;
  const bottom = viewport.offsetTop + viewport.height - MARGIN - SIZE;
  return { top, bottom: Math.max(top, bottom) };
}
export const yToPx = (y: number, b: { top: number; bottom: number }) => b.top + (b.bottom - b.top) * y;
export const pxToY = (px: number, b: { top: number; bottom: number }) => clamp01((px - b.top) / Math.max(1, b.bottom - b.top));

interface Props { label: string; hint: string; instructions: string; closeLabel: string; children: ReactNode }

function viewportBox() {
  const v = window.visualViewport;
  return { height: v?.height ?? window.innerHeight, width: v?.width ?? window.innerWidth, offsetTop: v?.offsetTop ?? 0, offsetLeft: v?.offsetLeft ?? 0 };
}

export function DemoDock({ label, hint, instructions, closeLabel, children }: Props) {
  const [open, setOpen] = useState(false);
  const [y, setY] = useState(() => { try { return readDockY(sessionStorageOrNull()?.getItem(DEMO_DOCK_KEY) ?? null); } catch { return DEMO_DOCK_DEFAULT; } });
  const [dragTop, setDragTop] = useState<number | null>(null);
  const [view, setView] = useState(viewportBox);
  const [panelTop, setPanelTop] = useState(MARGIN);
  const fab = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const gesture = useRef<{ id: number; startY: number; baseTop: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const yRef = useRef(y);
  yRef.current = y;

  const bounds = dockBounds(view);
  const fabTop = dragTop ?? yToPx(y, bounds);
  const save = (next: number) => { try { sessionStorageOrNull()?.setItem(DEMO_DOCK_KEY, JSON.stringify({ y: next })); } catch { /* The position is optional. */ } };
  const commit = (next: number) => { yRef.current = next; setY(next); save(next); };

  useEffect(() => {
    const update = () => setView(viewportBox());
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => { window.removeEventListener('resize', update); window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update); };
  }, []);

  // Keep the panel inside the visible viewport, next to the button when there is room.
  useLayoutEffect(() => {
    if (!open || !panel.current) return;
    const height = panel.current.offsetHeight;
    const low = view.offsetTop + MARGIN, high = view.offsetTop + view.height - MARGIN - height;
    setPanelTop(Math.max(low, Math.min(high, fabTop)));
  });

  // Opening keeps focus on the button so Enter/Space toggle it; Tab reaches the panel next (it follows the button in the DOM).
  // The companion avoids this control: tell it when the button or the panel changed position or visibility.
  useLayoutEffect(() => { window.dispatchEvent(new Event(DEMO_DOCK_EVENT)); }, [open, panelTop, fabTop, view.height, view.width]);
  const close = useCallback(() => { setOpen(false); fab.current?.focus(); }, []);
  useEffect(() => {
    if (!open) return;
    // The open panel is the top layer: Escape closes it first (chat and companion card are underneath), except while
    // the companion is in keyboard move mode, where Escape cancels the move.
    const escape = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if ((e.target as Element | null)?.closest?.('.fd-key-moving')) return;
      e.preventDefault(); close();
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [open, close]);

  const move = (delta: number) => commit(pxToY(yToPx(yRef.current, bounds) + delta, bounds));
  const release = (e: PointerEvent<HTMLElement>, cancel: boolean) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (g.moved) {
      e.preventDefault(); suppressClick.current = true;
      if (!cancel) commit(pxToY(g.baseTop + e.clientY - g.startY, bounds));
    }
    setDragTop(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    move((e.key === 'ArrowUp' ? -1 : 1) * (e.shiftKey ? 32 : 8));
  };

  // Vertical-only drag shared by the button and the open strip's title bar.
  const grip = {
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (e.button !== 0 || !e.isPrimary || (e.target as Element).closest('button.fd-demo-close')) return;
        suppressClick.current = false;
        gesture.current = { id: e.pointerId, startY: e.clientY, baseTop: fabTop, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        const g = gesture.current;
        if (!g || g.id !== e.pointerId) return;
        const dy = e.clientY - g.startY;
        if (Math.abs(dy) >= DRAG_THRESHOLD) g.moved = true;
        if (g.moved) { e.preventDefault(); setDragTop(yToPx(pxToY(g.baseTop + dy, bounds), bounds)); }
      },
      onPointerUp: (e: PointerEvent<HTMLElement>) => release(e, false), onPointerCancel: (e: PointerEvent<HTMLElement>) => release(e, true),
      onLostPointerCapture: () => { if (gesture.current) { suppressClick.current = true; gesture.current = null; setDragTop(null); } },
  };

  const compact = view.width <= 600;
  return <>
    <button className="fd-demo-fab" ref={fab} type="button" aria-label={label} aria-expanded={open} aria-controls="fd-demo-panel"
      aria-describedby="fd-demo-fab-help" aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
      data-dragging={dragTop !== null ? 'true' : undefined}
      style={{ top: fabTop, left: view.offsetLeft + MARGIN }}
      {...grip}
      onKeyDown={onKeyDown}
      onClick={e => {
        if (suppressClick.current && e.detail !== 0) { e.preventDefault(); suppressClick.current = false; return; }
        setOpen(o => !o);
      }}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><circle cx="9" cy="7" r="2.2" fill="var(--paper)" stroke="currentColor" strokeWidth="1.5" /><circle cx="15" cy="12" r="2.2" fill="var(--paper)" stroke="currentColor" strokeWidth="1.5" /><circle cx="8" cy="17" r="2.2" fill="var(--paper)" stroke="currentColor" strokeWidth="1.5" /></svg>
    </button>
    <span className="sr-only" id="fd-demo-fab-help">{instructions}</span>
    <section className="fd-demo fd-demo-panel" id="fd-demo-panel" ref={panel} role="dialog" aria-label={label} tabIndex={-1} hidden={!open}
      style={{ top: panelTop, left: compact ? view.offsetLeft + MARGIN : view.offsetLeft + MARGIN * 2 + SIZE, maxHeight: Math.max(120, view.height - MARGIN * 2) }}>
      <div className="fd-demo-head" {...grip}>
        <div><strong>{label}</strong><span>{hint}</span></div>
        <button className="fd-demo-close" type="button" aria-label={closeLabel} onClick={close}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3L13 13M3 13L13 3" stroke="currentColor" strokeWidth="1.6" /></svg>
        </button>
      </div>
      {children}
    </section>
  </>;
}
