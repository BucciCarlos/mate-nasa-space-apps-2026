import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { ProfileId, Position } from './fd30';
import { Orbit } from './orbit/Orbit';
import type { OrbitVariant, Pose } from './orbit/Orbit';
import { fitPosition, fromPreference, toPreference } from './position';
import type { Box, Point } from './position';
import { useT } from '../i18n/I18nProvider';

type Character = { id: ProfileId; character: string; shape: OrbitVariant };
interface Props {
  crew: Character; preference: Position | null; pose: Pose; news: boolean; hasSummary: boolean; newsText: string; chatOpen: boolean;
  onPosition: (position: Position | null) => void; onChat: () => void; onSleep?: () => void; onExercise?: () => void; onLaboratory?: () => void; onSummary: () => void;
  characterRef: React.RefObject<HTMLButtonElement>;
}
const asBox = (r: DOMRect): Box => ({ x: r.x, y: r.y, width: r.width, height: r.height });

export function FloatingCompanion({ crew, preference, pose, news, hasSummary, newsText, chatOpen, onPosition, onChat, onSummary, characterRef }: Props) {
  const t = useT().fd30;
  const frame = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const infoButton = useRef<HTMLButtonElement>(null);
  // The info card is on demand: it starts closed and only the info button (or a move in progress) shows it.
  const [infoOpen, setInfoOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  // The greeting runs once per chat opening (not on drag or on the info button) and then returns to rest even with the chat still open.
  const [greeting, setGreeting] = useState(false);
  useEffect(() => {
    if (!chatOpen) { setGreeting(false); return; }
    setGreeting(true);
    const timer = window.setTimeout(() => setGreeting(false), 1600);
    return () => window.clearTimeout(timer);
  }, [chatOpen]);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const initialBounds = { x: 8, y: 180, width: window.innerWidth - 16, height: Math.max(0, window.innerHeight - 188) };
  // Geometry lives in a ref and is read at render. A measurement overwrites it (latest wins) and bumps a counter to re-render.
  // A functional setState replaying an older DOM snapshot after a newer one made measure and render chase each other.
  const geometryRef = useRef({ bounds: initialBounds, preferenceBounds: initialBounds, size: { width: 100, height: 160 }, notice: { width: 220, height: 120 }, obstacles: [] as Box[], floats: [] as Box[] });
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const geometry = geometryRef.current;
  const gesture = useRef<{ id: number; start: Point; base: Point; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const measure = useCallback(() => {
    const root = document.querySelector('.fd30');
    if (!root || !frame.current) return;
    const viewport = window.visualViewport;
    const x = (viewport?.offsetLeft ?? 0) + 8;
    const y = Math.max((viewport?.offsetTop ?? 0) + 8, (root.querySelector('.fd-header')?.getBoundingClientRect().bottom ?? 0) + 8);
    let right = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? innerWidth) - 8;
    let bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight) - 8;
    const preferenceBounds = { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
    const chat = root.querySelector('.fd-chat');
    if (chat) {
      const r = chat.getBoundingClientRect();
      if (innerWidth >= 1000) right = Math.min(right, r.left - 12);
      else bottom = Math.min(bottom, r.top - 12);
    }
    const bounds = { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
    const obstacles = [...root.querySelectorAll('.fd-main a, .fd-main button, .fd-main input, .fd-main select, .fd-main summary')]
      .map(e => asBox(e.getBoundingClientRect())).filter(r => r.width && r.height && r.y < bottom && r.y + r.height > y);
    // The other floating control (Demo mode button and, while open, its panel) must stay reachable.
    const floats = [...root.querySelectorAll('.fd-demo-fab, .fd-demo-panel:not([hidden])')].map(e => asBox(e.getBoundingClientRect())).filter(r => r.width && r.height);
    const rect = frame.current.getBoundingClientRect(), notice = bubble.current?.getBoundingClientRect();
    const old = geometryRef.current;
    const next = { bounds, preferenceBounds, size: { width: rect.width, height: rect.height }, notice: notice ? { width: notice.width, height: notice.height } : old.notice, obstacles, floats };
    if (JSON.stringify(old) === JSON.stringify(next)) return;
    geometryRef.current = next;
    rerender();
  }, []);
  useLayoutEffect(() => { measure(); });
  useLayoutEffect(() => {
    const observer = new ResizeObserver(measure);
    if (frame.current) observer.observe(frame.current);
    if (bubble.current) observer.observe(bubble.current);
    window.addEventListener('resize', measure);
    window.addEventListener('fd-demo-dock', measure);
    window.addEventListener('scroll', measure, true);
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('fd-demo-dock', measure); window.removeEventListener('scroll', measure, true); window.visualViewport?.removeEventListener('resize', measure); window.visualViewport?.removeEventListener('scroll', measure); };
  }, [measure, infoOpen, moving]);
  // Escape closes the card and returns focus to the info button. It yields to move mode (Escape cancels the move) and to
  // the chat when focus is inside it, so one Escape never closes two things.
  useEffect(() => {
    if (!infoOpen || moving) return;
    const escape = (e: KeyboardEvent) => {
      const target = e.target as Node | null;
      if (e.key !== 'Escape' || e.defaultPrevented || (target !== document.body && !frame.current?.contains(target) && !(target as Element | null)?.closest?.('.fd-demo-fab'))) return;
      // The open Demo panel is the top layer and takes this Escape first.
      if (document.querySelector('.fd-demo-panel:not([hidden])')) return;
      e.preventDefault(); setInfoOpen(false); infoButton.current?.focus();
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [infoOpen, moving]);
  // Only viewport/chat constraints affect the resting anchor. Scroll changes bubble placement,
  // while main controls have paint/hit-test priority if they pass underneath the character.
  const point = fitPosition(dragPoint ?? fromPreference(preference, geometry.preferenceBounds, geometry.size), geometry.bounds, geometry.size, geometry.floats);
  const noticePoint = fitPosition({ x: point.x - geometry.notice.width - 12, y: point.y }, geometry.bounds, geometry.notice,
    [...geometry.obstacles, ...geometry.floats, { ...point, ...geometry.size }]);
  const dropAt = (p: Point) => fitPosition(p, geometry.bounds, geometry.size, [...geometry.obstacles, ...geometry.floats]);
  const commit = (p: Point) => onPosition(toPreference(dropAt(p), geometry.preferenceBounds, geometry.size));
  const release = (e: PointerEvent<HTMLButtonElement>, cancel: boolean) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (g.moved) {
      e.preventDefault(); suppressClick.current = true;
      if (!cancel) commit({ x: g.base.x + e.clientX - g.start.x, y: g.base.y + e.clientY - g.start.y });
    }
    setDragPoint(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const actualPose = moving || dragPoint ? 'interaction' : pose;
  const cardOpen = infoOpen || moving;
  // Actions appear only with a news item, and then at most the one contextual summary (sleep, exercise or lab sample).
  const action = news && hasSummary;
  const act = (action: () => void) => () => { action(); setInfoOpen(false); };
  return (
    <div className={`fd-floating fd-pose-${actualPose}${moving ? ' fd-key-moving' : ''}`} ref={frame} style={{ left: point.x, top: point.y }} data-owner={crew.id}>
      <span className="sr-only" id="fd-keyboard-help">{t.keyboardHint} {t.moveInstructions}</span>
      <button className="fd-character" ref={characterRef} type="button" aria-label={`${t.openChat} · ${crew.character}`} aria-expanded={chatOpen} aria-describedby="fd-keyboard-help" aria-keyshortcuts="m Home" aria-controls={chatOpen ? 'fd-chat-panel' : undefined}
        onPointerDown={e => {
          if (moving || e.button !== 0 || !e.isPrimary) return;
          suppressClick.current = false;
          gesture.current = { id: e.pointerId, start: { x: e.clientX, y: e.clientY }, base: point, moved: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {
          const g = gesture.current;
          if (!g || g.id !== e.pointerId) return;
          const dx = e.clientX - g.start.x, dy = e.clientY - g.start.y;
          if (Math.hypot(dx, dy) >= 8) g.moved = true;
          if (g.moved) { e.preventDefault(); setDragPoint(dropAt({ x: g.base.x + dx, y: g.base.y + dy })); }
        }}
        onPointerUp={e => release(e, false)} onPointerCancel={e => release(e, true)}
        onLostPointerCapture={() => { if (gesture.current) { suppressClick.current = true; gesture.current = null; setDragPoint(null); } }}
        onClick={e => { if (moving || (suppressClick.current && e.detail !== 0)) { e.preventDefault(); suppressClick.current = false; return; } onChat(); }}
        onKeyDown={e => {
          if (e.key === 'Home') { e.preventDefault(); onPosition(null); setDragPoint(null); setMoving(false); return; }
          if (!moving && e.key.toLowerCase() === 'm') { e.preventDefault(); setMoving(true); setDragPoint(point); return; }
          if (!moving) return;
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape', ' '].includes(e.key)) e.preventDefault();
          const step = e.shiftKey ? 32 : 8;
          const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
          if (delta) setDragPoint(dropAt({ x: point.x + delta[0], y: point.y + delta[1] }));
          if (e.key === 'Enter' || e.key === 'Escape') { if (e.key === 'Enter') commit(point); setDragPoint(null); setMoving(false); }
        }}>
        <Orbit variant={crew.shape} pose={actualPose} greeting={greeting} /><span>{crew.character}<small>{chatOpen ? t.interaction : t.chatClosed}</small></span>
      </button>
      <button className="fd-info" ref={infoButton} type="button" aria-expanded={infoOpen} aria-controls={cardOpen ? 'fd-companion-card' : undefined}
        aria-label={news && !infoOpen ? `${t.companionInfo} · ${t.news}` : t.companionInfo} onClick={() => setInfoOpen(open => !open)}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.6" /><circle cx="10" cy="6.2" r="1.15" fill="currentColor" /><path d="M10 9V14.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        {news && !infoOpen && <span className="fd-info-badge" aria-hidden="true">!</span>}
      </button>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{news ? `${t.news}. ${newsText}` : ''}</span>
      {cardOpen && <div className="fd-floating-notice" ref={bubble} id="fd-companion-card" role="region" aria-label={t.companionInfo} style={{ left: noticePoint.x, top: noticePoint.y, maxHeight: geometry.bounds.height, width: 'max-content', maxWidth: Math.min(220, geometry.bounds.width) }}>
        {moving ? <>
          <strong>{t.moveCompanion}</strong>
          <p>{t.moveInstructions}</p>
        </> : <>
          <span className="fd-presence-status">{actualPose === 'interaction' ? t.interaction : news ? t.news : t.idle}</span>
          <p style={action ? undefined : { marginBottom: 0 }}>{actualPose === 'interaction' ? t.interactionText : news ? newsText : t.idleText}</p>
          {action && <button className="fd-link fd-summary-action" type="button" onClick={act(onSummary)}>{t.summary}<span aria-hidden="true">→</span></button>}
        </>}
      </div>}
    </div>
  );
}
