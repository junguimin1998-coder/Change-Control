import Link from "next/link";

export default async function SignupPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const approved = status === "approved";

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm text-center">
        {approved ? (
          <>
            <h1 className="mb-2 text-xl font-bold text-slate-900">가입이 완료되었습니다</h1>
            <p className="mb-6 text-sm text-slate-500">관리자 계정으로 등록되었습니다. 바로 로그인할 수 있습니다.</p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-xl font-bold text-slate-900">가입 신청이 접수되었습니다</h1>
            <p className="mb-6 text-sm text-slate-500">
              관리자 승인 후 로그인할 수 있습니다. 승인이 완료되면 사내 안내를 받으신 뒤 다시 로그인해주세요.
            </p>
          </>
        )}
        <Link href="/login" className="btn-primary inline-flex">
          로그인 페이지로 이동
        </Link>
      </div>
    </main>
  );
}
