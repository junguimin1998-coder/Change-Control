"use server";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCcNumber } from "@/lib/ccNumber";

export async function createApplication(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const title = String(formData.get("title") ?? "").trim();
  const productNames = formData.getAll("productNames").map((v) => String(v));
  const deadlineRaw = String(formData.get("deadline") ?? "");
  const currentState = String(formData.get("currentState") ?? "").trim();
  const changeAgenda = String(formData.get("changeAgenda") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const hasAttachment = formData.get("hasAttachment") === "yes";

  if (!title || productNames.length === 0 || !deadlineRaw || !currentState || !changeAgenda || !reason) {
    redirect(
      "/cc/new?error=" + encodeURIComponent("모든 필수 항목을 입력해주세요 (제품명, 요청 기한 포함).")
    );
  }

  const ccNumber = await generateCcNumber();

  const cc = await prisma.changeControl.create({
    data: {
      ccNumber,
      title,
      productNames,
      deadline: new Date(deadlineRaw),
      currentStage: "APPLICATION",
      overallStatus: "IN_PROGRESS",
      createdById: session!.user.id,
      application: {
        create: {
          currentState,
          changeAgenda,
          reason,
          hasAttachment,
          status: "SUBMITTED",
          submittedById: session!.user.id,
        },
      },
      activities: {
        create: {
          action: "APPLICATION_SUBMITTED",
          byUserId: session!.user.id,
          note: `변경관리 신청서가 접수되었습니다. (${ccNumber})`,
        },
      },
    },
  });

  redirect(`/cc/${cc.id}`);
}
