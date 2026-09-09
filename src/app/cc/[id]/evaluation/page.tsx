import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_ORDER } from "@/lib/stageMeta";
import { DEPARTMENT_OPTIONS } from "@/lib/departments";
import { StageNav, ReviewBox, Field, MetaRow, AttachmentRadio, YesNoRadio, AttachmentUploadField, AttachmentList } from "../shared";
import { submitEvaluation, approveEvaluation, rejectEvaluation } from "../actions";

export const dynamic = "force-dynamic";

type EvaluationDefaults = {
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

export default async function EvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const cc = await prisma.changeControl.findUnique({
    where: { id },
    include: {
      evaluation: { include: { submittedBy: true, reviewedBy: true } },
      attachments: { where: { stage: "EVALUATION" } },
    },
  });

  if (!cc) notFound();

  const isOwner = session?.user?.id === cc.createdById;
  const canEdit = isOwner || isAdmin;
  const currentIndex = STAGE_ORDER.indexOf(cc.currentStage as (typeof STAGE_ORDER)[number]);
  const reached = currentIndex >= 1 || !!cc.evaluation;
  const locked = currentIndex < 1 && !cc.evaluation;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link href={`/cc/${cc.id}`} className="text-sm text-slate-500 hover:underline">
          ← {cc.title}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">변경관리 평가서</h1>
      </div>

      <StageNav cc={cc} />

      <section className="card">
        {locked ? (
          <p className="text-sm text-slate-400">이전 단계가 승인되면 작성할 수 있습니다.</p>
        ) : (
          <>
            {cc.evaluation ? (
              <div className="space-y-3 text-sm">
                {cc.evaluation.dept1Opinion && <Field label={`${cc.evaluation.dept1Name || "부서1"} 의견`} value={cc.evaluation.dept1Opinion} />}
                {cc.evaluation.dept2Opinion && <Field label={`${cc.evaluation.dept2Name || "부서2"} 의견`} value={cc.evaluation.dept2Opinion} />}
                {cc.evaluation.dept3Opinion && <Field label={`${cc.evaluation.dept3Name || "부서3"} 의견`} value={cc.evaluation.dept3Opinion} />}
                <Field label="최종 평가" value={cc.evaluation.finalEvaluation} />
                <Field label="관련 업체 협의" value={cc.evaluation.needsConsultation ? "필요" : "불필요"} />
                <Field label="업무협조" value={cc.evaluation.needsCooperation ? "필요" : "불필요"} />
                <Field label="첨부자료" value={cc.evaluation.hasAttachment ? "있음" : "없음"} />
                <AttachmentList attachments={cc.attachments} />
                <MetaRow
                  submittedBy={cc.evaluation.submittedBy.name}
                  submittedAt={cc.evaluation.submittedAt}
                  status={cc.evaluation.status}
                  reviewedBy={cc.evaluation.reviewedBy?.name}
                  reviewedAt={cc.evaluation.reviewedAt}
                  rejectReason={cc.evaluation.rejectReason}
                />
              </div>
            ) : reached && currentIndex === 1 ? (
              <EvaluationForm ccId={cc.id} />
            ) : null}

            {currentIndex === 1 && cc.evaluation?.status === "SUBMITTED" && isAdmin && (
              <ReviewBox ccId={cc.id} approveAction={approveEvaluation} rejectAction={rejectEvaluation} />
            )}
            {currentIndex === 1 && cc.evaluation?.status === "REJECTED" && canEdit && (
              <EvaluationForm ccId={cc.id} defaultValues={cc.evaluation} />
            )}
            {currentIndex === 1 && cc.evaluation?.status === "REJECTED" && !canEdit && (
              <p className="mt-3 text-sm text-slate-500">반려되었습니다. 접수자 본인만 수정하여 다시 제출할 수 있습니다.</p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function EvaluationForm({ ccId, defaultValues }: { ccId: string; defaultValues?: EvaluationDefaults }) {
  return (
    <form action={submitEvaluation} className="mt-2 space-y-4 rounded-lg border border-slate-200 p-4">
      <input type="hidden" name="ccId" value={ccId} />
      {defaultValues && <p className="text-sm font-medium text-slate-700">반려되었습니다. 내용을 수정하여 다시 제출하세요.</p>}
      {[1, 2, 3].map((n) => (
        <div key={n} className="grid grid-cols-3 gap-3">
          <select
            name={`dept${n}Name`}
            className="input col-span-1"
            defaultValue={(defaultValues as any)?.[`dept${n}Name`] ?? ""}
          >
            <option value="">부서 선택</option>
            {DEPARTMENT_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
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
      <AttachmentUploadField />
      <button type="submit" className="btn-primary">
        평가서 제출
      </button>
    </form>
  );
}
