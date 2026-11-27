"use client";
import ShinyText from "@/components/rb/ShinyText";

/** Texto com um brilho que passa de tempos em tempos (React Bits · ShinyText), para selos e destaques. */
export default function Brilho({ texto, cor = "#ffffff", brilho = "#ffd2c0" }: { texto: string; cor?: string; brilho?: string }) {
  return <ShinyText text={texto} color={cor} shineColor={brilho} speed={2.6} delay={1.2} />;
}
