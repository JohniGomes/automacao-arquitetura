import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getTheme } from "@/lib/i18n-server";
import Rail from "@/components/Rail";
import VerifyBanner from "@/components/VerifyBanner";
import { needsVerification } from "@/lib/verify";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser();
  if (!u) redirect("/login");
  return (
    <div className="shell">
      <Rail name={u.name} credits={u.credits} theme={await getTheme()} />
      <div className="main">
        <div className="wrap">
          {needsVerification(u) && <VerifyBanner email={u.email} />}
          {children}
        </div>
      </div>
    </div>
  );
}
