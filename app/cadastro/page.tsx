import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";
import HouseSplit from "@/components/HouseSplit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Criar conta — ArqIA" };

export default async function Cadastro() {
  if (await currentUser()) redirect("/app/mapa");
  return (
    <main className="auth">
      <div className="formside"><AuthForm mode="register" /></div>
      <div className="view"><HouseSplit /></div>
    </main>
  );
}
