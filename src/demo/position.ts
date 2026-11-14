import type { Position } from './fd30';

export interface Point { x: number; y: number }
export interface Size { width: number; height: number }
export interface Box extends Point, Size {}
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(Math.max(low, high), n));
export function fromPreference(preference: Position | null, bounds: Box, size: Size): Point {
  return { x: bounds.x + Math.max(0, bounds.width - size.width) * (preference?.x ?? 1),
    y: bounds.y + Math.max(0, bounds.height - size.height) * (preference?.y ?? 1) };
}
export function toPreference(point: Point, bounds: Box, size: Size): Position {
  return { x: clamp((point.x - bounds.x) / Math.max(1, bounds.width - size.width), 0, 1),
    y: clamp((point.y - bounds.y) / Math.max(1, bounds.height - size.height), 0, 1) };
}
export function intersects(a: Box, b: Box) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
/** Nearest feasible drop/notice. Paint/hit-test priority still protects controls if space is exhausted. */
export function fitPosition(desired: Point, bounds: Box, size: Size, obstacles: Box[] = []): Point {
  const maxX = bounds.x + bounds.width - size.width, maxY = bounds.y + bounds.height - size.height;
  const bounded = (p: Point) => ({ x: clamp(p.x, bounds.x, maxX), y: clamp(p.y, bounds.y, maxY) });
  const target = bounded(desired);
  const free = (p: Point) => !obstacles.some(o => intersects({ ...p, ...size }, o));
  if (free(target)) return target;
  const xs = [target.x, bounds.x, maxX, ...obstacles.flatMap(o => [o.x - size.width - 6, o.x + o.width + 6])];
  const ys = [target.y, bounds.y, maxY, ...obstacles.flatMap(o => [o.y - size.height - 6, o.y + o.height + 6])];
  let best = target, distance = Infinity;
  for (const x of xs) for (const y of ys) {
    const p = bounded({ x, y });
    const d = (p.x - target.x) ** 2 + (p.y - target.y) ** 2;
    if (d < distance && free(p)) { best = p; distance = d; }
  }
  return best;
}
