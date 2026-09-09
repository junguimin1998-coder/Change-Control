"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { deadlineBadge } from "@/lib/stageMeta";
import { daysUntilKST } from "@/lib/kst";

type Row = {
  id: string;
  ccNumber: string;
  title: string;
  productName: string;
  year: number;
  stageLabel: string;
  statusText: string;
  statusColor: string;
  submitter: string;
  deadline: string | null;
  updatedAt: string;
  overallStatus: "IN_PROGRESS" | "COMPLETED";
};

type SortKey = "ccNumber" | "title" | "productName" | "year" | "stageLabel" | "deadline" | "submitter";

export default function AllChangesClient({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("ccNumber");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const years = useMemo(() => Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => b - a), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (year !== "all" && String(r.year) !== year) return false;
      if (status !== "all" && r.overallStatus !== status) return false;
      if (q && !`${r.ccNumber} ${r.title} ${r.productName} ${r.submitter}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, year, status]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "ko");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

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

  const columns: { key: SortKey; label: string }[] = [
    { key: "ccNumber", label: "번호" },
    { key: "title", label: "제목" },
    { key: "productName", label: "제품명" },
    { key: "year", label: "연도" },
    { key: "stageLabel", label: "현재 단계" },
    { key: "deadline", label: "마감 기한" },
    { key: "submitter", label: "접수자" },
  ];

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
          <label className="label">상태</label>
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
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="cursor-pointer select-none px-4 py-3 hover:text-slate-800"
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.label}
                    {sortArrow(col.key)}
                  </th>
                ))}
                <th className="px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const badge = deadlineBadge(daysUntilKST(r.deadline ? new Date(r.deadline) : null));
                return (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/cc/${r.id}`} className="font-medium text-brand-600 hover:underline">
                        {r.ccNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{r.title}</td>
                    <td className="px-4 py-3">{r.productName}</td>
                    <td className="px-4 py-3">{r.year}</td>
                    <td className="px-4 py-3">{r.stageLabel}</td>
                    <td className="px-4 py-3">
                      {r.overallStatus === "COMPLETED" ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${badge.color}`}>{badge.text}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{r.submitter}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-1 text-xs font-medium ${r.statusColor}`}>{r.statusText}</span>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-400">
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
