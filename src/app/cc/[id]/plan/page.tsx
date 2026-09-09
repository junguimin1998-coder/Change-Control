import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_ORDER } from "@/lib/stageMeta";
import { StageNav, ReviewBox, Field, MetaRow, AttachmentRadio, AttachmentUploadField, AttachmentList } from "../shared";
import { submitPlan, approvePlan, rejectPlan } from "../actions";

export const dynamic = "force-dynamic";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const cc = await prisma.changeControl.findUnique({
    where: { id },
    include: {
      plan: { include: { submittedBy: true, reviewedBy: true } },
      attachments: { where: { stage: "PLAN" } },
    },
  });

  if (!cc) notFound();

  const isOwner = session?.user?.id === cc.createdById;
  const canEdit = isOwner || isAdmin;
  const currentIndex = STAGE_ORDER.indexOf(cc.currentStage as (typeof STAGE_ORDER)[number]);
  const locked = currentIndex < 2 && !cc.plan;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link href={`/cc/${cc.id}`} className="text-sm text-slate-500 hover:underline">
          ← {cc.title}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">변경관리 계획서</h1>
      </div>

      <StageNav cc={cc} />

      <section className="card">
        {locked ? (
          <p className="text-sm text-slate-400">이전 단계가 승인되면 작성할 수 있습니다.</p>
        ) : (
          <>
            {cc.plan ? (
              <div className="space-y-3 text-sm">
                <Field label="변경관리완료 예정일" value={new Date(cc.plan.plannedCompletionDate).toLocaleDateString("ko-KR")} />
                <Field label="계획 내용" value={cc.plan.planDetails} />
                <Field label="첨부자료" value={cc.plan.hasAttachment ? "있음" : "없음"} />
                <AttachmentList attachments={cc.attachments} />
                <MetaRow
                  submittedBy={cc.plan.submittedBy.name}
                  submittedAt={cc.plan.submittedAt}
                  status={cc.plan.status}
                  reviewedBy={cc.plan.reviewedBy?.name}
                  reviewedAt={cc.plan.reviewedAt}
                  rejectReason={cc.plan.rejectReason}
                />
              </div>
            ) : currentIndex === 2 ? (
              <PlanForm ccId={cc.id} />
            ) : null}

            {currentIndex === 2 && cc.plan?.status === "SUBMITTED" && isAdmin && (
              <ReviewBox ccId={cc.id} approveAction={approvePlan} rejectAction={rejectPlan} />
            )}
            {currentIndex === 2 && cc.plan?.status === "REJECTED" && canEdit && <PlanForm ccId={cc.id} defaultValues={cc.plan} />}
            {currentIndex === 2 && cc.plan?.status === "REJECTED" && !canEdit && (
              <p className="mt-3 text-sm text-slate-500">반려되었습니다. 접수자 본인만 수정하여 다시 제출할 수 있습니다.</p>
            )}
          </>
        )}
      </section>
    </main>
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
      <AttachmentUploadField />
      <button type="submit" className="btn-primary">
        계획서 제출
      </button>
    </form>
  );
}
