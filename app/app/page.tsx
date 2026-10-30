import { currentUser } from "@/lib/auth";
import HomeView from "@/components/HomeView";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const u = (await currentUser())!;
  return <HomeView firstName={u.name.split(" ")[0]} />;
}
