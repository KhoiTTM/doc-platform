"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save, AlertCircle, BookOpen } from "lucide-react";
import Link from "next/link";

export default function NewWikiPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [stepNumber, setStepNumber] = useState<string>("none");
  const [fileUrl, setFileUrl] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: "infrastructure", label: "Infrastructure" },
    { value: "dbt", label: "dbt Transformations" },
    { value: "operations", label: "Pipeline Operations" },
    { value: "qc_testing", label: "QC Testing & SLA" },
    { value: "general", label: "General Guides" },
  ];

  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // remove special chars
      .replace(/[\s_]+/g, "-")  // replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, ""); // trim hyphens
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim() === "") {
      setError("Vui lòng điền tiêu đề tài liệu!");
      return;
    }
    if (content.trim() === "") {
      setError("Vui lòng nhập nội dung tài liệu!");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 1. Get current logged in user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Vui lòng đăng nhập để soạn tài liệu.");

      const slug = generateSlug(title) + "-" + Math.floor(1000 + Math.random() * 9000); // add random key to prevent duplicate slugs

      const insertData = {
        title,
        slug,
        category,
        step_number: stepNumber === "none" ? null : parseInt(stepNumber),
        content,
        file_url: fileUrl.trim() === "" ? null : fileUrl.trim(),
        author_id: user.id,
        updated_at: new Date().toISOString(),
      };

      const { error: insertErr } = await supabase
        .from("wiki_documents")
        .insert([insertData]);

      if (insertErr) throw insertErr;

      router.push(`/dashboard/wiki/${slug}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo tài liệu mới.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Navigation Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-900">
        <Link
          href="/dashboard/wiki"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại Thư mục Wiki
        </Link>

        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-xs font-bold text-white shadow-lg shadow-sky-500/20 hover:scale-[1.01] transition-all"
          disabled={loading}
        >
          <Save className="h-3.5 w-3.5" /> {loading ? "Đang tạo..." : "Tạo tài liệu"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl border border-rose-950/30 bg-rose-950/15 text-xs text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Composition Card */}
      <form onSubmit={handleCreate} className="space-y-6 bg-slate-950/20 border border-slate-900 p-6 sm:p-8 rounded-3xl backdrop-blur-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-sky-400">
            <BookOpen className="h-4.5 w-4.5" />
          </div>
          <h2 className="font-display text-lg font-black text-white">Soạn tài liệu Wiki mới</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Tiêu đề tài liệu
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-white placeholder:text-slate-700 outline-none focus:border-sky-500 focus:bg-slate-900/75 transition-all"
              placeholder="Ví dụ: Quy trình restart Gateway Server..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Phân loại (Category)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:bg-slate-900 transition-all"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value} className="bg-slate-950 text-white">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Liên kết Bước ETL (Optional)
              </label>
              <select
                value={stepNumber}
                onChange={(e) => setStepNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-white outline-none focus:border-sky-500 focus:bg-slate-900 transition-all"
              >
                <option value="none" className="bg-slate-950 text-white">Không liên kết</option>
                <option value="1" className="bg-slate-950 text-white">Step 1: AX Data Extraction</option>
                <option value="2" className="bg-slate-950 text-white">Step 2: Trigger Databricks API</option>
                <option value="3" className="bg-slate-950 text-white">Step 3: dbt Models Transform</option>
                <option value="4" className="bg-slate-950 text-white">Step 4: Gold Data Serving</option>
                <option value="5" className="bg-slate-950 text-white">Step 5: AS Model Refresh</option>
                <option value="6" className="bg-slate-950 text-white">Step 6: Power BI Live Report</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                URL File đính kèm (Storage link)
              </label>
              <input
                type="text"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-white placeholder:text-slate-700 outline-none focus:border-sky-500 focus:bg-slate-900/75 transition-all"
                placeholder="Dán link PDF/Doc từ Supabase Storage..."
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Nội dung hướng dẫn kỹ thuật (Markdown format)
            </label>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={18}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/40 p-4 font-mono text-xs text-slate-300 placeholder:text-slate-700 outline-none focus:border-sky-500 focus:bg-slate-900 transition-all resize-y"
              placeholder="# Hướng dẫn...&#10;&#10;## 1. Các bước thực hiện...&#10;&#10;```sql&#10;SELECT * FROM gold.dim_customer;&#10;```"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
