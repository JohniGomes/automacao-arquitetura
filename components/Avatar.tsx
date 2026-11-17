"use client";
import { useEffect, useState } from "react";

export const AVATAR_EVENT = "avatar-changed";
const KEY = "croqui.avatar.v";

/** Marca que a foto mudou (troca o parâmetro da URL para o navegador não mostrar a antiga) e avisa os outros Avatares da tela. */
export function avatarMudou() {
  const v = String(Date.now());
  try { localStorage.setItem(KEY, v); } catch { /* sem armazenamento */ }
  window.dispatchEvent(new Event(AVATAR_EVENT));
}

/** Foto de perfil por cima da inicial: se não há foto (404), a inicial continua visível. */
export default function Avatar({ inicial }: { inicial: string }) {
  const [v, setV] = useState("0");
  const [ok, setOk] = useState(true);
  useEffect(() => {
    const ler = () => { try { setV(localStorage.getItem(KEY) || "0"); } catch { /* ok */ } setOk(true); };
    ler();
    window.addEventListener(AVATAR_EVENT, ler);
    return () => window.removeEventListener(AVATAR_EVENT, ler);
  }, []);
  return (
    <>
      {inicial}
      {ok && <img className="avatar-img" src={`/api/avatar?v=${v}`} alt="" onError={() => setOk(false)} />}
    </>
  );
}
