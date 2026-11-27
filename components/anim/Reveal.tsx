"use client";
import type { CSSProperties, ReactNode } from "react";
import AnimatedContent from "@/components/rb/AnimatedContent";

/**
 * Entrada suave de um bloco (React Bits · AnimatedContent): sobe e aparece ao entrar na tela (ou ao montar).
 * Respeita "reduzir movimento" (o componente já cuida disso). Com `stagger`, os filhos diretos entram em sequência.
 */
export default function Reveal({ children, className, style, delay = 0, distance = 36, duration = 0.7, stagger = 0, blur = 0, scale = 1, mount = false, threshold = 0.12 }: {
  children: ReactNode; className?: string; style?: CSSProperties; delay?: number; distance?: number; duration?: number; stagger?: number; blur?: number; scale?: number; mount?: boolean; threshold?: number;
}) {
  return (
    <AnimatedContent className={className} style={style} delay={delay} distance={distance} duration={duration} stagger={stagger} blur={blur} scale={scale} threshold={threshold} trigger={mount ? "mount" : "scroll"} ease="power3.out" once>
      {children}
    </AnimatedContent>
  );
}
