import Link from "next/link";
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { 
  ArrowRight, 
  Clock, 
  AlertTriangle,
  BookOpen,
  FileText
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Fetch all pipeline steps
  const { data: steps } = await supabase
    .from("pipeline_steps")
    .select("*")
    .order("step_number", { ascending: true });

  // 2. Fetch all wiki documents linked to steps
  const { data: wikis } = await supabase
    .from("wiki_documents")
    .select("slug, step_number, title");

  // Map step_number to wiki slug
  const stepToWikiMap = (wikis || []).reduce<Record<number, { slug: string; title: string }>>((acc, curr) => {
    if (curr.step_number !== null) {
      acc[curr.step_number] = { slug: curr.slug, title: curr.title };
    }
    return acc;
  }, {});

  const criticalIssues = [
    { text: "AS Refresh (Step 5) chạy lúc 08:00 AM không phụ thuộc dbt, nguy cơ load dữ liệu cũ nếu ETL trễ.", type: "danger" },
  ];

  return (
    <div className="space-y-8">
      {/* Page Title & SLA Clock */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-900">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">ETL Pipelines Documentation & Wiki</h1>
          <p className="text-sm text-slate-400 mt-1.5">Theo dõi luồng vận hành, sơ đồ cấu trúc và runbooks cho 6 bước cốt lõi.</p>
        </div>

        {/* Live Status Indicators */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-950/60 border border-slate-800/80 px-5 py-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-300">Daily SLA Metric: 100%</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-semibold text-slate-300">AS Target: 08:00 AM</span>
          </div>
        </div>
      </div>

      {/* Critical Alert Warning */}
      {criticalIssues.map((issue, idx) => (
        <div 
          key={idx} 
          className="flex items-start gap-4 p-4 rounded-2xl border border-rose-950/30 bg-rose-950/10 text-rose-300 text-xs sm:text-sm font-medium animate-pulse"
        >
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white uppercase tracking-wider text-[10px] bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded-full mr-2">
              QUAN TRỌNG
            </span>
            {issue.text}
          </div>
        </div>
      ))}

      {/* 1. PIPELINE VISUAL FLOW (SVG ANIMATION) */}
      <section className="glass-card p-6 sm:p-8 rounded-3xl overflow-hidden relative">
        <h2 className="font-display text-base font-extrabold text-white mb-6 uppercase tracking-wider text-sky-400">
          Sơ đồ Tổng quan Vận hành
        </h2>
        
        {/* Responsive Flex Pipeline visualization */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 w-full relative">
          {(steps || []).map((s, index) => {
            const hasWiki = !!stepToWikiMap[s.step_number];
            const wikiLink = hasWiki ? `/dashboard/wiki/${stepToWikiMap[s.step_number].slug}` : "#";

            return (
              <React.Fragment key={s.step_number}>
                <Link
                  href={wikiLink}
                  className="flex-1 flex flex-col p-4 rounded-2xl border border-slate-800 bg-slate-900/30 hover:border-sky-500/40 hover:bg-slate-900/70 transition-all duration-300 group cursor-pointer relative"
                >
                  <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  
                  <span className="text-[10px] font-bold text-slate-500 mb-1">
                    STEP 0{s.step_number}
                  </span>
                  <span className="font-display text-sm font-bold text-white group-hover:text-sky-400 transition-all truncate">
                    {s.step_name}
                  </span>
                  <span className="text-[10px] text-sky-400 font-semibold mt-1">
                    {s.platform}
                  </span>

                  <span className="mt-4 flex items-center gap-1 text-[10px] font-bold text-slate-500 group-hover:text-white transition-all">
                    Xem runbook <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
                {index < (steps || []).length - 1 && (
                  <div className="hidden lg:flex items-center justify-center shrink-0">
                    <ArrowRight className="h-4 w-4 text-slate-700 animate-pulse" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* 2. DETAILED GRID LISTING WITH RUNBOOK & FILE STORAGE LINKS */}
      <section className="space-y-6">
        <h2 className="font-display text-lg font-black text-white tracking-tight">Chi tiết Cấu hình & Tài liệu Từng bước</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(steps || []).map((s) => {
            const hasWiki = !!stepToWikiMap[s.step_number];
            const wiki = stepToWikiMap[s.step_number];
            const wikiLink = hasWiki ? `/dashboard/wiki/${wiki.slug}` : "#";

            return (
              <div 
                key={s.step_number} 
                className="glass-card p-6 rounded-3xl border border-slate-900/80 relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-widest bg-sky-950/20 border border-sky-900/30 px-3 py-1 rounded-full">
                      Step 0{s.step_number}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      SLA: {s.sla_minutes} min
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-white mb-2">{s.step_name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{s.description}</p>

                  <div className="grid grid-cols-2 gap-4 p-3.5 rounded-2xl bg-slate-950/50 border border-slate-900 text-[11px] text-slate-400 font-semibold mb-6">
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider text-slate-500">Platform</span>
                      <span className="text-white">{s.platform}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider text-slate-500">Trigger Type</span>
                      <span className="text-white">{s.trigger_type}</span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-900">
                      <span className="block text-[9px] uppercase tracking-wider text-slate-500">Dependency</span>
                      <span className="text-white truncate block">{s.dependency_logic || "None"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-900">
                  {hasWiki ? (
                    <Link
                      href={wikiLink}
                      className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-white px-4 py-2.5 transition-all"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                      Đọc Runbook
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-500 italic">Chưa liên kết Wiki</span>
                  )}

                  <Link
                    href={wikiLink}
                    className="flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Đính kèm tệp <FileText className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
