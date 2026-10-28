"use client";
import { useState } from "react";

export default function BuyButton({ id }: { id: string }) {
  const [msg, setMsg] = useState("");
  return (<>
    <button onClick={async () => { const r = await fetch("/api/billing/checkout", { method: "POST", body: JSON.stringify({ id }) }); setMsg((await r.json()).error); }}>Comprar</button>
    {msg && <p className="small muted">{msg}</p>}
  </>);
}
