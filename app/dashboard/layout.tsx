import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Database, LogOut, User } from "lucide-react";
import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: LayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile from DB to get display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "User";

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-slate-100 overflow-hidden">
      {/* Top Main Navigation Header */}
      <header className="flex h-14 items-center justify-between px-6 border-b border-slate-900 bg-slate-950/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md">
              <Database className="h-4 w-4" />
            </div>
            <span className="font-display text-sm font-bold tracking-tight text-white uppercase">
              AX DATA PORTAL
            </span>
          </Link>
          <span className="text-xs text-slate-600">|</span>
          <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
            Data Engineering Wiki
          </span>
        </div>

        {/* Right side user actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1 rounded-xl border border-slate-800 bg-slate-900/35">
            <div className="h-4.5 w-4.5 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
              <User className="h-3 w-3" />
            </div>
            <span className="text-xs font-semibold text-slate-200">{displayName}</span>
          </div>

          <form action="/api/auth/signout" method="POST" className="flex items-center">
            <button
              type="submit"
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/35 hover:bg-slate-900/60 text-slate-400 hover:text-rose-400 transition-all"
              title="Đăng xuất"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </header>

      {/* Workspace Content Body */}
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>
    </div>
  );
}
