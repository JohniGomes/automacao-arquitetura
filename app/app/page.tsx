import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import HomeView from "@/components/HomeView";
import { activePlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return <HomeView firstName={u.name.split(" ")[0]} planName={activePlan(u)?.nome ?? ""} creditsInit={u.credits} />;
}
