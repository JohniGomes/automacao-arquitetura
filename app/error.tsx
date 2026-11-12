"use client";
import { useEffect } from "react";
import StateView from "@/components/StateView";

export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <StateView full title="Algo deu errado" text="Não foi possível abrir esta tela. Tente de novo; se continuar, fale com o suporte." retry={retry} />;
}
