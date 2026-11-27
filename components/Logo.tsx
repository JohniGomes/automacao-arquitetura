/** Marca do Croqui: casa em traço com o telhado passando dos pilares; chão e ponto em terracota (--sage). O traço usa currentColor. */
export default function Logo({ natal = false }: { natal?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 26 24 9l20 17" />
      <path d="M12 22v19h25V22" />
      <path d="M3 43h42" style={{ stroke: "var(--sage)" }} />
      {natal ? (
        <>
          <path d="M15.800 17.500C17.500 11 21 5.500 27 3.200c3.200-.8 5.600 1 6.200 4.200.6 3.200 0 6.500-.4 10.100z" fill="#D62F3A" stroke="none" />
          <rect x="13.500" y="14.800" width="21.500" height="4.600" rx="2.300" fill="#fff" stroke="none" />
          <circle cx="33.300" cy="4.800" r="2.600" fill="#fff" stroke="none" />
          <circle cx="40" cy="11" r="1.900" stroke="none" fill="#FFD60A" />
        </>
      ) : (
        <circle cx="35" cy="12" r="3" stroke="none" style={{ fill: "var(--sage)" }} />
      )}
    </svg>
  );
}
