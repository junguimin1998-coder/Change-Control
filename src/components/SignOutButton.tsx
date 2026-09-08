"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm font-medium text-slate-500 hover:text-slate-800"
    >
      로그아웃
    </button>
  );
}
