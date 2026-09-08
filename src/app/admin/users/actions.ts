"use server";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_OPTIONS } from "@/lib/roles";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") {
    throw new Error("관리자만 접근할 수 있습니다.");
  }
  return session.user;
}

function parseRole(value: FormDataEntryValue | null): "ADMIN" | "A" | "B" | "C" {
  const role = String(value ?? "");
  if (!(ROLE_OPTIONS as readonly string[]).includes(role)) {
    throw new Error("올바르지 않은 권한입니다.");
  }
  return role as "ADMIN" | "A" | "B" | "C";
}

export async function approveUser(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  const role = parseRole(formData.get("role"));

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: "APPROVED", role, approvedById: admin.id, approvedAt: new Date() },
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

export async function updateUserRole(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId"));
  const role = parseRole(formData.get("role"));

  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (target.role === "ADMIN" && role !== "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", accountStatus: "APPROVED", id: { not: userId } },
    });
    if (otherAdmins === 0) {
      redirect("/admin/users?error=" + encodeURIComponent("마지막 남은 관리자의 권한은 변경할 수 없습니다."));
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });

  revalidatePath("/admin/users");
}
