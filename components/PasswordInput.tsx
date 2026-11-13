"use client";
import { useState } from "react";
import { useT } from "./I18nProvider";

/** Campo de senha com botão de mostrar/ocultar. */
export default function PasswordInput({ id, value, onChange, autoComplete, minLength, required = true }: {
  id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; autoComplete: string; minLength?: number; required?: boolean;
}) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <div className="pwrap">
      <input id={id} type={show ? "text" : "password"} required={required} minLength={minLength} autoComplete={autoComplete} autoCapitalize="none" spellCheck={false} enterKeyHint="go" value={value} onChange={onChange} />
      <button type="button" className="pwtoggle" aria-pressed={show} onClick={() => setShow(!show)}>{show ? t("Ocultar senha") : t("Mostrar senha")}</button>
    </div>
  );
}
