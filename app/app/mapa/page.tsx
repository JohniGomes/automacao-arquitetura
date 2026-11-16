import { currentUser } from "@/lib/auth";
import { rulesOf } from "@/lib/plans";
import MapaView from "./MapaView";

/** O servidor lê o plano da conta para a tela só oferecer o alcance do mapa que o plano permite (o servidor valida de novo ao gerar). */
export default async function Mapa() {
  const u = await currentUser();
  return <MapaView alcanceMax={u ? rulesOf(u).alcanceMapaM : 600} />;
}
