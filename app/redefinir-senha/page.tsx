import MailForm from "@/components/MailForm";

export const dynamic = "force-dynamic";

export default async function Redefinir({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <main className="auth" style={{ display: "block" }}><div className="formside" style={{ minHeight: "100vh" }}><MailForm mode="reset" token={token || ""} /></div></main>;
}
