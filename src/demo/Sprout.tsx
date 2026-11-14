export function Sprout({ pose }: { pose: 'idle' | 'news' | 'interaction' }) {
  return (
    <svg className={`sprout sprout-${pose}`} viewBox="0 0 180 210" aria-hidden="true" focusable="false">
      <ellipse cx="89" cy="197" rx="48" ry="7" fill="#243d3e" opacity=".12" />
      <g className="sprout-body" stroke="#243d3e" strokeWidth="3" strokeLinejoin="round">
        <path d="M73 60C40 59 26 36 35 18C61 20 77 34 73 60Z" fill="#a8b9a2" />
        <path d="M92 62C85 28 108 5 139 8C143 37 125 58 92 62Z" fill="#6d9686" />
        <path d="M73 59L45 30M94 59L128 19" fill="none" />
        <path d="M60 168L57 190Q69 201 80 189L82 171M99 170L103 190Q116 198 124 188L117 165" fill="#243d3e" />
        <path className="sprout-arm-left" d="M53 113Q29 112 32 137Q38 147 51 130" fill="#e4b18b" />
        <path className="sprout-arm-right" d={pose === 'news' ? 'M126 112Q157 110 148 81Q138 72 137 98L121 103' : pose === 'interaction' ? 'M125 112Q152 97 161 108Q166 119 131 130' : 'M125 116Q147 119 140 141Q132 149 122 130'} fill="#e4b18b" />
        <path d="M85 49C61 58 43 90 46 123C48 161 63 179 90 179C119 179 134 157 134 126C134 91 111 62 85 49Z" fill="#efc6a2" />
        <path d="M57 103Q89 87 123 103L122 128Q87 146 57 128Z" fill="#fff2db" strokeWidth="2" />
        {pose === 'idle' ? <path d="M69 114L76 115M102 115L109 114" strokeWidth="4" strokeLinecap="round" /> : <g fill="#243d3e" stroke="none"><ellipse cx="73" cy="114" rx="4" ry={pose === 'news' ? 6 : 4} /><ellipse cx="106" cy="114" rx="4" ry={pose === 'news' ? 6 : 4} /></g>}
        <path d={pose === 'news' ? 'M85 125Q90 131 95 125M67 101L76 98M102 98L111 101' : 'M85 126L94 126'} fill="none" strokeWidth="2" strokeLinecap="round" />
        <path d="M70 157Q91 164 112 155" fill="none" stroke="#ae7656" strokeWidth="2" />
      </g>
    </svg>
  );
}
