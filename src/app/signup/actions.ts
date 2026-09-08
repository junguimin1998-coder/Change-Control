"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function signup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    redirect("/signup?error=" + encodeURIComponent("모든 항목을 입력해주세요."));
  }
  if (password.length < 6) {
    redirect("/signup?error=" + encodeURIComponent("비밀번호는 6자 이상이어야 합니다."));
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/signup?error=" + encodeURIComponent("이미 가입된 이메일입니다."));
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const passwordHash = await bcrypt.hash(password, 10);
  const isAdminEmail = adminEmails.includes(email);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: isAdminEmail ? "ADMIN" : "USER",
      // ADMIN_EMAILS로 지정된 이메일은 승인 절차 없이 즉시 사용 가능해야
      // 최초 관리자 계정을 만들 수 있습니다(그 외 계정은 관리자 승인 필요).
      accountStatus: isAdminEmail ? "APPROVED" : "PENDING",
    },
  });

  redirect(`/signup/pending?status=${isAdminEmail ? "approved" : "pending"}`);
}
