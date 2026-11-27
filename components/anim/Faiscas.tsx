"use client";
import { useEffect, useState, type ReactNode } from "react";
import ClickSpark from "@/components/rb/ClickSpark";

/** Faíscas laranja onde você clica (React Bits · ClickSpark). Desligado com "reduzir movimento". */
export default function Faiscas({ children }: { children: ReactNode }) {
  const [parado, setParado] = useState(true);
  useEffect(() => { setParado(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false); }, []);
  return (
    <ClickSpark sparkColor={["#FF7A59", "#FFB48A", "#FF86A8"]} sparkSize={9} sparkRadius={22} sparkCount={9} sparkWidth={2.4} duration={520} disabled={parado}>
      {children}
    </ClickSpark>
  );
}
