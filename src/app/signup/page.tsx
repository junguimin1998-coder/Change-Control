import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { signup } from "./actions";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">
          {isFirstUser ? "최초 관리자 계정 만들기" : "회원가입"}
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          {isFirstUser
            ? "아직 등록된 사용자가 없습니다. 지금 가입하는 계정이 자동으로 관리자가 됩니다."
            : "가입 후 관리자가 승인해야 로그인할 수 있습니다."}
        </p>
        <form action={signup} className="space-y-4">
          <div>
            <label className="label">이름</label>
            <input name="name" required className="input" />
          </div>
          <div>
            <label className="label">이메일</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label">비밀번호</label>
            <input name="password" type="password" required minLength={6} className="input" />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button type="submit" className="btn-primary w-full">
            {isFirstUser ? "관리자 계정 만들기" : "가입하기"}
          </button>
        </form>
        {!isFirstUser && (
          <p className="mt-4 text-center text-sm text-slate-500">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:underline">
              로그인
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
