import { redirect } from "next/navigation";

/** O histórico agora é a tela de Gerações. */
export default function Historico() {
  redirect("/app/geracoes");
}
