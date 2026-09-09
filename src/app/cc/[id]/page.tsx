import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_LABEL, STAGE_ORDER, computeStatusLabel, deadlineBadge } from "@/lib/stageMeta";
import { daysUntilKST } from "@/lib/kst";
import {
  submitApplication,
  approveApplication,
  rejectApplication,
  submitEvaluation,
  approveEvaluation,
  rejectEvaluation,
  submitPlan,
  approvePlan,
  rejectPlan,
  submitReport,
  approveReport,
  rejectReport,
} from "./actions";

export const dynamic = "force-dynamic";

function fmt(d: Date | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleString("ko-KR");
}

function ReviewBox({
  ccId,
  approveAction,
  rejectAction,
}: {
  ccId: string;
  approveAction: (formData: FormData) => void;
  rejectAction: (formData: FormData) => void;
}) {
  return (
    <form className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <input type="hidden" name="ccId" value={ccId} />
      <p className="text-sm font-medium text-amber-800">관리자 검토 대기 중입니다.</p>
      <div>
        <label className="label">반려 사유 (반려 시에만 입력)</label>
        <textarea name="rejectReason" rows={2} className="input" placeholder="반려하는 경우 사유를 입력하세요." />
      </div>
      <div className="flex gap-3">
        <button formAction={approveAction} className="btn-approve">
          승인
        </button>
        <button formAction={rejectAction} className="btn-danger">
          반려
        </button>
      </div>
    </form>
  );
}

export default async function ChangeControlDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const cc = await prisma.changeControl.findUnique({
    where: { id },
    include: {
      createdBy: true,
      application: { include: { submittedBy: true, reviewedBy: true } },
      evaluation: { include: { submittedBy: true, reviewedBy: true } },
      plan: { include: { submittedBy: true, reviewedBy: true } },
      report: { include: { submittedBy: true, reviewedBy: true } },
      activities: { include: { byUser: true }, orderBy: { createdAt: "desc" } },
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
            {cc.ccNumber} · {cc.productName} · 접수자 {cc.createdBy.name}
          </span>
          {cc.overallStatus !== "COMPLETED" && (
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${deadlineBadge(daysUntilKST(cc.deadline)).color}`}>
              {deadlineBadge(daysUntilKST(cc.deadline)).text}
            </span>
          )}
        </p>
      </div>

      {/* 단계 진행 표시 */}
      <div className="card mb-6 flex items-center justify-between">
        {STAGE_ORDER.filter((s) => s !== "DONE").map((stage, i) => {
          const done = i < currentIndex || cc.overallStatus === "COMPLETED";
          const active = i === currentIndex && cc.overallStatus !== "COMPLETED";
          return (
            <div key={stage} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                      ? "bg-brand-500 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {i + 1}
                </div>
                <span className="text-xs text-slate-600">{STAGE_LABEL[stage]}</span>
              </div>
              {i < 3 && <div className={`mx-2 h-0.5 flex-1 ${done ? "bg-emerald-400" : "bg-slate-200"}`} />}
            </div>
          );
        })}
      </div>

      {/* 신청서 */}
      <section className="card mb-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">1. 변경관리 신청서</h2>
        {cc.application ? (
          <div className="space-y-3 text-sm">
            <Field label="현행 (Current)" value={cc.application.currentState} />
            <Field label="변경 안 (Change agenda)" value={cc.application.changeAgenda} />
            <Field label="변경 사유 (Reason)" value={cc.application.reason} />
            <Field label="첨부문서" value={cc.application.hasAttachment ? "있음" : "없음"} />
            <MetaRow submittedBy={cc.application.submittedBy.name} submittedAt={cc.application.submittedAt} status={cc.application.status} reviewedBy={cc.application.reviewedBy?.name} reviewedAt={cc.application.reviewedAt} rejectReason={cc.application.rejectReason} />
          </div>
        ) : (
          <p className="text-sm text-slate-500">신청서 정보가 없습니다.</p>
        )}

        {cc.currentStage === "APPLICATION" && cc.application?.status === "SUBMITTED" && isAdmin && (
          <ReviewBox ccId={cc.id} approveAction={approveApplication} rejectAction={rejectApplication} />
        )}

        {cc.currentStage === "APPLICATION" && cc.application?.status === "REJECTED" && (
          <ApplicationForm ccId={cc.id} defaultValues={cc.application} />
        )}
      </section>

      {/* 평가서 */}
      <StageSection
        title="2. 변경관리 평가서"
        show={currentIndex >= 1 || !!cc.evaluation}
        locked={currentIndex < 1 && !cc.evaluation}
      >
        {cc.evaluation ? (
          <div className="space-y-3 text-sm">
            {cc.evaluation.dept1Opinion && <Field label={`${cc.evaluation.dept1Name || "부서1"} 의견`} value={cc.evaluation.dept1Opinion} />}
            {cc.evaluation.dept2Opinion && <Field label={`${cc.evaluation.dept2Name || "부서2"} 의견`} value={cc.evaluation.dept2Opinion} />}
            {cc.evaluation.dept3Opinion && <Field label={`${cc.evaluation.dept3Name || "부서3"} 의견`} value={cc.evaluation.dept3Opinion} />}
            <Field label="최종 평가" value={cc.evaluation.finalEvaluation} />
            <Field label="관련 업체 협의" value={cc.evaluation.needsConsultation ? "필요" : "불필요"} />
            <Field label="업무협조" value={cc.evaluation.needsCooperation ? "필요" : "불필요"} />
            <Field label="첨부자료" value={cc.evaluation.hasAttachment ? "있음" : "없음"} />
            <MetaRow submittedBy={cc.evaluation.submittedBy.name} submittedAt={cc.evaluation.submittedAt} status={cc.evaluation.status} reviewedBy={cc.evaluation.reviewedBy?.name} reviewedAt={cc.evaluation.reviewedAt} rejectReason={cc.evaluation.rejectReason} />
          </div>
        ) : currentIndex === 1 ? (
          <EvaluationForm ccId={cc.id} />
        ) : null}

        {cc.currentStage === "EVALUATION" && cc.evaluation?.status === "SUBMITTED" && isAdmin && (
          <ReviewBox ccId={cc.id} approveAction={approveEvaluation} rejectAction={rejectEvaluation} />
        )}
        {cc.currentStage === "EVALUATION" && cc.evaluation?.status === "REJECTED" && (
          <EvaluationForm ccId={cc.id} defaultValues={cc.evaluation} />
        )}
      </StageSection>

      {/* 계획서 */}
      <StageSection title="3. 변경관리 계획서" show={currentIndex >= 2 || !!cc.plan} locked={currentIndex < 2 && !cc.plan}>
        {cc.plan ? (
          <div className="space-y-3 text-sm">
            <Field label="변경관리완료 예정일" value={new Date(cc.plan.plannedCompletionDate).toLocaleDateString("ko-KR")} />
            <Field label="계획 내용" value={cc.plan.planDetails} />
            <Field label="첨부자료" value={cc.plan.hasAttachment ? "있음" : "없음"} />
            <MetaRow submittedBy={cc.plan.submittedBy.name} submittedAt={cc.plan.submittedAt} status={cc.plan.status} reviewedBy={cc.plan.reviewedBy?.name} reviewedAt={cc.plan.reviewedAt} rejectReason={cc.plan.rejectReason} />
          </div>
        ) : currentIndex === 2 ? (
          <PlanForm ccId={cc.id} />
        ) : null}

        {cc.currentStage === "PLAN" && cc.plan?.status === "SUBMITTED" && isAdmin && (
          <ReviewBox ccId={cc.id} approveAction={approvePlan} rejectAction={rejectPlan} />
        )}
        {cc.currentStage === "PLAN" && cc.plan?.status === "REJECTED" && <PlanForm ccId={cc.id} defaultValues={cc.plan} />}
      </StageSection>

      {/* 완료보고서 */}
      <StageSection title="4. 변경관리 완료보고서" show={currentIndex >= 3 || !!cc.report} locked={currentIndex < 3 && !cc.report}>
        {cc.report ? (
          <div className="space-y-3 text-sm">
            <Field label="진행상황" value={cc.report.progress === "COMPLETED" ? `완료 (${cc.report.completedDate ? new Date(cc.report.completedDate).toLocaleDateString("ko-KR") : "-"})` : "진행 중"} />
            <Field label="변경관리 결과 내용" value={cc.report.resultDetails} />
            <Field label="관련 문서개정 확인" value={cc.report.relatedDocRevision} />
            <Field label="결론 및 의견" value={cc.report.conclusion} />
            <Field label="첨부문서" value={cc.report.hasAttachment ? "있음" : "없음"} />
            <MetaRow submittedBy={cc.report.submittedBy.name} submittedAt={cc.report.submittedAt} status={cc.report.status} reviewedBy={cc.report.reviewedBy?.name} reviewedAt={cc.report.reviewedAt} rejectReason={cc.report.rejectReason} />
          </div>
        ) : currentIndex === 3 ? (
          <ReportForm ccId={cc.id} />
        ) : null}

        {cc.currentStage === "REPORT" && cc.report?.status === "SUBMITTED" && isAdmin && (
          <ReviewBox ccId={cc.id} approveAction={approveReport} rejectAction={rejectReport} />
        )}
        {cc.currentStage === "REPORT" && cc.report?.status === "REJECTED" && <ReportForm ccId={cc.id} defaultValues={cc.report} />}
      </StageSection>

      {/* 활동 이력 */}
      <section className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">활동 이력</h2>
        <ul className="space-y-2 text-sm">
          {cc.activities.map((a) => (
            <li key={a.id} className="border-b border-slate-100 pb-2 last:border-0">
              <span className="text-slate-500">{fmt(a.createdAt)}</span> · <span className="font-medium">{a.byUser.name}</span> —{" "}
              {actionLabel(a.action)}
              {a.note ? ` (${a.note})` : ""}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    APPLICATION_SUBMITTED: "신청서 제출",
    APPLICATION_APPROVED: "신청서 승인",
    APPLICATION_REJECTED: "신청서 반려",
    EVALUATION_SUBMITTED: "평가서 제출",
    EVALUATION_APPROVED: "평가서 승인",
    EVALUATION_REJECTED: "평가서 반려",
    PLAN_SUBMITTED: "계획서 제출",
    PLAN_APPROVED: "계획서 승인",
    PLAN_REJECTED: "계획서 반려",
    REPORT_SUBMITTED: "완료보고서 제출",
    REPORT_APPROVED: "완료보고서 승인 (최종 완료)",
    REPORT_REJECTED: "완료보고서 반려",
  };
  return map[action] ?? action;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className="whitespace-pre-wrap text-slate-800">{value}</p>
    </div>
  );
}

function MetaRow({
  submittedBy,
  submittedAt,
  status,
  reviewedBy,
  reviewedAt,
  rejectReason,
}: {
  submittedBy: string;
  submittedAt: Date;
  status: string;
  reviewedBy?: string;
  reviewedAt?: Date | null;
  rejectReason?: string | null;
}) {
  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
      <p>
        제출: {submittedBy} · {fmt(submittedAt)}
      </p>
      {status !== "SUBMITTED" && reviewedBy && (
        <p>
          검토: {reviewedBy} · {fmt(reviewedAt)} · {status === "APPROVED" ? "승인" : "반려"}
        </p>
      )}
      {status === "REJECTED" && rejectReason && <p className="mt-1 text-rose-600">반려 사유: {rejectReason}</p>}
    </div>
  );
}

function StageSection({ title, show, locked, children }: { title: string; show: boolean; locked: boolean; children: React.ReactNode }) {
  if (!show && !locked) return null;
  return (
    <section className="card mb-6">
      <h2 className="mb-3 text-lg font-semibold text-slate-800">{title}</h2>
      {locked ? <p className="text-sm text-slate-400">이전 단계가 승인되면 작성할 수 있습니다.</p> : children}
    </section>
  );
}

function ApplicationForm({ ccId, defaultValues }: { ccId: string; defaultValues?: { currentState: string; changeAgenda: string; reason: string; hasAttachment: boolean } }) {
  return (
    <form action={submitApplication} className="mt-4 space-y-4 rounded-lg border border-slate-200 p-4">
      <input type="hidden" name="ccId" value={ccId} />
      <p className="text-sm font-medium text-slate-700">반려되었습니다. 내용을 수정하여 다시 제출하세요.</p>
      <div>
        <label className="label">현행 (Current)</label>
        <textarea name="currentState" required rows={3} className="input" defaultValue={defaultValues?.currentState} />
      </div>
      <div>
        <label className="label">변경 안 (Change agenda)</label>
        <textarea name="changeAgenda" required rows={3} className="input" defaultValue={defaultValues?.changeAgenda} />
      </div>
      <div>
        <label className="label">변경 사유</label>
        <textarea name="reason" required rows={3} className="input" defaultValue={defaultValues?.reason} />
      </div>
      <AttachmentRadio defaultValue={defaultValues?.hasAttachment} />
      <button type="submit" className="btn-primary">
        다시 제출
      </button>
    </form>
  );
}

function EvaluationForm({
  ccId,
  defaultValues,
}: {
  ccId: string;
  defaultValues?: {
    dept1Name: string | null;
    dept1Opinion: string | null;
    dept2Name: string | null;
    dept2Opinion: string | null;
    dept3Name: string | null;
    dept3Opinion: string | null;
    finalEvaluation: string;
    needsConsultation: boolean;
    needsCooperation: boolean;
    hasAttachment: boolean;
  };
}) {
  return (
    <form action={submitEvaluation} className="mt-2 space-y-4 rounded-lg border border-slate-200 p-4">
      <input type="hidden" name="ccId" value={ccId} />
      {defaultValues && <p className="text-sm font-medium text-slate-700">반려되었습니다. 내용을 수정하여 다시 제출하세요.</p>}
      {[1, 2, 3].map((n) => (
        <div key={n} className="grid grid-cols-3 gap-3">
          <input
            name={`dept${n}Name`}
            placeholder={`부서명 ${n}`}
            className="input col-span-1"
            defaultValue={(defaultValues as any)?.[`dept${n}Name`] ?? ""}
          />
          <textarea
            name={`dept${n}Opinion`}
            placeholder="평가 의견"
            rows={2}
            className="input col-span-2"
            defaultValue={(defaultValues as any)?.[`dept${n}Opinion`] ?? ""}
          />
        </div>
      ))}
      <div>
        <label className="label">최종 평가</label>
        <textarea name="finalEvaluation" required rows={3} className="input" defaultValue={defaultValues?.finalEvaluation} />
      </div>
      <YesNoRadio name="needsConsultation" label="관련 업체 협의" yesLabel="필요" noLabel="불필요" defaultValue={defaultValues?.needsConsultation} />
      <YesNoRadio name="needsCooperation" label="업무협조" yesLabel="필요" noLabel="불필요" defaultValue={defaultValues?.needsCooperation} />
      <AttachmentRadio defaultValue={defaultValues?.hasAttachment} />
      <button type="submit" className="btn-primary">
        평가서 제출
      </button>
    </form>
  );
}

function PlanForm({ ccId, defaultValues }: { ccId: string; defaultValues?: { plannedCompletionDate: Date; planDetails: string; hasAttachment: boolean } }) {
  const dateValue = defaultValues ? new Date(defaultValues.plannedCompletionDate).toISOString().slice(0, 10) : "";
  return (
    <form action={submitPlan} className="mt-2 space-y-4 rounded-lg border border-slate-200 p-4">
      <input type="hidden" name="ccId" value={ccId} />
      {defaultValues && <p className="text-sm font-medium text-slate-700">반려되었습니다. 내용을 수정하여 다시 제출하세요.</p>}
      <div>
        <label className="label">변경관리완료 예정일</label>
        <input type="date" name="plannedCompletionDate" required className="input" defaultValue={dateValue} />
      </div>
      <div>
        <label className="label">변경관리 계획 내용</label>
        <textarea name="planDetails" required rows={4} className="input" defaultValue={defaultValues?.planDetails} />
      </div>
      <AttachmentRadio defaultValue={defaultValues?.hasAttachment} />
      <button type="submit" className="btn-primary">
        계획서 제출
      </button>
    </form>
  );
}

function ReportForm({
  ccId,
  defaultValues,
}: {
  ccId: string;
  defaultValues?: {
    progress: string;
    completedDate: Date | null;
    resultDetails: string;
    relatedDocRevision: string;
    conclusion: string;
    hasAttachment: boolean;
  };
}) {
  const dateValue = defaultValues?.completedDate ? new Date(defaultValues.completedDate).toISOString().slice(0, 10) : "";
  return (
    <form action={submitReport} className="mt-2 space-y-4 rounded-lg border border-slate-200 p-4">
      <input type="hidden" name="ccId" value={ccId} />
      {defaultValues && <p className="text-sm font-medium text-slate-700">반려되었습니다. 내용을 수정하여 다시 제출하세요.</p>}
      <div>
        <span className="label">변경 진행 상황</span>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input type="radio" name="progress" value="IN_PROGRESS" defaultChecked={!defaultValues || defaultValues.progress === "IN_PROGRESS"} className="h-4 w-4" />
            진행 중
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="progress" value="COMPLETED" defaultChecked={defaultValues?.progress === "COMPLETED"} className="h-4 w-4" />
            완료
          </label>
          <input type="date" name="completedDate" className="input w-auto" defaultValue={dateValue} />
        </div>
      </div>
      <div>
        <label className="label">변경관리 결과 내용</label>
        <textarea name="resultDetails" required rows={3} className="input" defaultValue={defaultValues?.resultDetails} />
      </div>
      <div>
        <label className="label">관련 문서개정 확인</label>
        <textarea name="relatedDocRevision" required rows={2} className="input" defaultValue={defaultValues?.relatedDocRevision} />
      </div>
      <div>
        <label className="label">결론 및 의견</label>
        <textarea name="conclusion" required rows={3} className="input" defaultValue={defaultValues?.conclusion} />
      </div>
      <AttachmentRadio defaultValue={defaultValues?.hasAttachment} />
      <button type="submit" className="btn-primary">
        완료보고서 제출
      </button>
    </form>
  );
}

function AttachmentRadio({ defaultValue }: { defaultValue?: boolean }) {
  return (
    <div>
      <span className="label">첨부문서</span>
      <div className="flex gap-6 text-sm text-slate-700">
        <label className="flex items-center gap-2">
          <input type="radio" name="hasAttachment" value="yes" defaultChecked={defaultValue === true} className="h-4 w-4" />
          있음
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="hasAttachment" value="no" defaultChecked={!defaultValue} className="h-4 w-4" />
          없음
        </label>
      </div>
    </div>
  );
}

function YesNoRadio({
  name,
  label,
  yesLabel,
  noLabel,
  defaultValue,
}: {
  name: string;
  label: string;
  yesLabel: string;
  noLabel: string;
  defaultValue?: boolean;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex gap-6 text-sm text-slate-700">
        <label className="flex items-center gap-2">
          <input type="radio" name={name} value="yes" defaultChecked={defaultValue === true} className="h-4 w-4" />
          {yesLabel}
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name={name} value="no" defaultChecked={!defaultValue} className="h-4 w-4" />
          {noLabel}
        </label>
      </div>
    </div>
  );
}
