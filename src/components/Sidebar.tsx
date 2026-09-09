"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/change-control", label: "Change Control", match: (p: string) => p.startsWith("/change-control") || p.startsWith("/cc/") },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-56 shrink-0 border-r border-slate-200 bg-slate-50 p-3">
      <ul className="space-y-1">
        {ITEMS.map((item) => {
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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
