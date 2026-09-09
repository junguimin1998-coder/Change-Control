"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { updateRemarks } from "@/app/cc/[id]/actions";

type Row = {
  id: string;
  ccNumber: string;
  title: string;
  productNames: string[];
  year: number;
  currentStage: "APPLICATION" | "EVALUATION" | "PLAN" | "REPORT" | "DONE";
  submittedAt: string;
  evaluationDate: string | null;
  planDate: string | null;
  completedDate: string | null;
  remarks: string;
  submitter: string;
  isCompleted: boolean;
};

type SortKey = "year" | "title" | "submittedAt" | "evaluationDate" | "planDate" | "completedDate" | "isCompleted";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ko-KR");
}

// 이 대장에서는 4단계로만 단순화해서 보여줍니다: 접수/평가/계획 진행 중이거나, 완료보고서
// 단계에 들어갔거나 이미 완료됐으면 "완료"로 묶습니다.
function stageLabel4(stage: Row["currentStage"]) {
  if (stage === "APPLICATION") return "접수";
  if (stage === "EVALUATION") return "평가";
  if (stage === "PLAN") return "계획";
  return "완료";
}

// 연속으로 같은 값이 나오는 구간을 하나로 묶기 위한 rowSpan 계산 (정렬/필터 결과가 바뀌면
// 연도가 뒤섞일 수 있으므로, 그 경우 자연스럽게 묶이지 않고 각 행이 자기 값을 보여줍니다.
function computeSpans<T>(rows: T[], key: (r: T) => unknown) {
  const spans = new Array(rows.length).fill(0);
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (j < rows.length && key(rows[j]) === key(rows[i])) j++;
    spans[i] = j - i;
    i = j;
  }
  return spans;
}

export default function Ledger({ rows, isAdmin }: { rows: Row[]; isAdmin: boolean }) {
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("year");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const years = useMemo(() => Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => b - a), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (year !== "all" && String(r.year) !== year) return false;
      if (status === "IN_PROGRESS" && r.isCompleted) return false;
      if (status === "COMPLETED" && !r.isCompleted) return false;
      if (q && !`${r.ccNumber} ${r.title} ${r.productNames.join(" ")} ${r.submitter}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, year, status]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp: number;
      if (sortKey === "year") {
        cmp = a.year - b.year || a.submittedAt.localeCompare(b.submittedAt);
      } else if (sortKey === "isCompleted") {
        cmp = Number(a.isCompleted) - Number(b.isCompleted);
      } else if (sortKey === "title") {
        cmp = a.title.localeCompare(b.title, "ko");
      } else {
        cmp = (a[sortKey] ?? "").localeCompare(b[sortKey] ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const withNo = useMemo(() => {
    const counters = new Map<number, number>();
    return sorted.map((r) => {
      const n = (counters.get(r.year) ?? 0) + 1;
      counters.set(r.year, n);
      return { ...r, no: n };
    });
  }, [sorted]);

  const yearSpans = useMemo(() => computeSpans(withNo, (r) => r.year), [withNo]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortArrow(key: SortKey) {
    if (key !== sortKey) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">검색</label>
          <input
            className="input w-64"
            placeholder="제목, 제품명, 접수자, 번호"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="label">연도</label>
          <select className="input w-auto" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="all">전체</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">완료 여부</label>
          <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">전체</option>
            <option value="IN_PROGRESS">진행 중</option>
            <option value="COMPLETED">완료</option>
          </select>
        </div>
        <div className="ml-auto text-sm text-slate-500">{sorted.length}건 표시 중 (전체 {rows.length}건)</div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="cursor-pointer select-none whitespace-nowrap px-3 py-3 hover:text-slate-800" onClick={() => toggleSort("year")}>
                  연도{sortArrow("year")}
                </th>
                <th className="whitespace-nowrap px-3 py-3">No.</th>
                <th className="cursor-pointer select-none px-3 py-3 hover:text-slate-800" onClick={() => toggleSort("title")}>
                  변경내용{sortArrow("title")}
                </th>
                <th className="cursor-pointer select-none whitespace-nowrap px-3 py-3 hover:text-slate-800" onClick={() => toggleSort("submittedAt")}>
                  변경접수일{sortArrow("submittedAt")}
                </th>
                <th className="whitespace-nowrap px-3 py-3">변경관리 문서번호</th>
                <th className="cursor-pointer select-none whitespace-nowrap px-3 py-3 hover:text-slate-800" onClick={() => toggleSort("evaluationDate")}>
                  변경평가{sortArrow("evaluationDate")}
                </th>
                <th className="cursor-pointer select-none whitespace-nowrap px-3 py-3 hover:text-slate-800" onClick={() => toggleSort("planDate")}>
                  변경계획{sortArrow("planDate")}
                </th>
                <th className="cursor-pointer select-none whitespace-nowrap px-3 py-3 hover:text-slate-800" onClick={() => toggleSort("completedDate")}>
                  변경완료일{sortArrow("completedDate")}
                </th>
                <th className="px-3 py-3">비고</th>
                <th className="cursor-pointer select-none whitespace-nowrap px-3 py-3 hover:text-slate-800" onClick={() => toggleSort("isCompleted")}>
                  단계{sortArrow("isCompleted")}
                </th>
              </tr>
            </thead>
            <tbody>
              {withNo.map((r, i) => (
                <tr key={r.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                  {yearSpans[i] > 0 && (
                    <td rowSpan={yearSpans[i]} className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">
                      {r.year}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{r.no}</td>
                  <td className="px-3 py-3">
                    <Link href={`/cc/${r.id}`} className="font-medium text-brand-600 hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{fmtDate(r.submittedAt)}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Link href={`/cc/${r.id}`} className="text-brand-600 hover:underline">
                      {r.ccNumber}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {r.evaluationDate ? (
                      <Link href={`/cc/${r.id}/evaluation`} className="text-slate-700 hover:underline">
                        {fmtDate(r.evaluationDate)}
                      </Link>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {r.planDate ? (
                      <Link href={`/cc/${r.id}/plan`} className="text-slate-700 hover:underline">
                        {fmtDate(r.planDate)}
                      </Link>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {r.completedDate ? (
                      <Link href={`/cc/${r.id}/report`} className="text-slate-700 hover:underline">
                        {fmtDate(r.completedDate)}
                      </Link>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="min-w-[180px] px-3 py-2">
                    {isAdmin ? (
                      <form action={updateRemarks} className="flex flex-nowrap items-start gap-1">
                        <input type="hidden" name="ccId" value={r.id} />
                        <textarea
                          name="remarks"
                          defaultValue={r.remarks}
                          rows={1}
                          className="input max-h-12 min-h-[2.25rem] flex-1 resize-none overflow-y-auto py-1.5 text-xs leading-snug"
                          placeholder="-"
                        />
                        <button type="submit" className="btn-secondary shrink-0 whitespace-nowrap px-2 py-1.5 text-xs">
                          저장
                        </button>
                      </form>
                    ) : (
                      <span className="text-slate-600">{r.remarks || "-"}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-medium ${
                        r.isCompleted
                          ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                          : "border-amber-300 bg-amber-100 text-amber-700"
                      }`}
                    >
                      {stageLabel4(r.currentStage)}
                    </span>
                  </td>
                </tr>
              ))}
              {withNo.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    조건에 맞는 변경관리 건이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
