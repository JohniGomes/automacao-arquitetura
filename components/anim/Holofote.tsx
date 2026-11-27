"use client";
import type { HTMLAttributes, ReactNode } from "react";
import SpotlightCard from "@/components/rb/SpotlightCard";

/** Cartão com um brilho que segue o mouse (React Bits · SpotlightCard). O visual do cartão vem da classe que você passar (anim.css). */
export default function Holofote({ children, className = "", ...rest }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <SpotlightCard className={className} theme="dark" spotlightColor="#ff8a65" intensity={0.55} {...rest}>{children}</SpotlightCard>;
}
