import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BookOpen, Plus, FileText, ArrowRight, HelpCircle } from "lucide-react";

export default async function WikiDirectoryPage() {
  const supabase = await createClient();

  // Fetch all documents
  const { data: docs } = await supabase
    .from("wiki_documents")
    .select("id, title, slug, category, step_number, updated_at")
    .order("updated_at", { ascending: false });

  const categories = [
    { value: "infrastructure", label: "Infrastructure", color: "text-sky-400 bg-sky-950/20 border-sky-500/20" },
    { value: "dbt", label: "dbt Transformations", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
    { value: "operations", label: "Pipeline Operations", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { value: "qc_testing", label: "QC Testing & SLA", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    { value: "general", label: "General Guides", color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
  ];

  interface WikiItem {
    id: string;
    title: string;
    slug: string;
    category: string;
    step_number: number | null;
    updated_at: string;
  }

  // Group docs by category
  const docsByCategory = (docs || []).reduce<Record<string, WikiItem[]>>((acc, curr) => {
    if (!acc[curr.category]) {
      acc[curr.category] = [];
    }
    acc[curr.category].push(curr as WikiItem);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-900">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Technical Wiki & Procedures</h1>
          <p className="text-sm text-slate-400 mt-1.5">Tổng hợp tài liệu thiết kế, sơ đồ kết nối và cẩm nang xử lý sự cố.</p>
        </div>

        <Link
          href="/dashboard/wiki/new"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.01]"
        >
          <Plus className="h-4 w-4" /> Soạn tài liệu mới
        </Link>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {categories.map((cat) => {
          const catDocs = docsByCategory[cat.value] || [];

          return (
            <div 
              key={cat.value} 
              className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-900/70 space-y-6"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-sky-400">
                  <BookOpen className="h-4.5 w-4.5" />
                </div>
                <h3 className="font-display text-base font-extrabold text-white">{cat.label}</h3>
                <span className="text-[10px] font-bold text-slate-500 ml-auto bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                  {catDocs.length} tài liệu
                </span>
              </div>

              {catDocs.length > 0 ? (
                <div className="space-y-3">
                  {catDocs.map((doc) => (
                    <Link
                      key={doc.id}
                      href={`/dashboard/wiki/${doc.slug}`}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-900 hover:border-slate-800/80 bg-slate-950/20 hover:bg-slate-950/50 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <FileText className="h-4 w-4 text-slate-500 group-hover:text-sky-400 shrink-0 transition-colors" />
                        <span className="text-xs font-bold text-slate-300 group-hover:text-white truncate transition-colors">
                          {doc.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {doc.step_number && (
                          <span className="text-[8px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full">
                            Step 0{doc.step_number}
                          </span>
                        )}
                        <ArrowRight className="h-3.5 w-3.5 text-slate-700 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-950/25 border border-slate-900 border-dashed text-center text-slate-500 text-xs">
                  <HelpCircle className="h-6 w-6 text-slate-600 mb-2" />
                  <span>Chưa có tài liệu nào trong nhóm này.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
