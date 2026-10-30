"use client";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";

export default function BuyButton({ id }: { id: string }) {
  const t = useT();
  const [msg, setMsg] = useState("");
  return (<>
    <button onClick={async () => { const r = await fetch("/api/billing/checkout", { method: "POST", body: JSON.stringify({ id }) }); setMsg((await r.json()).error); }}>{t("Comprar")}</button>
    {msg && <p className="small muted">{t(msg)}</p>}
  </>);
}
