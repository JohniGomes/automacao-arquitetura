import Link from "next/link";

/** Leva para a tela de pagamento do app (Pix ou cartão). */
export default function BuyButton({ id, label, ghost = false, t }: { id: string; label: string; ghost?: boolean; t: (s: string) => string }) {
  return <Link href={`/app/pagar?item=${encodeURIComponent(id)}`} className={`btn ${ghost ? "ghost" : ""}`}>{t(label)}</Link>;
}
