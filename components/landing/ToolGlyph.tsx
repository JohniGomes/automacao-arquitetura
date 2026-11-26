import type { CSSProperties, ReactNode } from "react";

/** Ícones ilustrados das ferramentas, só para a landing: ladrilho em degradê com brilho e sombra colorida
 *  e um desenho em camadas (corpo claro, detalhe quente, recorte na cor do ladrilho). O app usa o ToolIcon simples. */

type Id = "mapa" | "moodboard" | "render" | "melhorar" | "esboco" | "ideias" | "luz" | "editor" | "angulos" | "filme" | "memorial";

/** [claro, escuro] do ladrilho. Paleta da marca: terracota, âmbar, violeta, rosa. */
const COLORS: Record<Id, [string, string]> = {
  mapa: ["#8C73FF", "#4A33C8"],
  moodboard: ["#F5A850", "#C7701F"],
  render: ["#FF7F5C", "#CC4326"],
  melhorar: ["#BC93FF", "#7745DD"],
  esboco: ["#F66E8A", "#BE3563"],
  ideias: ["#FFCB63", "#E58A2E"],
  luz: ["#FFA06E", "#DD512F"],
  editor: ["#7F8CFF", "#4A52D6"],
  angulos: ["#FF80B2", "#B4406A"],
  filme: ["#FF6F4D", "#B3301B"],
  memorial: ["#FF7A59", "#BE3A22"],
};

const WARM = "#FFE0A8";
const ROSE = "#FFB5C4";
const CUT = { fill: "var(--b)" } as CSSProperties;

function glyph(id: Id, F: string): ReactNode {
  switch (id) {
    case "mapa":
      return (
        <>
          <ellipse cx="24" cy="41.5" rx="10" ry="3" fill="#000" opacity=".28" />
          <path d="M24 5c-7.4 0-13 5.5-13 12.6C11 27.5 24 41 24 41s13-13.5 13-23.4C37 10.5 31.4 5 24 5z" fill={F} />
          <circle cx="24" cy="17.5" r="6" style={CUT} />
          <circle cx="24" cy="17.5" r="2.4" fill={WARM} />
        </>
      );
    case "moodboard":
      return (
        <>
          <rect x="7" y="7" width="16" height="21" rx="4.5" fill={F} />
          <rect x="25" y="7" width="16" height="11" rx="4.5" fill={WARM} />
          <rect x="25" y="20" width="16" height="21" rx="4.5" fill={F} opacity=".78" />
          <rect x="7" y="30" width="16" height="11" rx="4.5" fill="#fff" opacity=".42" />
          <circle cx="15" cy="16" r="3.4" style={{ ...CUT, opacity: 0.55 }} />
        </>
      );
    case "render":
      return (
        <>
          <ellipse cx="24" cy="42" rx="14" ry="2.6" fill="#000" opacity=".25" />
          <path d="M9 24h30v17H9z" fill={F} />
          <path d="M4 25.5 24 9l20 16.5z" fill={WARM} />
          <path d="M20 41V30.5h8V41z" style={CUT} />
          <path d="M36.5 2.5l1.7 4.6 4.6 1.7-4.6 1.7-1.7 4.6-1.7-4.6-4.6-1.7 4.6-1.7z" fill="#fff" />
        </>
      );
    case "melhorar":
      return (
        <>
          <path d="M21 7l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill={F} />
          <path d="M37 27l2.2 5.8 5.8 2.2-5.8 2.2-2.2 5.8-2.2-5.8-5.8-2.2 5.8-2.2z" fill={WARM} />
          <path d="M38 5l1.3 3.4 3.4 1.3-3.4 1.3-1.3 3.4-1.3-3.4-3.4-1.3 3.4-1.3z" fill="#fff" opacity=".85" />
        </>
      );
    case "esboco":
      return (
        <>
          <path d="M5 42c4-4 7 2 12-1" stroke={WARM} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <g transform="rotate(40 26 24)">
            <rect x="21" y="9" width="10" height="24" fill={F} />
            <rect x="21" y="9" width="10" height="3.4" fill="#fff" opacity=".55" />
            <rect x="21" y="3" width="10" height="7" rx="2.6" fill={ROSE} />
            <path d="M21 33h10l-5 10z" fill={WARM} />
            <path d="M24.2 39.2h3.6L26 43z" style={CUT} />
          </g>
        </>
      );
    case "ideias":
      return (
        <>
          <path d="M24 6c-7.2 0-12 4.8-12 11 0 4.2 2.2 6.6 4.2 8.7 1.2 1.3 1.8 2.6 1.8 4.3h12c0-1.7.6-3 1.8-4.3C33.8 23.6 36 21.2 36 17c0-6.2-4.8-11-12-11z" fill={F} />
          <path d="M18.5 34.5h11v2.5a3 3 0 0 1-3 3h-5a3 3 0 0 1-3-3z" fill={WARM} />
          <path d="M21 27c1.5-2.8 4.5-2.8 6 0" stroke="var(--b)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M24 1.5V4M8.5 8l1.8 1.8M39.5 8l-1.8 1.8M3 20.5h2.6M42.4 20.5H45" stroke={WARM} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </>
      );
    case "luz":
      return (
        <>
          <circle cx="24" cy="24" r="9.5" fill={F} />
          <circle cx="24" cy="24" r="5" fill={WARM} />
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k * Math.PI) / 4;
            const c = Math.cos(a), s = Math.sin(a);
            return <path key={k} d={`M${(24 + c * 15).toFixed(2)} ${(24 + s * 15).toFixed(2)}L${(24 + c * 19.5).toFixed(2)} ${(24 + s * 19.5).toFixed(2)}`} stroke={WARM} strokeWidth="3.2" strokeLinecap="round" />;
          })}
        </>
      );
    case "editor":
      return (
        <>
          <rect x="6" y="6" width="29" height="29" rx="6.5" fill="#fff" opacity=".22" stroke="#fff" strokeWidth="2.2" strokeDasharray="4.5 3.2" />
          <g transform="rotate(40 34 34)">
            <rect x="31" y="14" width="6" height="19" rx="3" fill={F} />
            <rect x="30.4" y="32" width="7.2" height="5.4" rx="1.2" fill={WARM} />
            <path d="M31 37.4h6c0 4.2-1 7-3 8.2-2-1.2-3-4-3-8.2z" fill={ROSE} />
          </g>
        </>
      );
    case "angulos":
      return (
        <>
          <path d="M24 4 38 12 24 20 10 12z" fill={F} />
          <path d="M10 12l14 8v15L10 27z" fill="#fff" opacity=".6" />
          <path d="M38 12 24 20v15l14-8z" fill="#fff" opacity=".34" />
          <path d="M7 37c3.4 6 11.5 8.6 19 7" stroke={WARM} strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <path d="M23.5 39.6 27 44l-4.8 2" stroke={WARM} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      );
    case "memorial":
      return (
        <>
          <path d="M11 5h18l9 9v29H11z" fill={F} />
          <path d="M29 5v9h9z" fill="#fff" opacity=".45" />
          <path d="M17 24h15M17 30h15M17 36h9" stroke={WARM} strokeWidth="2.8" strokeLinecap="round" fill="none" />
        </>
      );
    case "filme":
      return (
        <>
          <rect x="4" y="12" width="29" height="24" rx="6.5" fill={F} />
          <path d="M37 22 43.5 17.5v13L37 26z" fill={WARM} stroke={WARM} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M14 19.4v9.2l8-4.6z" style={CUT} stroke="var(--b)" strokeWidth="2.2" strokeLinejoin="round" />
        </>
      );
  }
}

export default function ToolGlyph({ id, size = 64 }: { id: string; size?: number }) {
  const key = (id in COLORS ? id : "render") as Id;
  const [a, b] = COLORS[key];
  const style = { "--a": a, "--b": b, width: size, height: size } as CSSProperties;
  return (
    <span className="lpi" style={style} aria-hidden="true">
      <svg viewBox="0 0 48 48" width={Math.round(size * 0.66)} height={Math.round(size * 0.66)}>
        <defs>
          <linearGradient id={`lpf-${key}`} x1="0.1" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity=".66" />
          </linearGradient>
        </defs>
        {glyph(key, `url(#lpf-${key})`)}
      </svg>
    </span>
  );
}
