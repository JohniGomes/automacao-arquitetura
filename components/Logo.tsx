/** Marca: casa em duas metades (traço à esquerda, preenchida à direita). A cor vem do contexto (currentColor). */
export default function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 15 16 5l12 10v12H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 5l12 10v12H16z" fill="currentColor" />
      <rect x="13" y="19" width="6" height="8" style={{ fill: "var(--door)" }} />
    </svg>
  );
}
