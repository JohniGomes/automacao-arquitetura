import Icon from "./icons";
import LineLoader from "./LineLoader";
import { getT } from "@/lib/i18n-server";

const PONTOS = [
  "Render fotorrealista a partir do print do seu modelo 3D",
  "Variações de luz, moodboard e mapa de situação",
  "Filme animado do projeto em Full HD",
  "Créditos devolvidos se uma geração falhar",
];

/** Painel ao lado do formulário de acesso (aparece em telas largas): a casa se desenhando e o que o app entrega. */
export default async function AuthAside() {
  const { t } = await getT();
  return (
    <aside className="panel">
      <LineLoader size={112} />
      <h2>{t("Do croqui ao render.")}</h2>
      <ul>{PONTOS.map((p) => <li key={p}><Icon name="check" />{t(p)}</li>)}</ul>
    </aside>
  );
}
