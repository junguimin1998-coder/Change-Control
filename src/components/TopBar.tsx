import Link from "next/link";
import { ROLE_LABEL } from "@/lib/roles";
import SignOutButton from "@/components/SignOutButton";

export default function TopBar({ name, role }: { name: string; role: "ADMIN" | "A" | "B" | "C" }) {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between px-5 py-3">
        <Link href="/" className="font-semibold text-slate-900">
          AJU PDV
        </Link>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>
            {name} ({ROLE_LABEL[role]})
          </span>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
