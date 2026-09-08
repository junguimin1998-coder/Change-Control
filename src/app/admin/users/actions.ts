"use server";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") {
    throw new Error("관리자만 접근할 수 있습니다.");
  }
  return session.user;
}

export async function approveUser(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: "APPROVED", approvedById: admin.id, approvedAt: new Date() },
  });

  revalidatePath("/admin/users");
}

export async function rejectUser(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: "REJECTED", approvedById: admin.id, approvedAt: new Date() },
  });

  revalidatePath("/admin/users");
}
