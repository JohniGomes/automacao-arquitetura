import { currentUser } from "@/lib/auth";
import HomeView from "@/components/HomeView";
import { activePlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const u = (await currentUser())!;
  return <HomeView firstName={u.name.split(" ")[0]} planName={activePlan(u)?.nome ?? ""} creditsInit={u.credits} />;
}
