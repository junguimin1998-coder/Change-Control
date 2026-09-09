import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeStatusLabel, deadlineBadge, STAGE_LABEL } from "@/lib/stageMeta";
import { daysUntilKST } from "@/lib/kst";
import Ledger from "./Ledger";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "overview", label: "요약" },
  { key: "detail", label: "상세 현황" },
  { key: "all", label: "설계변경 관리대장" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function ChangeControlPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : "overview";
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

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
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">변경관리 현황판</h1>
        <Link href="/cc/new" className="btn-primary">
          + 변경접수
        </Link>
      </header>

      <nav className="mb-6 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "overview" ? "/change-control" : `/change-control?tab=${t.key}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === t.key
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <OverviewTab changeControls={changeControls} inProgress={inProgress} completed={completed} activeRecord={activeRecord} />
      )}

      {tab === "detail" && <DetailTab inProgress={inProgress} completed={completed} activeRecord={activeRecord} />}

      {tab === "all" && <Ledger rows={changeControls.map(toRow)} isAdmin={isAdmin} />}
    </main>
  );
}

function toRow(cc: CC) {
  return {
    id: cc.id,
    ccNumber: cc.ccNumber,
    title: cc.title,
    productNames: cc.productNames,
    year: cc.createdAt.getFullYear(),
    currentStage: cc.currentStage,
    submittedAt: (cc.application?.submittedAt ?? cc.createdAt).toISOString(),
    evaluationDate: cc.evaluation?.submittedAt ? cc.evaluation.submittedAt.toISOString() : null,
    planDate: cc.plan?.submittedAt ? cc.plan.submittedAt.toISOString() : null,
    completedDate: cc.report?.completedDate ? cc.report.completedDate.toISOString() : null,
    remarks: cc.remarks ?? "",
    submitter: cc.createdBy.name,
    isCompleted: cc.overallStatus === "COMPLETED",
  };
}

type CC = Prisma.ChangeControlGetPayload<{
  include: {
    createdBy: { select: { name: true } };
    application: true;
    evaluation: true;
    plan: true;
    report: true;
  };
}>;

function OverviewTab({
  inProgress,
  completed,
  activeRecord,
}: {
  changeControls: CC[];
  inProgress: CC[];
  completed: CC[];
  activeRecord: (cc: CC) => { status: "SUBMITTED" | "APPROVED" | "REJECTED" } | null | undefined;
}) {
  const pendingApproval = inProgress.filter((cc) => activeRecord(cc)?.status === "SUBMITTED");

  const stageCounts = { APPLICATION: 0, EVALUATION: 0, PLAN: 0, REPORT: 0 } as Record<string, number>;
  for (const cc of inProgress) {
    if (cc.currentStage in stageCounts) stageCounts[cc.currentStage]++;
  }

  const summaryRows = [...inProgress].sort((a, b) => {
    const da = daysUntilKST(a.deadline);
    const db = daysUntilKST(b.deadline);
    if (da === null) return db === null ? 0 : 1;
    if (db === null) return -1;
    return da - db;
  });

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-brand-500 bg-brand-50 p-5">
          <div className="text-3xl font-bold text-brand-700">{pendingApproval.length}</div>
          <div className="mt-1 text-sm font-medium text-brand-700">승인 대기</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-slate-900">{inProgress.length}</div>
          <div className="mt-1 text-sm font-medium text-slate-500">진행 중</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-slate-900">{completed.length}</div>
          <div className="mt-1 text-sm font-medium text-slate-500">완료</div>
        </div>
      </div>

      <section className="card mb-6">
        <h2 className="mb-4 text-base font-bold text-slate-800">단계별 현황</h2>
        <div className="flex gap-1">
          {(["APPLICATION", "EVALUATION", "PLAN", "REPORT"] as const).map((stage, i) => (
            <div
              key={stage}
              className={`flex-1 border border-slate-200 px-4 py-4 text-center ${
                i === 0 ? "rounded-l-lg" : ""
              } ${i === 3 ? "rounded-r-lg" : ""}`}
            >
              <div className="text-sm font-medium text-slate-500">{STAGE_LABEL[stage]}</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{stageCounts[stage]}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-4 text-base font-bold text-slate-800">현황 요약</h2>
        {summaryRows.length === 0 ? (
          <p className="text-sm text-slate-500">진행 중인 변경관리 건이 없습니다.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">문서 제목</th>
                  <th className="px-4 py-2.5">현재 단계</th>
                  <th className="px-4 py-2.5">상태</th>
                  <th className="px-4 py-2.5">요청 기한</th>
                  <th className="px-4 py-2.5">접수자</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((cc) => {
                  const status = computeStatusLabel(cc.currentStage, cc.overallStatus, activeRecord(cc));
                  const badge = deadlineBadge(daysUntilKST(cc.deadline));
                  return (
                    <tr key={cc.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/cc/${cc.id}`} className="font-medium text-brand-600 hover:underline">
                          {cc.ccNumber} · {cc.title}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{STAGE_LABEL[cc.currentStage]}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${status.color}`}>{status.text}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${badge.color}`}>{badge.text}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{cc.createdBy.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ProgressGroupTable({
  title,
  items,
  activeRecord,
}: {
  title: string;
  items: CC[];
  activeRecord: (cc: CC) => { status: "SUBMITTED" | "APPROVED" | "REJECTED" } | null | undefined;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <h3 className="mb-2 text-sm font-bold text-slate-700">
        {title} ({items.length}건)
      </h3>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-44" />
            <col />
            <col className="w-36" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-24" />
            <col className="w-28" />
          </colgroup>
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">번호</th>
              <th className="px-4 py-3">문서 제목</th>
              <th className="px-4 py-3">제품명</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">요청 기한</th>
              <th className="px-4 py-3">접수자</th>
              <th className="px-4 py-3">최근 업데이트</th>
            </tr>
          </thead>
          <tbody>
            {items.map((cc) => {
              const status = computeStatusLabel(cc.currentStage, cc.overallStatus, activeRecord(cc));
              const badge = deadlineBadge(daysUntilKST(cc.deadline));
              return (
                <tr key={cc.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{cc.ccNumber}</td>
                  <td className="px-4 py-3">
                    <Link href={`/cc/${cc.id}`} className="font-medium text-brand-600 hover:underline">
                      {cc.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {cc.productNames.map((p) => (
                      <div key={p}>
                        • {p}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-1 text-xs font-medium ${status.color}`}>
                      {status.text}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-1 text-xs font-medium ${badge.color}`}>
                      {badge.text}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{cc.createdBy.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{cc.updatedAt.toLocaleDateString("ko-KR")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailTab({
  inProgress,
  completed,
  activeRecord,
}: {
  inProgress: CC[];
  completed: CC[];
  activeRecord: (cc: CC) => { status: "SUBMITTED" | "APPROVED" | "REJECTED" } | null | undefined;
}) {
  const byStage = {
    APPLICATION: inProgress.filter((cc) => cc.currentStage === "APPLICATION"),
    EVALUATION: inProgress.filter((cc) => cc.currentStage === "EVALUATION"),
    PLAN: inProgress.filter((cc) => cc.currentStage === "PLAN"),
    REPORT: inProgress.filter((cc) => cc.currentStage === "REPORT"),
  };

  return (
    <div>
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">진행 중인 변경관리 ({inProgress.length}건)</h2>
        {inProgress.length === 0 ? (
          <p className="card text-sm text-slate-500">진행 중인 변경관리 건이 없습니다.</p>
        ) : (
          <>
            <ProgressGroupTable title={STAGE_LABEL.APPLICATION} items={byStage.APPLICATION} activeRecord={activeRecord} />
            <ProgressGroupTable title={STAGE_LABEL.EVALUATION} items={byStage.EVALUATION} activeRecord={activeRecord} />
            <ProgressGroupTable title={STAGE_LABEL.PLAN} items={byStage.PLAN} activeRecord={activeRecord} />
            <ProgressGroupTable title={STAGE_LABEL.REPORT} items={byStage.REPORT} activeRecord={activeRecord} />
          </>
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
                  <th className="px-4 py-3">문서 제목</th>
                  <th className="px-4 py-3">제품명</th>
                  <th className="px-4 py-3">접수자</th>
                  <th className="px-4 py-3">완료일</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((cc) => (
                  <tr key={cc.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{cc.ccNumber}</td>
                    <td className="px-4 py-3">
                      <Link href={`/cc/${cc.id}`} className="font-medium text-brand-600 hover:underline">
                        {cc.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {cc.productNames.map((p) => (
                        <div key={p}>
                          • {p}
                        </div>
                      ))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{cc.createdBy.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{cc.updatedAt.toLocaleDateString("ko-KR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
