import Link from "next/link";
import { STAGE_LABEL, STAGE_ORDER } from "@/lib/stageMeta";

export const STAGE_PAGE: Record<string, string> = {
  APPLICATION: "application",
  EVALUATION: "evaluation",
  PLAN: "plan",
  REPORT: "report",
};

export function fmt(d: Date | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleString("ko-KR");
}

export function StageNav({ cc }: { cc: { id: string; currentStage: string; overallStatus: string } }) {
  const currentIndex = STAGE_ORDER.indexOf(cc.currentStage as (typeof STAGE_ORDER)[number]);
  const pages = ["application", "evaluation", "plan", "report"];

  return (
    <div className="card mb-6 flex items-center justify-between">
      {STAGE_ORDER.filter((s) => s !== "DONE").map((stage, i) => {
        const done = i < currentIndex || cc.overallStatus === "COMPLETED";
        const active = i === currentIndex && cc.overallStatus !== "COMPLETED";
        const reachable = done || active;
        const circle = (
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
              done ? "bg-emerald-500 text-white" : active ? "bg-brand-500 text-white" : "bg-slate-200 text-slate-500"
            }`}
          >
            {i + 1}
          </div>
        );
        return (
          <div key={stage} className="flex flex-1 items-center">
            {reachable ? (
              <Link href={`/cc/${cc.id}/${pages[i]}`} className="flex flex-col items-center gap-1">
                {circle}
                <span className="text-xs text-brand-600 hover:underline">{STAGE_LABEL[stage]}</span>
              </Link>
            ) : (
              <div className="flex flex-col items-center gap-1">
                {circle}
                <span className="text-xs text-slate-600">{STAGE_LABEL[stage]}</span>
              </div>
            )}
            {i < 3 && <div className={`mx-2 h-0.5 flex-1 ${done ? "bg-emerald-400" : "bg-slate-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}

export function ReviewBox({
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

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className="whitespace-pre-wrap text-slate-800">{value}</p>
    </div>
  );
}

export function MetaRow({
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

export function AttachmentRadio({ defaultValue }: { defaultValue?: boolean }) {
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

export function YesNoRadio({
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

export function AttachmentUploadField() {
  return (
    <div>
      <label className="label">파일 첨부 (선택)</label>
      <input type="file" name="attachments" multiple className="input" />
    </div>
  );
}

export function AttachmentList({ attachments }: { attachments: { id: string; fileName: string; size: number }[] }) {
  if (attachments.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-medium uppercase text-slate-400">첨부된 파일</p>
      <ul className="mt-1 space-y-1">
        {attachments.map((a) => (
          <li key={a.id}>
            <a href={`/api/attachments/${a.id}`} className="text-sm text-brand-600 hover:underline">
              {a.fileName}
            </a>
            <span className="ml-1 text-xs text-slate-400">({Math.max(1, Math.round(a.size / 1024))}KB)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
