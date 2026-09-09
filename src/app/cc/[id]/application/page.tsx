import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_ORDER } from "@/lib/stageMeta";
import { StageNav, ReviewBox, Field, MetaRow, AttachmentRadio, AttachmentUploadField, AttachmentList } from "../shared";
import { submitApplication, approveApplication, rejectApplication } from "../actions";

export const dynamic = "force-dynamic";

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const cc = await prisma.changeControl.findUnique({
    where: { id },
    include: {
      application: { include: { submittedBy: true, reviewedBy: true } },
      attachments: { where: { stage: "APPLICATION" } },
    },
  });

  if (!cc) notFound();

  const isOwner = session?.user?.id === cc.createdById;
  const canEdit = isOwner || isAdmin;
  const currentIndex = STAGE_ORDER.indexOf(cc.currentStage as (typeof STAGE_ORDER)[number]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link href={`/cc/${cc.id}`} className="text-sm text-slate-500 hover:underline">
          ← {cc.title}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">변경관리 신청서</h1>
      </div>

      <StageNav cc={cc} />

      <section className="card">
        {cc.application ? (
          <div className="space-y-3 text-sm">
            <Field label="현행 (Current)" value={cc.application.currentState} />
            <Field label="변경 안 (Change agenda)" value={cc.application.changeAgenda} />
            <Field label="변경 사유 (Reason)" value={cc.application.reason} />
            <Field label="첨부문서" value={cc.application.hasAttachment ? "있음" : "없음"} />
            <AttachmentList attachments={cc.attachments} />
            <MetaRow
              submittedBy={cc.application.submittedBy.name}
              submittedAt={cc.application.submittedAt}
              status={cc.application.status}
              reviewedBy={cc.application.reviewedBy?.name}
              reviewedAt={cc.application.reviewedAt}
              rejectReason={cc.application.rejectReason}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-500">신청서 정보가 없습니다.</p>
        )}

        {currentIndex === 0 && cc.application?.status === "SUBMITTED" && isAdmin && (
          <ReviewBox ccId={cc.id} approveAction={approveApplication} rejectAction={rejectApplication} />
        )}

        {currentIndex === 0 && cc.application?.status === "REJECTED" && canEdit && (
          <ApplicationForm ccId={cc.id} defaultValues={cc.application} />
        )}
        {currentIndex === 0 && cc.application?.status === "REJECTED" && !canEdit && (
          <p className="mt-3 text-sm text-slate-500">반려되었습니다. 접수자 본인만 수정하여 다시 제출할 수 있습니다.</p>
        )}
      </section>
    </main>
  );
}

function ApplicationForm({
  ccId,
  defaultValues,
}: {
  ccId: string;
  defaultValues?: { currentState: string; changeAgenda: string; reason: string; hasAttachment: boolean };
}) {
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
      <AttachmentUploadField />
      <button type="submit" className="btn-primary">
        다시 제출
      </button>
    </form>
  );
}
