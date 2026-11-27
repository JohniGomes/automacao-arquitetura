"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Reveal from "./Reveal";

/** Cada tela nova entra com um fade e uma subida curta (React Bits · AnimatedContent). A chave é a rota: troca de página = nova entrada. */
export default function PageTransition({ children }: { children: ReactNode }) {
  const rota = usePathname();
  return <Reveal key={rota} mount distance={18} duration={0.5}>{children}</Reveal>;
}
