import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";
import HouseSplit from "@/components/HouseSplit";

export const dynamic = "force-dynamic";

export default async function Cadastro({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (await currentUser()) redirect("/app");
  const { erro } = await searchParams;
  return (
    <main className="auth">
      <div className="formside"><AuthForm mode="register" erro={erro} /></div>
      <div className="view"><HouseSplit /></div>
    </main>
  );
}
