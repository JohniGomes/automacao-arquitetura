/** Casa que se desenha em linha, em loop. Usada no carregamento e no painel do login. */
export default function LineLoader({ size = 72 }: { size?: number }) {
  return (
    <svg className="lineload" width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path pathLength={1} d="M4 26 24 9l20 17" />
      <path pathLength={1} d="M12 22v19h25V22" style={{ animationDelay: ".4s" }} />
      <path pathLength={1} d="M3 43h42" style={{ animationDelay: ".9s", stroke: "var(--sage)" }} />
    </svg>
  );
}
