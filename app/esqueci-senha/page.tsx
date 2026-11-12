import MailForm from "@/components/MailForm";

export const dynamic = "force-dynamic";

export default function Esqueci() {
  return <main className="auth" style={{ display: "block" }}><div className="formside" style={{ minHeight: "100vh" }}><MailForm mode="forgot" /></div></main>;
}
