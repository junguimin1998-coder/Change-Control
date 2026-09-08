import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { computeStatusLabel, STAGE_LABEL } from "@/lib/stageMeta";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const changeControls = await prisma.changeControl.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      application: true,
      evaluation: true,
      plan: true,
      report: true,
    },
  });

  const inProgress = changeControls.filter((cc) => cc.overallStatus === "IN_PROGRESS");
  const completed = changeControls.filter((cc) => cc.overallStatus === "COMPLETED");

  function activeRecord(cc: (typeof changeControls)[number]) {
    switch (cc.currentStage) {
      case "APPLICATION":
        return cc.application;
      case "EVALUATION":
        return cc.evaluation;
      case "PLAN":
        return cc.plan;
      case "REPORT":
        return cc.report;
      default:
        return null;
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">변경관리 현황판</h1>
        <Link href="/cc/new" className="btn-primary">
          + 변경접수
        </Link>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">진행 중인 변경관리 ({inProgress.length}건)</h2>
        {inProgress.length === 0 ? (
          <p className="card text-sm text-slate-500">진행 중인 변경관리 건이 없습니다.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">번호</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3">제품명</th>
                  <th className="px-4 py-3">현재 단계</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">접수자</th>
                  <th className="px-4 py-3">최근 업데이트</th>
                </tr>
              </thead>
              <tbody>
                {inProgress.map((cc) => {
                  const status = computeStatusLabel(cc.currentStage, cc.overallStatus, activeRecord(cc));
                  return (
                    <tr key={cc.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/cc/${cc.id}`} className="font-medium text-brand-600 hover:underline">
                          {cc.ccNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{cc.title}</td>
                      <td className="px-4 py-3">{cc.productName}</td>
                      <td className="px-4 py-3">{STAGE_LABEL[cc.currentStage]}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-4 py-3">{cc.createdBy.name}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {cc.updatedAt.toLocaleDateString("ko-KR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">완료된 변경관리 ({completed.length}건)</h2>
        {completed.length === 0 ? (
          <p className="card text-sm text-slate-500">완료된 변경관리 건이 없습니다.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">번호</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3">제품명</th>
                  <th className="px-4 py-3">접수자</th>
                  <th className="px-4 py-3">완료일</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((cc) => (
                  <tr key={cc.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/cc/${cc.id}`} className="font-medium text-brand-600 hover:underline">
                        {cc.ccNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{cc.title}</td>
                    <td className="px-4 py-3">{cc.productName}</td>
                    <td className="px-4 py-3">{cc.createdBy.name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {cc.updatedAt.toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
