import type { ReactNode } from 'react';
import type { Expression, OrbitVariant } from './orbitData';

/** Vector faces in each design's own pixel space, in the same ink and cheek colours as the supplied art. The rest face is the original pixels. */
const LIRA = '#7e563a', LIRA_CHEEK = '#f9b77b', FLOP = '#3f3d6e', FLOP_CHEEK = '#f6b3a6', PIP = '#323459', PIP_MOUTH = '#243f4e', LUNA = '#213a3a', TONGUE = '#ee8f86', HI = '#ffffff';
const stroke = (c: string, w: number) => ({ fill: 'none', stroke: c, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

const liraCheeks = <g fill={LIRA_CHEEK} opacity=".8"><ellipse cx="178" cy="277" rx="27" ry="15" /><ellipse cx="347" cy="277" rx="27" ry="15" /></g>;
const flopCheeks = <g fill={FLOP_CHEEK} opacity=".85"><ellipse cx="535" cy="475" rx="50" ry="24" transform="rotate(-8 535 475)" /><ellipse cx="864" cy="398" rx="48" ry="24" transform="rotate(-12 864 398)" /></g>;
const FLOP_EYES: [number, number][] = [[537, 404], [815, 335]];
const PIP_EYES: { c: [number, number]; rx: number; ry: number; rot: number; hi: [[number, number, number], [number, number, number]] }[] = [
  { c: [450, 483], rx: 71, ry: 108.5, rot: 38.9, hi: [[478, 433, 20], [425, 470, 10]] },
  { c: [189, 509], rx: 72, ry: 109, rot: 127.7, hi: [[152, 468, 24], [210, 494, 11]] },
];
const LUNA_EYES: [number, number][] = [[495, 534], [726, 534]];

/** Closed eyes for the blink (eyes only: the mouth and cheeks stay as the original pixels). */
export function blinkEyes(v: OrbitVariant): ReactNode {
  if (v === 'flop') return <g {...stroke(FLOP, 11)}>{FLOP_EYES.map(([x, y]) => <path key={x} d={`M${x - 35} ${y - 2}Q${x} ${y + 24} ${x + 35} ${y - 2}`} transform={`rotate(-14 ${x} ${y})`} />)}</g>;
  if (v === 'pip') return <g fill={PIP}>{PIP_EYES.map(e => <ellipse key={e.c[0]} cx={e.c[0]} cy={e.c[1]} rx="9" ry={e.ry} transform={`rotate(${e.rot} ${e.c[0]} ${e.c[1]})`} />)}</g>;
  return <g {...stroke(LUNA, 12)}>{LUNA_EYES.map(([x, y]) => <path key={x} d={`M${x - 23} ${y + 3}Q${x} ${y + 18} ${x + 23} ${y + 3}`} />)}</g>;
}

const eyeDot = (x: number, y: number, rx: number, ry: number, hx: number, hy: number, hr: number, fill: string, rot = 0) => <g key={x}>
  <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={fill} transform={rot ? `rotate(${rot} ${x} ${y})` : undefined} /><circle cx={x + hx} cy={y + hy} r={hr} fill={HI} />
</g>;

/** The non-rest expressions. `happy` greets, `alert` is the news pose, `attentive` is the chat-open pose. */
export function faceFor(v: OrbitVariant, e: Exclude<Expression, 'rest'>): ReactNode {
  if (v === 'lira') {
    const eyes = e === 'happy'
      ? <g {...stroke(LIRA, 13)}><path d="M174 250Q199 206 224 250" /><path d="M301 250Q326 206 351 250" /></g>
      : <g>{[199, 326].map(x => eyeDot(x, 236, e === 'alert' ? 14 : 12, e === 'alert' ? 19 : 15, e === 'alert' ? 5 : -3, e === 'alert' ? -7 : -5, e === 'alert' ? 5 : 4, LIRA))}</g>;
    const mouth = e === 'happy' ? <g><path d="M232 272Q262 322 292 272Z" fill={LIRA} stroke={LIRA} strokeWidth="6" strokeLinejoin="round" /><ellipse cx="262" cy="297" rx="14" ry="7" fill={TONGUE} /></g>
      : e === 'alert' ? <ellipse cx="262" cy="289" rx="9" ry="12" fill={LIRA} /> : <path d="M236 280Q262 302 288 280" {...stroke(LIRA, 10)} />;
    return <g>{liraCheeks}{eyes}{mouth}</g>;
  }
  if (v === 'flop') {
    const r = e === 'alert' ? 42 : 37;
    const eyes = e === 'happy'
      ? <g {...stroke(FLOP, 11)}>{FLOP_EYES.map(([x, y]) => <path key={x} d={`M${x - 35} ${y + 8}Q${x} ${y - 28} ${x + 35} ${y + 8}`} transform={`rotate(-14 ${x} ${y})`} />)}</g>
      : <g>{FLOP_EYES.map(([x, y]) => eyeDot(x, y, r, r, e === 'alert' ? -12 : 8, e === 'alert' ? -12 : -9, e === 'alert' ? 14 : 12, FLOP))}</g>;
    const mouth = e === 'happy' ? <g><path d="M641 436Q690 490 737 410Z" fill={FLOP} stroke={FLOP} strokeWidth="7" strokeLinejoin="round" /><ellipse cx="692" cy="456" rx="16" ry="8" fill={TONGUE} transform="rotate(-14 692 456)" /></g>
      : e === 'alert' ? <ellipse cx="690" cy="440" rx="12" ry="15" fill={FLOP} transform="rotate(-14 690 440)" /> : <path d="M660 438Q690 458 722 424" {...stroke(FLOP, 13)} />;
    return <g>{flopCheeks}{eyes}{mouth}</g>;
  }
  if (v === 'pip') {
    const sx = e === 'alert' ? 1.08 : e === 'happy' ? 0.82 : 1;
    const eyes = <g>{PIP_EYES.map(p => <g key={p.c[0]} transform={`translate(${p.c[0]} ${p.c[1]}) scale(${sx}) translate(${-p.c[0]} ${-p.c[1]})`}>
      <ellipse cx={p.c[0]} cy={p.c[1]} rx={p.rx} ry={p.ry} transform={`rotate(${p.rot} ${p.c[0]} ${p.c[1]})`} fill={PIP} />
      <circle cx={p.hi[0][0] + (e === 'attentive' ? -6 : 0)} cy={p.hi[0][1] + (e === 'attentive' ? -8 : 0)} r={p.hi[0][2] + (e === 'alert' ? 4 : 0)} fill={HI} /><circle cx={p.hi[1][0]} cy={p.hi[1][1]} r={p.hi[1][2]} fill={HI} />
    </g>)}</g>;
    const mouth = e === 'happy' ? <g><path d="M287 624Q333 692 384 616Z" fill={PIP_MOUTH} stroke={PIP_MOUTH} strokeWidth="8" strokeLinejoin="round" /><ellipse cx="335" cy="656" rx="17" ry="8" fill={TONGUE} /></g>
      : e === 'alert' ? <ellipse cx="333" cy="642" rx="16" ry="20" fill={PIP_MOUTH} /> : <path d="M297 630Q335 654 372 624" {...stroke(PIP_MOUTH, 10)} />;
    return <g>{eyes}{mouth}</g>;
  }
  const eyes = e === 'happy'
    ? <g {...stroke(LUNA, 12)}>{LUNA_EYES.map(([x, y]) => <path key={x} d={`M${x - 23} ${y + 14}Q${x} ${y - 22} ${x + 23} ${y + 14}`} />)}</g>
    : <g fill={LUNA}>{LUNA_EYES.map(([x, y]) => <ellipse key={x} cx={x + (e === 'attentive' ? 9 : 0)} cy={y} rx={e === 'alert' ? 24 : 21.5} ry={e === 'alert' ? 41 : 35} />)}</g>;
  const mouth = e === 'happy' ? <path d="M560 592Q606 662 652 592Z" fill={LUNA} stroke={LUNA} strokeWidth="10" strokeLinejoin="round" />
    : e === 'alert' ? <ellipse cx="606" cy="616" rx="17" ry="21" fill={LUNA} /> : <path d="M565 596Q606 644 647 596" {...stroke(LUNA, 22)} />;
  return <g>{eyes}{mouth}</g>;
}
