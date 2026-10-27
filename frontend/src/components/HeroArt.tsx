/**
 * Hero illustration: a study desk with a Q&A thread on a laptop, Q and A
 * blocks, plants, and the college crest as a floating medallion.
 * Drawn here as inline SVG so it stays sharp and weighs almost nothing.
 */
export function HeroArt() {
  return (
    <svg
      className="hero-art"
      viewBox="0 0 540 460"
      role="img"
      aria-label="A study desk with a laptop showing a question and its answer, beside the college crest"
    >
      <defs>
        <linearGradient id="ha-blob" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE3CF" />
          <stop offset="1" stopColor="#FFC9A3" />
        </linearGradient>
        <linearGradient id="ha-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D79A64" />
          <stop offset="1" stopColor="#B97A48" />
        </linearGradient>
        <filter id="ha-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#8a4b1c" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* soft background shapes */}
      <path
        d="M96 70C170 8 330 0 430 56c86 48 106 150 74 236-30 82-118 128-214 134-98 6-186-22-232-92C-12 262 22 132 96 70Z"
        fill="url(#ha-blob)"
      />
      <circle cx="96" cy="96" r="14" fill="#FFF3E8" opacity="0.9" />
      <circle cx="486" cy="238" r="9" fill="#FFF3E8" opacity="0.9" />

      {/* crest medallion */}
      <g className="hero-crest" filter="url(#ha-shadow)">
        <circle cx="400" cy="124" r="86" fill="#fff" />
        <image href="/college-logo.png" x="322" y="46" width="156" height="156" />
      </g>

      {/* plants */}
      <g>
        <path d="M78 330c-30-34-26-78 6-104 6 40 22 66 14 104Z" fill="#8DB26B" />
        <path d="M88 330c18-30 44-48 70-50-8 30-34 52-70 50Z" fill="#A5C783" />
        <path d="M84 330c-10-26-4-56 16-76 10 26 6 52-16 76Z" fill="#76A055" />
        <path d="M58 330h56l-8 44a8 8 0 0 1-8 6H74a8 8 0 0 1-8-6l-8-44Z" fill="#D9774A" />
        <rect x="52" y="322" width="68" height="14" rx="7" fill="#E88D5F" />
      </g>
      <g>
        <path d="M470 338c20-28 16-62-6-82-6 30-16 52-10 82Z" fill="#8DB26B" />
        <path d="M462 338c-14-22-36-34-56-34 6 24 26 38 56 34Z" fill="#A5C783" />
        <path d="M442 342h56l-8 38a8 8 0 0 1-8 6h-24a8 8 0 0 1-8-6l-8-38Z" fill="#D9774A" />
        <rect x="436" y="334" width="68" height="14" rx="7" fill="#E88D5F" />
      </g>

      {/* desk */}
      <g filter="url(#ha-shadow)">
        <path d="M40 366h460l-22 22H62Z" fill="#A5693A" />
        <rect x="30" y="346" width="480" height="28" rx="14" fill="url(#ha-wood)" />
      </g>
      <rect x="92" y="388" width="14" height="54" rx="5" fill="#A5693A" />
      <rect x="434" y="388" width="14" height="54" rx="5" fill="#A5693A" />

      {/* laptop */}
      <g>
        <rect x="150" y="214" width="236" height="140" rx="12" fill="#2B3258" />
        <rect x="160" y="224" width="216" height="120" rx="6" fill="#FFF8F2" />
        {/* question */}
        <rect x="174" y="236" width="150" height="30" rx="10" fill="#FFE1CC" />
        <circle cx="190" cy="251" r="9" fill="#E8691F" />
        <text x="190" y="256" fontSize="13" fontWeight="800" fill="#fff" textAnchor="middle" fontFamily="system-ui, sans-serif">?</text>
        <rect x="206" y="245" width="100" height="6" rx="3" fill="#E8A57B" />
        <rect x="206" y="256" width="70" height="5" rx="2.5" fill="#EFC3A3" />
        {/* answer */}
        <rect x="204" y="276" width="156" height="44" rx="10" fill="#E3F2DA" />
        <circle cx="222" cy="298" r="9" fill="#4F9A4A" />
        <path d="m217.5 298.2 3.2 3.2 6-6.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="238" y="288" width="108" height="6" rx="3" fill="#8DBF84" />
        <rect x="238" y="299" width="86" height="5" rx="2.5" fill="#AED3A6" />
        <rect x="238" y="309" width="60" height="5" rx="2.5" fill="#AED3A6" />
        {/* base */}
        <path d="M128 354h280l-14 12a10 10 0 0 1-7 3H149a10 10 0 0 1-7-3Z" fill="#3A4170" />
        <rect x="232" y="356" width="72" height="5" rx="2.5" fill="#2B3258" />
      </g>

      {/* Q and A blocks */}
      <g>
        <g transform="rotate(-6 126 326)">
          <rect x="100" y="302" width="50" height="50" rx="9" fill="#F07A33" />
          <rect x="100" y="340" width="50" height="12" rx="6" fill="#D4601E" />
          <text x="125" y="337" fontSize="30" fontWeight="800" fill="#fff" textAnchor="middle" fontFamily="'DM Serif Display', Georgia, serif">Q</text>
        </g>
        <g transform="rotate(5 410 332)">
          <rect x="386" y="308" width="46" height="46" rx="9" fill="#5FAE58" />
          <rect x="386" y="342" width="46" height="12" rx="6" fill="#47913F" />
          <text x="409" y="341" fontSize="28" fontWeight="800" fill="#fff" textAnchor="middle" fontFamily="'DM Serif Display', Georgia, serif">A</text>
        </g>
      </g>

      {/* floating bubbles */}
      <g className="hero-bubble hero-bubble-a">
        <rect x="64" y="150" width="76" height="52" rx="16" fill="#F07A33" />
        <path d="m92 202-4 14 18-14Z" fill="#F07A33" />
        <text x="102" y="188" fontSize="30" fontWeight="800" fill="#fff" textAnchor="middle" fontFamily="system-ui, sans-serif">?</text>
      </g>
      <g className="hero-bubble hero-bubble-b">
        <rect x="236" y="116" width="76" height="52" rx="16" fill="#fff" />
        <path d="m290 168 4 14-18-14Z" fill="#fff" />
        <path d="m260 142 9 9 17-18" fill="none" stroke="#4F9A4A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
