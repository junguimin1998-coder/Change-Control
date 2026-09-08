export const STAGE_LABEL: Record<string, string> = {
  APPLICATION: "신청서",
  EVALUATION: "평가서",
  PLAN: "계획서",
  REPORT: "완료보고서",
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
