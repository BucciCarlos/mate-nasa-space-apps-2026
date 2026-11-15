import { Sprout } from './Sprout';

export type Pose = 'idle' | 'news' | 'interaction';
export function CrewCharacter({ shape, pose, greeting = false }: { shape: 'sprout' | 'beacon' | 'sail'; pose: Pose; greeting?: boolean }) {
  if (shape === 'sprout') return <Sprout pose={pose} greeting={greeting} />;
  const lively = pose === 'news' || greeting;
  const beacon = shape === 'beacon';
  return (
    <svg className={`sprout sprout-${pose} character-${shape}${greeting ? ' is-greeting' : ''}`} viewBox="0 0 180 210" aria-hidden="true" focusable="false">
      <ellipse cx="89" cy="197" rx="48" ry="7" fill="#243d3e" opacity=".12" />
      <g className="crew-sway">
      <g className="sprout-body" stroke="#243d3e" strokeWidth="3" strokeLinejoin="round">
        {beacon ? <>
          <path d="M74 76L62 26L82 40L91 17L99 42L119 28L106 77Z" fill="#c39b63" />
          <path d="M54 165L46 188Q58 199 73 188L78 168M106 168L113 188Q126 198 136 187L129 163" fill="#243d3e" />
          <path d="M45 116L24 132L34 146L51 133" fill="#c2c5ae" />
          <path className="crew-wave-arm" d={lively ? 'M134 116L154 78L164 85L151 136L132 137' : 'M135 116L159 130L149 146L131 133'} fill="#c2c5ae" />
          <path d="M61 72L118 72L145 165Q92 186 35 165Z" fill="#c2c5ae" />
          <path d="M55 104L126 104L132 132L48 132Z" fill="#fff2db" />
          <path d="M59 157H119M87 145H94" stroke="#7b8066" strokeWidth="2" />
        </> : <>
          <path d="M100 75Q164 16 157 143Q140 159 110 149Z" fill="#a3b8c9" />
          <path d="M113 89L147 55L142 128L120 137" fill="none" stroke="#587d91" strokeWidth="2" />
          <path d="M67 168L62 188Q72 198 85 188L87 167M96 169L108 189Q122 196 129 186L116 163" fill="#243d3e" />
          <path d="M59 118L34 137L39 149L64 134" fill="#c9d6cd" />
          <path className="crew-wave-arm" d={lively ? 'M110 116L127 79L138 84L128 133L109 139' : 'M110 119L130 137L121 149L105 133'} fill="#c9d6cd" />
          <path d="M83 43Q48 63 54 120Q42 174 83 180Q124 180 120 147Q117 127 106 111Q133 55 83 43Z" fill="#c9d6cd" />
          <path d="M63 101Q86 87 112 104L109 129Q83 143 61 124Z" fill="#fff2db" strokeWidth="2" />
          <path d="M67 157Q89 166 106 154" fill="none" stroke="#6c8c87" strokeWidth="2" />
        </>}
        {pose === 'idle' && !greeting ? <path d="M70 114L77 115M101 115L108 114" strokeWidth="4" strokeLinecap="round" /> : <g fill="#243d3e" stroke="none"><ellipse cx="73" cy="114" rx="4" ry={lively ? 6 : 4} /><ellipse cx="105" cy="114" rx="4" ry={lively ? 6 : 4} /></g>}
        <path d={lively ? 'M84 125Q90 131 96 125M66 100L77 97M101 97L111 100' : 'M85 125L94 125'} fill="none" strokeWidth="2" strokeLinecap="round" />
      </g>
      </g>
    </svg>
  );
}
