export function deadlineBadge(daysLeft: number | null) {
  if (daysLeft === null) {
    return { text: "요청기한 미설정", color: "bg-slate-100 text-slate-500 border-slate-300" };
  }
  if (daysLeft < 0) {
    return { text: `요청기한 ${Math.abs(daysLeft)}일 초과`, color: "bg-rose-100 text-rose-700 border-rose-300" };
  }
  if (daysLeft === 0) {
    return { text: "요청기한 당일", color: "bg-rose-100 text-rose-700 border-rose-300" };
  }
  if (daysLeft <= 3) {
    return { text: `요청기한 D-${daysLeft}`, color: "bg-rose-100 text-rose-700 border-rose-300" };
  }
  if (daysLeft <= 7) {
    return { text: `요청기한 D-${daysLeft}`, color: "bg-amber-100 text-amber-700 border-amber-300" };
  }
  return { text: `요청기한 D-${daysLeft}`, color: "bg-slate-100 text-slate-600 border-slate-300" };
}

export const STAGE_LABEL: Record<string, string> = {
  APPLICATION: "접수",
  EVALUATION: "평가",
  PLAN: "계획",
  REPORT: "승인",
  DONE: "완료",
};

export const STAGE_ORDER = ["APPLICATION", "EVALUATION", "PLAN", "REPORT", "DONE"] as const;

type StageRecordLike = { status: "SUBMITTED" | "APPROVED" | "REJECTED" } | null | undefined;

export function computeStatusLabel(currentStage: string, overallStatus: string, activeStageRecord: StageRecordLike) {
  if (overallStatus === "COMPLETED") {
    return { text: "완료", color: "bg-emerald-100 text-emerald-700 border-emerald-300" };
  }
  if (!activeStageRecord) {
    return {
      text: `${STAGE_LABEL[currentStage]} 작성 대기`,
      color: "bg-slate-100 text-slate-600 border-slate-300",
    };
  }
  if (activeStageRecord.status === "SUBMITTED") {
    return {
      text: `${STAGE_LABEL[currentStage]} 검토 대기`,
      color: "bg-amber-100 text-amber-700 border-amber-300",
    };
  }
  if (activeStageRecord.status === "REJECTED") {
    return {
      text: `${STAGE_LABEL[currentStage]} 반려됨`,
      color: "bg-rose-100 text-rose-700 border-rose-300",
    };
  }
  return {
    text: `${STAGE_LABEL[currentStage]} 승인됨`,
    color: "bg-sky-100 text-sky-700 border-sky-300",
  };
}
