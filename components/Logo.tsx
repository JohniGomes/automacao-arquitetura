/** Marca: casa em duas metades (traço à esquerda, preenchida à direita). */
export default function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 15 16 5l12 10v12H4z" fill="none" stroke="#DFB6B2" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 5l12 10v12H16z" fill="#DFB6B2" />
      <rect x="13" y="19" width="6" height="8" fill="#190019" />
    </svg>
  );
}
