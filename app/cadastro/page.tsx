import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";
import AuthShell from "@/components/AuthShell";

export const dynamic = "force-dynamic";

export default async function Cadastro({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (await currentUser()) redirect("/app");
  const { erro } = await searchParams;
  return (
    <AuthShell><AuthForm mode="register" erro={erro} /></AuthShell>
  );
}
