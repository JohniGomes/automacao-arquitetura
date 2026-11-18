"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/** Telas que a pessoa sem plano ainda pode abrir: o resto leva para a escolha do plano (a API também recusa gerações sem plano). */
const LIVRES = ["/app/creditos", "/app/pagar", "/app/conta", "/app/ajuda", "/app/suporte", "/app/admin", "/app/termos", "/app/privacidade"];

export default function PlanGate({ semPlano }: { semPlano: boolean }) {
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (semPlano && path.startsWith("/app") && !LIVRES.some((p) => path === p || path.startsWith(p + "/"))) router.replace("/app/creditos?assine=1");
  }, [semPlano, path, router]);
  return null;
}
