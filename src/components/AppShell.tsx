import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar name={session.user.name ?? ""} role={session.user.role} />
      <div className="flex flex-1">
        <Sidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
