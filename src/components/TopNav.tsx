import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/roles";
import SignOutButton from "@/components/SignOutButton";

export default async function TopNav() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const isAdmin = session.user.role === "ADMIN";
  const pendingCount = isAdmin ? await prisma.user.count({ where: { accountStatus: "PENDING" } }) : 0;

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-slate-900">
          변경관리 시스템
        </Link>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          {isAdmin && (
            <Link href="/admin/users" className="flex items-center gap-1 font-medium text-slate-700 hover:text-brand-600">
              회원 승인 관리
              {pendingCount > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-xs font-semibold text-white">{pendingCount}</span>
              )}
            </Link>
          )}
          <span>
            {session.user.name} ({ROLE_LABEL[session.user.role]})
          </span>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
