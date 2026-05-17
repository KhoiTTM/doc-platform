import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { 
  Database, 
  BookOpen, 
  Activity, 
  LogOut, 
  User,
  LayoutGrid
} from "lucide-react";
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

  // Fetch user profile from DB to get role and display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Team Member";
  const userRole = profile?.role || "viewer";

  const roleLabels: Record<string, string> = {
    data_engineer: "Data Engineer",
    data_ops: "DataOps",
    qc_analyst: "QC Analyst",
    viewer: "Viewer",
  };

  const roleColors: Record<string, string> = {
    data_engineer: "bg-sky-500/10 text-sky-400 border-sky-500/35",
    data_ops: "bg-indigo-500/10 text-indigo-400 border-indigo-500/35",
    qc_analyst: "bg-emerald-500/10 text-emerald-400 border-emerald-500/35",
    viewer: "bg-slate-500/10 text-slate-400 border-slate-500/35",
  };

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-900 bg-slate-950/40 shrink-0">
        <div className="flex h-16 items-center px-6 border-b border-slate-900 gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md">
            <Database className="h-4 w-4" />
          </div>
          <span className="font-display text-sm font-bold tracking-tight text-white uppercase">AX DATA PLATFORM</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-900/50 transition-all"
          >
            <LayoutGrid className="h-4 w-4 text-sky-400" />
            Pipeline Steps Wiki
          </Link>
          <Link
            href="/dashboard/wiki"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-900/50 transition-all"
          >
            <BookOpen className="h-4 w-4 text-indigo-400" />
            General Wiki
          </Link>
          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            Other Sections
          </div>
          <Link
            href="/dashboard/services"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-slate-400 cursor-not-allowed hover:bg-slate-950/20 transition-all opacity-50"
            title="Sẽ phát triển sau"
          >
            <Database className="h-4 w-4" />
            Services Inventory
          </Link>
          <Link
            href="/dashboard/qc-audits"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-slate-400 cursor-not-allowed hover:bg-slate-950/20 transition-all opacity-50"
            title="Sẽ phát triển sau"
          >
            <Activity className="h-4 w-4" />
            QC Audits
          </Link>
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
              <User className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">{displayName}</span>
              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full border text-[9px] font-bold w-fit ${roleColors[userRole]}`}>
                {roleLabels[userRole]}
              </span>
            </div>
          </div>
          
          <form action="/api/auth/signout" method="POST" className="w-full">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/35 hover:bg-slate-900/60 py-2 text-xs font-bold text-slate-400 hover:text-white transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between px-6 sm:px-8 border-b border-slate-900/50 bg-slate-950/20 backdrop-blur-md">
          <div className="flex md:hidden items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white">
              <Database className="h-4 w-4" />
            </div>
            <span className="font-display text-sm font-bold text-white">AX OPS</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>AX Data Platform</span>
            <span>/</span>
            <span className="text-slate-300">Dashboard</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex md:hidden items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">{displayName}</span>
            </div>
            <form action="/api/auth/signout" method="POST" className="flex md:hidden">
              <button type="submit" className="text-slate-500 hover:text-white">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-950/30 bg-emerald-950/10 text-xs text-emerald-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Pipeline Online
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
