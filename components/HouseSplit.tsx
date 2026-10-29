/**
 * Mesma casa em duas fotos com o mesmo enquadramento: modelo 3D à esquerda, render à direita.
 * A faixa de divisão se move devagar (CSS em globals.css) revelando mais de um lado, depois do outro.
 */
export default function HouseSplit({ className = "" }: { className?: string }) {
  return (
    <div className={`house ${className}`} aria-hidden="true">
      <img className="layer wire" src="/casa/modelo.jpg" alt="" />
      <img className="layer real" src="/casa/render.jpg" alt="" />
      <div className="seam" />
      <span className="tg l">Modelo 3D</span>
      <span className="tg r">Render</span>
    </div>
  );
}
