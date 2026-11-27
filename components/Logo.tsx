/** Marca do Croqui: casa em traço com o telhado passando dos pilares; chão e ponto em terracota (--sage). O traço usa currentColor. */
export default function Logo({ natal = false }: { natal?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 26 24 9l20 17" />
      <path d="M12 22v19h25V22" />
      <path d="M3 43h42" style={{ stroke: "var(--sage)" }} />
      {natal ? (
        <>
          {/* Natal: neve no telhado, janela acesa e estrela dourada no topo */}
          <path d="M11.500 20.200 24 8.600l12.500 11.600" stroke="#fff" strokeWidth="4.600" transform="translate(0 -1.400)" />
          <circle cx="11" cy="21" r="2.300" fill="#fff" stroke="none" />
          <circle cx="37" cy="21" r="2.300" fill="#fff" stroke="none" />
          <circle cx="31.500" cy="16.500" r="1.500" fill="#fff" stroke="none" />
          <rect x="19.500" y="28" width="10" height="8.500" rx="2" fill="#FFC857" stroke="none" />
          <path d="M24.500 28.600v7.300" stroke="#C9731F" strokeWidth="0.900" />
          <path d="M24 .6 25.300 3.300 28 4.500 25.300 5.700 24 8.400 22.700 5.700 20 4.500 22.700 3.300z" fill="#FFD66B" stroke="none" />
          <circle cx="6.500" cy="12" r="1" fill="#fff" stroke="none" opacity=".9" />
          <circle cx="42" cy="10" r="1.200" fill="#fff" stroke="none" opacity=".9" />
          <circle cx="45" cy="19" r=".8" fill="#fff" stroke="none" opacity=".8" />
          <circle cx="3.500" cy="19" r=".8" fill="#fff" stroke="none" opacity=".8" />
        </>
      ) : (
        <circle cx="35" cy="12" r="3" stroke="none" style={{ fill: "var(--sage)" }} />
      )}
    </svg>
  );
}
