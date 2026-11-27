/** Marca do Croqui: casa em traço com o telhado passando dos pilares; chão e ponto em terracota (--sage). O traço usa currentColor. */
export default function Logo({ natal = false }: { natal?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 26 24 9l20 17" />
      <path d="M12 22v19h25V22" />
      <path d="M3 43h42" style={{ stroke: "var(--sage)" }} />
      {natal ? (
        <>
          {/* Natal: o mesmo logo com um gorro de Papai Noel */}
          <defs>
            <linearGradient id="nl-red" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F0434B" /><stop offset="1" stopColor="#B3202C" /></linearGradient>
            <linearGradient id="nl-fur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#DCE5F2" /></linearGradient>
            <radialGradient id="nl-pom" cx=".38" cy=".34" r=".75"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#D5DFEF" /></radialGradient>
          </defs>
          <g stroke="none">
            <path d="M16.600 12.300C16.800 5.800 21.400 1.300 27.400 1.300c5.200 0 8.800 3.100 9.800 7.600-2.900-2.100-6.100-2.300-8.700-1.100-2.200 1.100-2.900 3-.4 4.700z" fill="url(#nl-red)" />
            <path d="M21 11.200C21.300 7.500 23.600 4.400 27 3.300" fill="none" stroke="#FF8A8F" strokeWidth="1" strokeLinecap="round" opacity=".65" />
            <path d="M15 12.600c0-1.700 1.300-3 3-3h12.600c1.700 0 3 1.300 3 3s-1.300 3.200-3 3.200H18c-1.700 0-3-1.500-3-3.200z" fill="url(#nl-fur)" />
            <circle cx="37.300" cy="9.300" r="3.100" fill="url(#nl-pom)" />
          </g>
        </>
      ) : (
        <circle cx="35" cy="12" r="3" stroke="none" style={{ fill: "var(--sage)" }} />
      )}
    </svg>
  );
}
