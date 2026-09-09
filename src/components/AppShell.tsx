import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return <>{children}</>;
  }

  const isAdmin = session.user.role === "ADMIN";
  const pendingCount = isAdmin ? await prisma.user.count({ where: { accountStatus: "PENDING" } }) : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar name={session.user.name ?? ""} role={session.user.role} />
      <div className="flex flex-1">
        <Sidebar isAdmin={isAdmin} pendingCount={pendingCount} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
