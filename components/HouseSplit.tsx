/**
 * Casa moderna desenhada duas vezes na mesma geometria: à esquerda a estrutura (linhas do modelo 3D),
 * à direita o render. A faixa que separa as duas metades se move devagar (CSS em globals.css).
 */
const V = "0 0 800 520";

function Slats({ x, y, w, h, step, color }: { x: number; y: number; w: number; h: number; step: number; color: string }) {
  const n = Math.floor(h / step);
  return <g stroke={color} strokeWidth="1">{Array.from({ length: n }, (_, i) => <line key={i} x1={x} x2={x + w} y1={y + (i + 1) * step} y2={y + (i + 1) * step} />)}</g>;
}

function Real() {
  return (
    <svg className="layer real" viewBox={V} preserveAspectRatio="xMidYMid slice" role="presentation">
      <defs>
        <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#190019" /><stop offset=".35" stopColor="#2B124C" /><stop offset=".62" stopColor="#854F6C" />
          <stop offset=".8" stopColor="#DFB6B2" /><stop offset="1" stopColor="#FBE4D8" />
        </linearGradient>
        <linearGradient id="hs-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#522B5B" /><stop offset="1" stopColor="#190019" /></linearGradient>
        <linearGradient id="hs-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FBE4D8" /><stop offset=".55" stopColor="#DFB6B2" /><stop offset="1" stopColor="#854F6C" /></linearGradient>
        <linearGradient id="hs-concrete" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#DFB6B2" /><stop offset="1" stopColor="#a8808a" /></linearGradient>
        <linearGradient id="hs-wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#854F6C" /><stop offset="1" stopColor="#6a3b5a" /></linearGradient>
        <linearGradient id="hs-pool" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#854F6C" /><stop offset=".5" stopColor="#DFB6B2" /><stop offset="1" stopColor="#522B5B" /></linearGradient>
        <radialGradient id="hs-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#FBE4D8" stopOpacity=".85" /><stop offset="1" stopColor="#FBE4D8" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="800" height="520" fill="url(#hs-sky)" />
      <ellipse cx="420" cy="380" rx="420" ry="90" fill="url(#hs-glow)" />
      <rect y="380" width="800" height="140" fill="url(#hs-ground)" />
      {/* piscina */}
      <polygon points="110,394 470,394 506,436 76,436" fill="url(#hs-pool)" />
      <g stroke="#FBE4D8" strokeOpacity=".5"><line x1="150" y1="404" x2="300" y2="404" /><line x1="250" y1="416" x2="420" y2="416" /><line x1="130" y1="426" x2="260" y2="426" /></g>
      {/* volume térreo envidraçado */}
      <rect x="130" y="262" width="330" height="110" fill="url(#hs-glass)" />
      <rect x="140" y="272" width="100" height="100" fill="#FBE4D8" opacity=".55" />
      <g stroke="#522B5B" strokeWidth="3"><line x1="185" y1="262" x2="185" y2="372" /><line x1="240" y1="262" x2="240" y2="372" /><line x1="295" y1="262" x2="295" y2="372" /><line x1="350" y1="262" x2="350" y2="372" /><line x1="405" y1="262" x2="405" y2="372" /></g>
      <rect x="130" y="262" width="330" height="110" fill="none" stroke="#522B5B" strokeWidth="4" />
      {/* ala em madeira + porta */}
      <rect x="460" y="262" width="230" height="110" fill="url(#hs-wood)" />
      <Slats x={460} y={262} w={230} h={110} step={9} color="rgba(25,0,25,.38)" />
      <rect x="474" y="298" width="38" height="74" fill="#190019" /><rect x="474" y="298" width="38" height="74" fill="none" stroke="#DFB6B2" strokeOpacity=".5" />
      {/* volume superior em balanço */}
      <rect x="210" y="172" width="450" height="90" fill="url(#hs-concrete)" />
      <rect x="252" y="196" width="262" height="44" fill="#2B124C" /><rect x="252" y="196" width="262" height="44" fill="#FBE4D8" opacity=".28" />
      <g stroke="#190019" strokeOpacity=".55" strokeWidth="2"><line x1="340" y1="196" x2="340" y2="240" /><line x1="428" y1="196" x2="428" y2="240" /></g>
      {/* laje de cobertura e sombra */}
      <rect x="190" y="158" width="490" height="14" fill="#FBE4D8" />
      <rect x="210" y="262" width="450" height="8" fill="#190019" opacity=".32" />
      <rect x="90" y="372" width="640" height="9" fill="#522B5B" />
      {/* vegetação */}
      <g fill="#522B5B"><rect x="66" y="300" width="8" height="72" fill="#2B124C" /><circle cx="70" cy="282" r="48" /><circle cx="40" cy="312" r="32" /><circle cx="102" cy="314" r="32" />
        <rect x="741" y="316" width="8" height="56" fill="#2B124C" /><circle cx="745" cy="298" r="40" /><circle cx="772" cy="326" r="26" /><circle cx="716" cy="328" r="26" /></g>
      <g fill="#854F6C" opacity=".75"><circle cx="58" cy="268" r="20" /><circle cx="738" cy="286" r="16" /></g>
      <g fill="#2B124C"><ellipse cx="560" cy="380" rx="34" ry="14" /><ellipse cx="610" cy="384" rx="26" ry="11" /></g>
    </svg>
  );
}

function Wire() {
  const s = "#DFB6B2";
  const grid = [];
  for (let x = 0; x <= 800; x += 40) grid.push(<line key={"v" + x} x1={x} x2={x} y1="0" y2="520" />);
  for (let y = 0; y <= 520; y += 40) grid.push(<line key={"h" + y} x1="0" x2="800" y1={y} y2={y} />);
  return (
    <svg className="layer wire" viewBox={V} preserveAspectRatio="xMidYMid slice" role="presentation">
      <rect width="800" height="520" fill="#190019" />
      <g stroke={s} strokeOpacity=".08">{grid}</g>
      <g fill="none" stroke={s} strokeWidth="1.4" strokeLinejoin="round">
        <line x1="0" y1="380" x2="800" y2="380" strokeOpacity=".5" />
        <polygon points="110,394 470,394 506,436 76,436" strokeOpacity=".8" />
        <g strokeOpacity=".4"><line x1="150" y1="404" x2="300" y2="404" /><line x1="250" y1="416" x2="420" y2="416" /></g>
        <rect x="130" y="262" width="330" height="110" />
        <g strokeOpacity=".7"><line x1="185" y1="262" x2="185" y2="372" /><line x1="240" y1="262" x2="240" y2="372" /><line x1="295" y1="262" x2="295" y2="372" /><line x1="350" y1="262" x2="350" y2="372" /><line x1="405" y1="262" x2="405" y2="372" /></g>
        <rect x="460" y="262" width="230" height="110" />
        <Slats x={460} y={262} w={230} h={110} step={9} color="rgba(223,182,178,.22)" />
        <rect x="474" y="298" width="38" height="74" />
        <rect x="210" y="172" width="450" height="90" />
        <rect x="252" y="196" width="262" height="44" /><line x1="340" y1="196" x2="340" y2="240" strokeOpacity=".6" /><line x1="428" y1="196" x2="428" y2="240" strokeOpacity=".6" />
        <rect x="190" y="158" width="490" height="14" />
        <rect x="90" y="372" width="640" height="9" />
        <g strokeOpacity=".55"><circle cx="70" cy="282" r="48" /><circle cx="40" cy="312" r="32" /><circle cx="102" cy="314" r="32" /><line x1="70" y1="330" x2="70" y2="372" />
          <circle cx="745" cy="298" r="40" /><circle cx="772" cy="326" r="26" /><circle cx="716" cy="328" r="26" /><line x1="745" y1="338" x2="745" y2="372" /></g>
        {/* diagonais de construção e eixos */}
        <g strokeDasharray="5 6" strokeOpacity=".4"><line x1="130" y1="262" x2="460" y2="372" /><line x1="460" y1="262" x2="130" y2="372" /><line x1="210" y1="172" x2="660" y2="262" /><line x1="400" y1="130" x2="400" y2="460" /></g>
        {/* cotas */}
        <g strokeOpacity=".75"><line x1="190" y1="136" x2="680" y2="136" /><line x1="190" y1="128" x2="190" y2="144" /><line x1="680" y1="128" x2="680" y2="144" />
          <line x1="104" y1="158" x2="104" y2="372" /><line x1="96" y1="158" x2="112" y2="158" /><line x1="96" y1="372" x2="112" y2="372" /></g>
      </g>
      <g fill={s} fontFamily="ui-monospace, Consolas, monospace" fontSize="11" fillOpacity=".8">
        <text x="378" y="128">18,50</text><text x="82" y="270" transform="rotate(-90 82 270)">5,60</text>
        <text x="24" y="40" fillOpacity=".55">MODELO 3D · ESC 1:100</text>
      </g>
    </svg>
  );
}

export default function HouseSplit({ className = "" }: { className?: string }) {
  return (
    <div className={`house ${className}`} aria-hidden="true">
      <Wire />
      <Real />
      <div className="seam" />
    </div>
  );
}
