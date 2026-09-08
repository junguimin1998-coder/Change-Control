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

  const passwordHash = await bcrypt.hash(password, 10);

  // 가장 처음 가입하는 사람이 없으면(회원 0명) 곧바로 관리자로 승인합니다.
  // 그 외에는 일단 대기 상태로 가입되고, 관리자가 승인하면서 권한(관리자/A/B/C)을 정해줍니다.
  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: isFirstUser ? "ADMIN" : "C",
      accountStatus: isFirstUser ? "APPROVED" : "PENDING",
    },
  });

  redirect(`/signup/pending?status=${isFirstUser ? "approved" : "pending"}`);
}
