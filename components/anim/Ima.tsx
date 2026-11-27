"use client";
import type { ReactNode } from "react";
import Magnet from "@/components/rb/Magnet";

/** Botão que "puxa" levemente em direção ao cursor (React Bits · Magnet). Só em telas com mouse; no toque fica parado. */
export default function Ima({ children }: { children: ReactNode }) {
  return <Magnet padding={70} magnetStrength={5} maxOffset={14} scale={1.03}>{children}</Magnet>;
}
