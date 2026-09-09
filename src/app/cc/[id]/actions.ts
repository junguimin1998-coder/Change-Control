"use server";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return session!.user;
}

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("관리자만 승인/반려할 수 있습니다.");
  }
  return user;
}

// 반려된 항목을 고쳐서 다시 제출하는 것은, 이 변경관리를 접수한 본인(또는 관리자)만 할 수 있습니다.
function assertOwnerOrAdmin(user: { id: string; role: string }, cc: { createdById: string }) {
  if (user.id !== cc.createdById && user.role !== "ADMIN") {
    throw new Error("본인이 접수한 항목만 수정할 수 있습니다.");
  }
}

async function saveAttachments(formData: FormData, ccId: string, stage: "APPLICATION" | "EVALUATION" | "PLAN" | "REPORT", uploadedById: string) {
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return false;

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    await prisma.attachment.create({
      data: {
        changeControlId: ccId,
        stage,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: buffer.byteLength,
        data: buffer,
        uploadedById,
      },
    });
  }
  return true;
}

// ---------- 신청서 (Application) ----------

export async function submitApplication(formData: FormData) {
  const user = await requireUser();
  const ccId = String(formData.get("ccId"));

  const cc = await prisma.changeControl.findUniqueOrThrow({ where: { id: ccId } });
  if (cc.currentStage !== "APPLICATION") throw new Error("신청서 단계가 아닙니다.");
  // 신청서 단계에서 이 액션은 항상 반려 후 재제출이므로 접수자 본인/관리자만 허용합니다.
  assertOwnerOrAdmin(user, cc);

  const currentState = String(formData.get("currentState") ?? "").trim();
  const changeAgenda = String(formData.get("changeAgenda") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const uploadedFiles = await saveAttachments(formData, ccId, "APPLICATION", user.id);
  const hasAttachment = formData.get("hasAttachment") === "yes" || uploadedFiles;

  await prisma.application.upsert({
    where: { changeControlId: ccId },
    create: {
      changeControlId: ccId,
      currentState,
      changeAgenda,
      reason,
      hasAttachment,
      status: "SUBMITTED",
      submittedById: user.id,
    },
    update: {
      currentState,
      changeAgenda,
      reason,
      hasAttachment,
      status: "SUBMITTED",
      rejectReason: null,
      submittedById: user.id,
      submittedAt: new Date(),
      reviewedById: null,
      reviewedAt: null,
    },
  });

  await prisma.activityLog.create({
    data: { changeControlId: ccId, action: "APPLICATION_SUBMITTED", byUserId: user.id, note: "신청서가 (재)제출되었습니다." },
  });

  revalidatePath(`/cc/${ccId}`, "layout");
  redirect(`/cc/${ccId}/application`);
}

export async function approveApplication(formData: FormData) {
  const user = await requireAdmin();
  const ccId = String(formData.get("ccId"));

  await prisma.$transaction([
    prisma.application.update({
      where: { changeControlId: ccId },
      data: { status: "APPROVED", reviewedById: user.id, reviewedAt: new Date() },
    }),
    prisma.changeControl.update({
      where: { id: ccId },
      data: { currentStage: "EVALUATION" },
    }),
    prisma.activityLog.create({
      data: { changeControlId: ccId, action: "APPLICATION_APPROVED", byUserId: user.id },
    }),
  ]);

  revalidatePath(`/cc/${ccId}`, "layout");
  redirect(`/cc/${ccId}/application`);
}

export async function rejectApplication(formData: FormData) {
  const user = await requireAdmin();
  const ccId = String(formData.get("ccId"));
  const rejectReason = String(formData.get("rejectReason") ?? "").trim();

  await prisma.$transaction([
    prisma.application.update({
      where: { changeControlId: ccId },
      data: { status: "REJECTED", rejectReason, reviewedById: user.id, reviewedAt: new Date() },
    }),
    prisma.activityLog.create({
      data: { changeControlId: ccId, action: "APPLICATION_REJECTED", byUserId: user.id, note: rejectReason },
    }),
  ]);

  revalidatePath(`/cc/${ccId}`, "layout");
  redirect(`/cc/${ccId}/application`);
}

// ---------- 평가서 (Evaluation) ----------

export async function submitEvaluation(formData: FormData) {
  const user = await requireUser();
  const ccId = String(formData.get("ccId"));

  const cc = await prisma.changeControl.findUniqueOrThrow({ where: { id: ccId } });
  if (cc.currentStage !== "EVALUATION") throw new Error("평가서 단계가 아닙니다.");

  const existing = await prisma.evaluation.findUnique({ where: { changeControlId: ccId } });
  // 이미 제출된(반려된) 평가서를 고치는 경우에만 접수자 본인/관리자로 제한합니다. 최초 작성은 누구나 가능합니다.
  if (existing) assertOwnerOrAdmin(user, cc);

  const uploadedFiles = await saveAttachments(formData, ccId, "EVALUATION", user.id);

  const data = {
    dept1Name: String(formData.get("dept1Name") ?? "").trim() || null,
    dept1Opinion: String(formData.get("dept1Opinion") ?? "").trim() || null,
    dept2Name: String(formData.get("dept2Name") ?? "").trim() || null,
    dept2Opinion: String(formData.get("dept2Opinion") ?? "").trim() || null,
    dept3Name: String(formData.get("dept3Name") ?? "").trim() || null,
    dept3Opinion: String(formData.get("dept3Opinion") ?? "").trim() || null,
    finalEvaluation: String(formData.get("finalEvaluation") ?? "").trim(),
    needsConsultation: formData.get("needsConsultation") === "yes",
    needsCooperation: formData.get("needsCooperation") === "yes",
    hasAttachment: formData.get("hasAttachment") === "yes" || uploadedFiles,
  };

  await prisma.evaluation.upsert({
    where: { changeControlId: ccId },
    create: { changeControlId: ccId, ...data, status: "SUBMITTED", submittedById: user.id },
    update: {
      ...data,
      status: "SUBMITTED",
      rejectReason: null,
      submittedById: user.id,
      submittedAt: new Date(),
      reviewedById: null,
      reviewedAt: null,
    },
  });

  await prisma.activityLog.create({
    data: { changeControlId: ccId, action: "EVALUATION_SUBMITTED", byUserId: user.id },
  });

  revalidatePath(`/cc/${ccId}`, "layout");
  redirect(`/cc/${ccId}/evaluation`);
}

export async function approveEvaluation(formData: FormData) {
  const user = await requireAdmin();
  const ccId = String(formData.get("ccId"));

  await prisma.$transaction([
    prisma.evaluation.update({
      where: { changeControlId: ccId },
      data: { status: "APPROVED", reviewedById: user.id, reviewedAt: new Date() },
    }),
    prisma.changeControl.update({ where: { id: ccId }, data: { currentStage: "PLAN" } }),
    prisma.activityLog.create({ data: { changeControlId: ccId, action: "EVALUATION_APPROVED", byUserId: user.id } }),
  ]);

  revalidatePath(`/cc/${ccId}`, "layout");
  redirect(`/cc/${ccId}/evaluation`);
}

export async function rejectEvaluation(formData: FormData) {
  const user = await requireAdmin();
  const ccId = String(formData.get("ccId"));
  const rejectReason = String(formData.get("rejectReason") ?? "").trim();

  await prisma.$transaction([
    prisma.evaluation.update({
      where: { changeControlId: ccId },
      data: { status: "REJECTED", rejectReason, reviewedById: user.id, reviewedAt: new Date() },
    }),
    prisma.activityLog.create({ data: { changeControlId: ccId, action: "EVALUATION_REJECTED", byUserId: user.id, note: rejectReason } }),
  ]);

  revalidatePath(`/cc/${ccId}`, "layout");
  redirect(`/cc/${ccId}/evaluation`);
}

// ---------- 계획서 (Plan) ----------

export async function submitPlan(formData: FormData) {
  const user = await requireUser();
  const ccId = String(formData.get("ccId"));

  const cc = await prisma.changeControl.findUniqueOrThrow({ where: { id: ccId } });
  if (cc.currentStage !== "PLAN") throw new Error("계획서 단계가 아닙니다.");

  const existing = await prisma.plan.findUnique({ where: { changeControlId: ccId } });
  if (existing) assertOwnerOrAdmin(user, cc);

  const uploadedFiles = await saveAttachments(formData, ccId, "PLAN", user.id);
  const plannedCompletionDate = new Date(String(formData.get("plannedCompletionDate")));
  const planDetails = String(formData.get("planDetails") ?? "").trim();
  const hasAttachment = formData.get("hasAttachment") === "yes" || uploadedFiles;

  await prisma.plan.upsert({
    where: { changeControlId: ccId },
    create: { changeControlId: ccId, plannedCompletionDate, planDetails, hasAttachment, status: "SUBMITTED", submittedById: user.id },
    update: {
      plannedCompletionDate,
      planDetails,
      hasAttachment,
      status: "SUBMITTED",
      rejectReason: null,
      submittedById: user.id,
      submittedAt: new Date(),
      reviewedById: null,
      reviewedAt: null,
    },
  });

  await prisma.activityLog.create({ data: { changeControlId: ccId, action: "PLAN_SUBMITTED", byUserId: user.id } });

  revalidatePath(`/cc/${ccId}`, "layout");
  redirect(`/cc/${ccId}/plan`);
}

export async function approvePlan(formData: FormData) {
  const user = await requireAdmin();
  const ccId = String(formData.get("ccId"));

  await prisma.$transaction([
    prisma.plan.update({ where: { changeControlId: ccId }, data: { status: "APPROVED", reviewedById: user.id, reviewedAt: new Date() } }),
    prisma.changeControl.update({ where: { id: ccId }, data: { currentStage: "REPORT" } }),
    prisma.activityLog.create({ data: { changeControlId: ccId, action: "PLAN_APPROVED", byUserId: user.id } }),
  ]);

  revalidatePath(`/cc/${ccId}`, "layout");
  redirect(`/cc/${ccId}/plan`);
}

export async function rejectPlan(formData: FormData) {
  const user = await requireAdmin();
  const ccId = String(formData.get("ccId"));
  const rejectReason = String(formData.get("rejectReason") ?? "").trim();

  await prisma.$transaction([
    prisma.plan.update({ where: { changeControlId: ccId }, data: { status: "REJECTED", rejectReason, reviewedById: user.id, reviewedAt: new Date() } }),
    prisma.activityLog.create({ data: { changeControlId: ccId, action: "PLAN_REJECTED", byUserId: user.id, note: rejectReason } }),
  ]);

  revalidatePath(`/cc/${ccId}`, "layout");
  redirect(`/cc/${ccId}/plan`);
}

// ---------- 완료보고서 (Report) ----------

export async function submitReport(formData: FormData) {
  const user = await requireUser();
  const ccId = String(formData.get("ccId"));

  const cc = await prisma.changeControl.findUniqueOrThrow({ where: { id: ccId } });
  if (cc.currentStage !== "REPORT") throw new Error("완료보고서 단계가 아닙니다.");

  const existing = await prisma.report.findUnique({ where: { changeControlId: ccId } });
  if (existing) assertOwnerOrAdmin(user, cc);

  const uploadedFiles = await saveAttachments(formData, ccId, "REPORT", user.id);
  const progress = formData.get("progress") === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS";
  const completedDateRaw = String(formData.get("completedDate") ?? "");
  const resultDetails = String(formData.get("resultDetails") ?? "").trim();
  const relatedDocRevision = String(formData.get("relatedDocRevision") ?? "").trim();
  const conclusion = String(formData.get("conclusion") ?? "").trim();

  const data = {
    progress: progress as "IN_PROGRESS" | "COMPLETED",
    completedDate: completedDateRaw ? new Date(completedDateRaw) : null,
    resultDetails,
    relatedDocRevision,
    conclusion,
    hasAttachment: formData.get("hasAttachment") === "yes" || uploadedFiles,
  };

  await prisma.report.upsert({
    where: { changeControlId: ccId },
    create: { changeControlId: ccId, ...data, status: "SUBMITTED", submittedById: user.id },
    update: {
      ...data,
      status: "SUBMITTED",
      rejectReason: null,
      submittedById: user.id,
      submittedAt: new Date(),
      reviewedById: null,
      reviewedAt: null,
    },
  });

  await prisma.activityLog.create({ data: { changeControlId: ccId, action: "REPORT_SUBMITTED", byUserId: user.id } });

  revalidatePath(`/cc/${ccId}`, "layout");
  redirect(`/cc/${ccId}/report`);
}

export async function approveReport(formData: FormData) {
  const user = await requireAdmin();
  const ccId = String(formData.get("ccId"));

  await prisma.$transaction([
    prisma.report.update({ where: { changeControlId: ccId }, data: { status: "APPROVED", reviewedById: user.id, reviewedAt: new Date() } }),
    prisma.changeControl.update({ where: { id: ccId }, data: { currentStage: "DONE", overallStatus: "COMPLETED" } }),
    prisma.activityLog.create({ data: { changeControlId: ccId, action: "REPORT_APPROVED", byUserId: user.id, note: "변경관리가 최종 완료되었습니다." } }),
  ]);

  revalidatePath(`/cc/${ccId}`, "layout");
  redirect(`/cc/${ccId}/report`);
}

export async function rejectReport(formData: FormData) {
  const user = await requireAdmin();
  const ccId = String(formData.get("ccId"));
  const rejectReason = String(formData.get("rejectReason") ?? "").trim();

  await prisma.$transaction([
    prisma.report.update({ where: { changeControlId: ccId }, data: { status: "REJECTED", rejectReason, reviewedById: user.id, reviewedAt: new Date() } }),
    prisma.activityLog.create({ data: { changeControlId: ccId, action: "REPORT_REJECTED", byUserId: user.id, note: rejectReason } }),
  ]);

  revalidatePath(`/cc/${ccId}`, "layout");
  redirect(`/cc/${ccId}/report`);
}

// ---------- 비고 (관리자 전용) ----------

export async function updateRemarks(formData: FormData) {
  const user = await requireAdmin();
  const ccId = String(formData.get("ccId"));
  const remarks = String(formData.get("remarks") ?? "").trim();

  await prisma.changeControl.update({ where: { id: ccId }, data: { remarks: remarks || null } });

  await prisma.activityLog.create({
    data: { changeControlId: ccId, action: "REMARKS_UPDATED", byUserId: user.id },
  });

  revalidatePath(`/change-control`);
}
