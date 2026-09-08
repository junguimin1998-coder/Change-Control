import Link from "next/link";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">회원가입</h1>
        <p className="mb-6 text-sm text-slate-500">
          변경관리 시스템을 사용하려면 계정이 필요합니다.
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
            가입하기
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
