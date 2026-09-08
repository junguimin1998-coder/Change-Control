import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export default async function TopNav() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-slate-900">
          변경관리 시스템
        </Link>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>
            {session.user.name} ({session.user.role === "ADMIN" ? "관리자" : "일반 사용자"})
          </span>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
