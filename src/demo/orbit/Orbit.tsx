import type { CSSProperties } from 'react';
import { blinkEyes, faceFor } from './OrbitFaces';
import { BLINKS, BODY_PIVOT, DEFAULT_ORBIT, PIECES, PLACEMENT, bobAmplitude, expressionFor, layerBox, layerUrl, placementTransform } from './orbitData';
import type { OrbitVariant, Pose } from './orbitData';
import './orbit.css';

export type { OrbitVariant, Pose } from './orbitData';

const Layer = ({ v, name }: { v: OrbitVariant; name: string }) => {
  const b = layerBox(v, name);
  return <image href={layerUrl(v, name)} x={b.x} y={b.y} width={b.w} height={b.h} />;
};

/** One companion drawing for every Orbit. The art is the supplied design; only the face (expressions) and, where the design has them, its own limbs move. */
export function Orbit({ variant = DEFAULT_ORBIT, pose, greeting = false }: { variant?: OrbitVariant; pose: Pose; greeting?: boolean }) {
  const expression = expressionFor(pose, greeting);
  const p = PLACEMENT[variant];
  const [bx, by] = BODY_PIVOT[variant];
  const vars = { '--orbit-amp': `${bobAmplitude(variant)}px`, '--orbit-delay': `${(variant.length * 0.37).toFixed(2)}s` } as CSSProperties;
  return (
    <svg className={`orbit orbit-${variant} orbit-${pose}${greeting ? ' is-greeting' : ''}`} viewBox="0 0 180 210" aria-hidden="true" focusable="false" style={vars}>
      <ellipse cx="89" cy={p.shadowY} rx={p.shadow} ry="6" fill="currentColor" opacity=".12" className="orbit-shadow" />
      <g transform={placementTransform(variant)}>
        <g className="orbit-tilt" style={{ transformOrigin: `${bx}px ${by}px` }}>
          <g className="orbit-float">
            {PIECES[variant].map(piece => <g key={piece.name} className={`orbit-piece orbit-${piece.role}`} style={{ transformOrigin: `${piece.pivot[0]}px ${piece.pivot[1]}px` }}><Layer v={variant} name={piece.name} /></g>)}
            <Layer v={variant} name="body" />
            <g className="orbit-face" data-expression={expression}>
              {expression === 'rest' ? <>
                <g className="orbit-eyes-rest"><Layer v={variant} name="face-eyes" /></g>
                {BLINKS[variant] && <g className="orbit-eyes-blink">{blinkEyes(variant)}</g>}
                <Layer v={variant} name="face-mouth" />
              </> : faceFor(variant, expression)}
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
