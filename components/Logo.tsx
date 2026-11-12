/** Marca do Croqui: casa em traço com o telhado passando dos pilares; chão e ponto em terracota (--sage). O traço usa currentColor. */
export default function Logo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 26 24 9l20 17" />
      <path d="M12 22v19h25V22" />
      <path d="M3 43h42" style={{ stroke: "var(--sage)" }} />
      <circle cx="35" cy="12" r="3" stroke="none" style={{ fill: "var(--sage)" }} />
    </svg>
  );
}
