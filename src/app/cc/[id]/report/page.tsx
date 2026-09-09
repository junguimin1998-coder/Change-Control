import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_ORDER } from "@/lib/stageMeta";
import { StageNav, ReviewBox, Field, MetaRow, AttachmentRadio, AttachmentUploadField, AttachmentList } from "../shared";
import { submitReport, approveReport, rejectReport } from "../actions";

export const dynamic = "force-dynamic";

type ReportDefaults = {
  progress: string;
  completedDate: Date | null;
  resultDetails: string;
  relatedDocRevision: string;
  conclusion: string;
  hasAttachment: boolean;
};

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const cc = await prisma.changeControl.findUnique({
    where: { id },
    include: {
      report: { include: { submittedBy: true, reviewedBy: true } },
      attachments: { where: { stage: "REPORT" } },
    },
  });

  if (!cc) notFound();

  const isOwner = session?.user?.id === cc.createdById;
  const canEdit = isOwner || isAdmin;
  const currentIndex = STAGE_ORDER.indexOf(cc.currentStage as (typeof STAGE_ORDER)[number]);
  const locked = currentIndex < 3 && !cc.report;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link href={`/cc/${cc.id}`} className="text-sm text-slate-500 hover:underline">
          ← {cc.title}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">변경관리 완료보고서</h1>
      </div>

      <StageNav cc={cc} />

      <section className="card">
        {locked ? (
          <p className="text-sm text-slate-400">이전 단계가 승인되면 작성할 수 있습니다.</p>
        ) : (
          <>
            {cc.report ? (
              <div className="space-y-3 text-sm">
                <Field
                  label="진행상황"
                  value={
                    cc.report.progress === "COMPLETED"
                      ? `완료 (${cc.report.completedDate ? new Date(cc.report.completedDate).toLocaleDateString("ko-KR") : "-"})`
                      : "진행 중"
                  }
                />
                <Field label="변경관리 결과 내용" value={cc.report.resultDetails} />
                <Field label="관련 문서개정 확인" value={cc.report.relatedDocRevision} />
                <Field label="결론 및 의견" value={cc.report.conclusion} />
                <Field label="첨부문서" value={cc.report.hasAttachment ? "있음" : "없음"} />
                <AttachmentList attachments={cc.attachments} />
                <MetaRow
                  submittedBy={cc.report.submittedBy.name}
                  submittedAt={cc.report.submittedAt}
                  status={cc.report.status}
                  reviewedBy={cc.report.reviewedBy?.name}
                  reviewedAt={cc.report.reviewedAt}
                  rejectReason={cc.report.rejectReason}
                />
              </div>
            ) : currentIndex === 3 ? (
              <ReportForm ccId={cc.id} />
            ) : null}

            {currentIndex === 3 && cc.report?.status === "SUBMITTED" && isAdmin && (
              <ReviewBox ccId={cc.id} approveAction={approveReport} rejectAction={rejectReport} />
            )}
            {currentIndex === 3 && cc.report?.status === "REJECTED" && canEdit && <ReportForm ccId={cc.id} defaultValues={cc.report} />}
            {currentIndex === 3 && cc.report?.status === "REJECTED" && !canEdit && (
              <p className="mt-3 text-sm text-slate-500">반려되었습니다. 접수자 본인만 수정하여 다시 제출할 수 있습니다.</p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function ReportForm({ ccId, defaultValues }: { ccId: string; defaultValues?: ReportDefaults }) {
  const dateValue = defaultValues?.completedDate ? new Date(defaultValues.completedDate).toISOString().slice(0, 10) : "";
  return (
    <form action={submitReport} className="mt-2 space-y-4 rounded-lg border border-slate-200 p-4">
      <input type="hidden" name="ccId" value={ccId} />
      {defaultValues && <p className="text-sm font-medium text-slate-700">반려되었습니다. 내용을 수정하여 다시 제출하세요.</p>}
      <div>
        <span className="label">변경 진행 상황</span>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="progress"
              value="IN_PROGRESS"
              defaultChecked={!defaultValues || defaultValues.progress === "IN_PROGRESS"}
              className="h-4 w-4"
            />
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
      <AttachmentUploadField />
      <button type="submit" className="btn-primary">
        완료보고서 제출
      </button>
    </form>
  );
}
