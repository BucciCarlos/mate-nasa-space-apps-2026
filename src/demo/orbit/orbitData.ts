import layoutJson from './assets/layout.json';

/** Orbit variants. The original (`luna`, shown as «Orbit») is the default; Lira, Flop and Pip are the per-profile companions. */
export type OrbitVariant = 'luna' | 'lira' | 'flop' | 'pip';
export type Pose = 'idle' | 'news' | 'interaction';
export type Expression = 'rest' | 'happy' | 'alert' | 'attentive';
export const DEFAULT_ORBIT: OrbitVariant = 'luna';

export interface LayerBox { x: number; y: number; w: number; h: number }
interface VariantLayout { width: number; height: number; scale: number; layers: Record<string, LayerBox> }
const layout = layoutJson as unknown as Record<OrbitVariant, VariantLayout>;

// Sprites are cut from the supplied designs; every coordinate below is in the sprite's own pixel space (its "master").
const urls = import.meta.glob('./assets/*/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const layerUrl = (variant: OrbitVariant, name: string) => urls[`./assets/${variant}/${name}.png`];
export const layerBox = (variant: OrbitVariant, name: string): LayerBox => layout[variant].layers[name];

/** Fits each design into the shared 180×210 companion box: `cx` centre, `top` of the visible art, `k` master → box scale. */
export const PLACEMENT: Record<OrbitVariant, { cx: number; top: number; k: number; art: LayerBox; shadow: number; shadowY: number }> = {
  luna: { cx: 90, top: 37, k: 0.14, art: { x: 66, y: 18, w: 1126, h: 1076 }, shadow: 48 , shadowY: 197 },
  lira: { cx: 90, top: 40, k: 0.287, art: { x: 19, y: 19, w: 487, h: 459 }, shadow: 34 , shadowY: 184 },
  flop: { cx: 90, top: 62, k: 0.126, art: { x: 52, y: 52, w: 1307, h: 782 }, shadow: 38 , shadowY: 170 },
  pip: { cx: 90, top: 14, k: 0.1675, art: { x: 40, y: 40, w: 590, h: 1015 }, shadow: 28 , shadowY: 196 },
};
export const placementTransform = (v: OrbitVariant) => {
  const p = PLACEMENT[v];
  return `translate(${(p.cx - p.k * (p.art.x + p.art.w / 2)).toFixed(2)} ${(p.top - p.k * p.art.y).toFixed(2)}) scale(${p.k})`;
};

/** Movable pieces: drawn under the body, pivot in master pixels, and the animation class that drives them. */
export const PIECES: Record<OrbitVariant, { name: string; pivot: [number, number]; role: string }[]> = {
  luna: [], flop: [],
  lira: [{ name: 'tip-left', pivot: [151, 232], role: 'tip-left' }, { name: 'tip-right', pivot: [373, 232], role: 'tip-right' }],
  pip: [{ name: 'antenna', pivot: [300, 235], role: 'antenna' }, { name: 'arm-left', pivot: [245, 775], role: 'arm-left' }, { name: 'arm-right', pivot: [485, 775], role: 'arm-right' }],
};
/** Variants whose rest eyes are open and can blink. */
export const BLINKS: Record<OrbitVariant, boolean> = { luna: true, lira: false, flop: true, pip: true };
export const bobAmplitude = (v: OrbitVariant) => Math.round(3 / PLACEMENT[v].k);
export const BODY_PIVOT: Record<OrbitVariant, [number, number]> = { luna: [640, 1080], lira: [262, 470], flop: [705, 780], pip: [335, 1050] };

/** Pose + greeting → expression drawn on the face. */
export function expressionFor(pose: Pose, greeting: boolean): Expression {
  if (greeting) return 'happy';
  return pose === 'news' ? 'alert' : pose === 'interaction' ? 'attentive' : 'rest';
}
