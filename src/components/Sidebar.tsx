"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar({ isAdmin, pendingCount }: { isAdmin: boolean; pendingCount: number }) {
  const pathname = usePathname();

  const items = [
    { href: "/change-control", label: "Change Control", match: (p: string) => p.startsWith("/change-control") || p.startsWith("/cc/") },
    ...(isAdmin
      ? [{ href: "/admin/users", label: "회원 승인 관리", match: (p: string) => p.startsWith("/admin/users"), badge: pendingCount }]
      : []),
  ];

  return (
    <nav className="w-56 shrink-0 border-r border-slate-200 bg-slate-50 p-3">
      <ul className="space-y-1">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-white text-brand-600 shadow-sm" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{item.label}</span>
                {"badge" in item && item.badge! > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-xs font-semibold text-white">{item.badge}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
