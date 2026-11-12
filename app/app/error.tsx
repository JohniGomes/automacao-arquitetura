"use client";
import { useEffect } from "react";
import StateView from "@/components/StateView";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <StateView title="Algo deu errado" text="Não foi possível carregar esta tela. Tente de novo; seus dados estão salvos." retry={retry} />;
}
