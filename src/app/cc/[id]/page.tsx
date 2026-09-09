import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STAGE_LABEL, STAGE_ORDER, computeStatusLabel, deadlineBadge } from "@/lib/stageMeta";
import { daysUntilKST } from "@/lib/kst";
import { StageNav, STAGE_PAGE } from "./shared";

export const dynamic = "force-dynamic";

export default async function ChangeControlOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cc = await prisma.changeControl.findUnique({
    where: { id },
    include: {
      createdBy: true,
      application: true,
      evaluation: true,
      plan: true,
      report: true,
    },
  });

  if (!cc) notFound();

  const currentIndex = STAGE_ORDER.indexOf(cc.currentStage as (typeof STAGE_ORDER)[number]);

  const activeRecord =
    cc.currentStage === "APPLICATION"
      ? cc.application
      : cc.currentStage === "EVALUATION"
      ? cc.evaluation
      : cc.currentStage === "PLAN"
      ? cc.plan
      : cc.currentStage === "REPORT"
      ? cc.report
      : null;

  const overallLabel = computeStatusLabel(cc.currentStage, cc.overallStatus, activeRecord);

  const stageRecords: Record<string, { status: string } | null | undefined> = {
    APPLICATION: cc.application,
    EVALUATION: cc.evaluation,
    PLAN: cc.plan,
    REPORT: cc.report,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link href="/change-control" className="text-sm text-slate-500 hover:underline">
          ← 목록으로
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">{cc.title}</h1>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${overallLabel.color}`}>
            {overallLabel.text}
          </span>
        </div>
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>
            {cc.ccNumber} · {cc.productNames.join(", ")} · 접수자 {cc.createdBy.name}
          </span>
          {cc.overallStatus !== "COMPLETED" && (
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${deadlineBadge(daysUntilKST(cc.deadline)).color}`}>
              {deadlineBadge(daysUntilKST(cc.deadline)).text}
            </span>
          )}
        </p>
      </div>

      <StageNav cc={cc} />

      <section className="card">
        <h2 className="mb-3 text-sm font-bold text-slate-800">단계별 문서</h2>
        <ul className="divide-y divide-slate-100">
          {STAGE_ORDER.filter((s) => s !== "DONE").map((stage, i) => {
            const record = stageRecords[stage];
            const reachable = i <= currentIndex || cc.overallStatus === "COMPLETED";
            const label = !record
              ? i === currentIndex
                ? "작성 대기"
                : "미작성"
              : record.status === "SUBMITTED"
              ? "검토 대기"
              : record.status === "REJECTED"
              ? "반려됨"
              : "승인됨";
            return (
              <li key={stage} className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-slate-700">{STAGE_LABEL[stage]}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{label}</span>
                  {reachable && (
                    <Link href={`/cc/${cc.id}/${STAGE_PAGE[stage]}`} className="text-xs font-semibold text-brand-600 hover:underline">
                      보기 →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
