import AuthShell from "@/components/AuthShell";
import MailForm from "@/components/MailForm";

export const dynamic = "force-dynamic";

export default async function Redefinir({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <AuthShell>$1</AuthShell>;
}
