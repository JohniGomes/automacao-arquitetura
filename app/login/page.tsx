import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";
import HouseSplit from "@/components/HouseSplit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar — ArqIA" };

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (await currentUser()) redirect("/app/mapa");
  const { erro } = await searchParams;
  return (<main className="auth"><HouseSplit /><AuthForm mode="login" erro={erro} /></main>);
}
