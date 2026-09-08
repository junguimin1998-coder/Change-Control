import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL, ROLE_OPTIONS } from "@/lib/roles";
import { approveUser, rejectUser, updateUserRole } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  PENDING: { text: "승인 대기", color: "bg-amber-100 text-amber-700 border-amber-300" },
  APPROVED: { text: "승인됨", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  REJECTED: { text: "거절됨", color: "bg-rose-100 text-rose-700 border-rose-300" },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const { error } = await searchParams;

  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  const pending = users.filter((u) => u.accountStatus === "PENDING");
  const others = users.filter((u) => u.accountStatus !== "PENDING");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">회원 승인 관리</h1>
      <p className="mb-6 text-sm text-slate-500">새로 가입한 사용자는 권한을 정해서 승인해야 로그인할 수 있습니다.</p>

      {error && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">승인 대기 중 ({pending.length}명)</h2>
        {pending.length === 0 ? (
          <p className="card text-sm text-slate-500">승인 대기 중인 사용자가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((u) => (
              <div key={u.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {u.name} <span className="font-normal text-slate-500">({u.email})</span>
                  </p>
                  <p className="text-xs text-slate-400">가입일: {u.createdAt.toLocaleString("ko-KR")}</p>
                </div>
                <form className="flex items-center gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <select name="role" defaultValue="C" className="input w-auto py-1.5">
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <button formAction={approveUser} className="btn-approve">
                    승인
                  </button>
                  <button formAction={rejectUser} className="btn-danger">
                    거절
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">전체 사용자</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">이메일</th>
                <th className="px-4 py-3">권한</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">가입일</th>
              </tr>
            </thead>
            <tbody>
              {others.map((u) => {
                const status = STATUS_LABEL[u.accountStatus];
                return (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.accountStatus === "APPROVED" ? (
                        <form className="flex items-center gap-2">
                          <input type="hidden" name="userId" value={u.id} />
                          <select name="role" defaultValue={u.role} className="input w-auto py-1 text-xs">
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </option>
                            ))}
                          </select>
                          <button formAction={updateUserRole} className="btn-secondary px-2 py-1 text-xs">
                            변경
                          </button>
                        </form>
                      ) : (
                        ROLE_LABEL[u.role]
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-1 text-xs font-medium ${status.color}`}>{status.text}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.createdAt.toLocaleDateString("ko-KR")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
