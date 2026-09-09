import Link from "next/link";
import { createApplication } from "./actions";

export default async function NewChangeControlPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-sm text-slate-500 hover:underline">
          ← 목록으로
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">변경관리 신청서</h1>
        <p className="text-sm text-slate-500">
          Change control application — 아래 내용을 작성하여 접수하면 관리자 승인 대기 상태가 됩니다.
        </p>
      </div>

      <form action={createApplication} className="card space-y-5">
        <div>
          <label className="label">변경내용(제목) · Change title</label>
          <input name="title" required className="input" placeholder="예) OO 설비 소프트웨어 버전 업그레이드" />
        </div>

        <div>
          <label className="label">제품명 · Product name</label>
          <input name="productName" required className="input" />
        </div>

        <div>
          <label className="label">마감 기한 · Deadline</label>
          <input type="date" name="deadline" required className="input" />
        </div>

        <div>
          <label className="label">현행 · Current</label>
          <textarea name="currentState" required rows={3} className="input" placeholder="현재 상태/사양을 작성하세요." />
        </div>

        <div>
          <label className="label">변경 안 · Change agenda</label>
          <textarea name="changeAgenda" required rows={3} className="input" placeholder="어떻게 변경할지 작성하세요." />
        </div>

        <div>
          <label className="label">변경 사유 · Reason for change</label>
          <textarea name="reason" required rows={3} className="input" placeholder="변경이 필요한 이유를 작성하세요." />
        </div>

        <div>
          <span className="label">첨부문서 · Attached documents</span>
          <div className="flex gap-6 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input type="radio" name="hasAttachment" value="yes" className="h-4 w-4" />
              있음 (Yes)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="hasAttachment" value="no" defaultChecked className="h-4 w-4" />
              없음 (No)
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/" className="btn-secondary">
            취소
          </Link>
          <button type="submit" className="btn-primary">
            접수하기
          </button>
        </div>
      </form>
    </main>
  );
}
