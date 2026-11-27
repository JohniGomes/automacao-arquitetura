"use client";
import CountUp from "@/components/rb/CountUp";

/** Número que conta até o valor ao aparecer (React Bits · CountUp). Milhar com ponto, como em pt-BR. */
export default function Numero({ valor, duracao = 1.1, atraso = 0 }: { valor: number; duracao?: number; atraso?: number }) {
  return <CountUp to={valor} from={0} duration={duracao} delay={atraso} separator="." trigger="view" />;
}
