"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { renderMarkdown } from "@/lib/markdown";
import { 
  Edit3, 
  Eye, 
  Save, 
  ArrowLeft, 
  ExternalLink, 
  FileDown, 
  Trash2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

interface WikiDoc {
  id: string;
  step_number: number | null;
  title: string;
  slug: string;
  category: string;
  content: string;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

interface WikiPageContentProps {
  initialDoc: WikiDoc;
}

export function WikiPageContent({ initialDoc }: WikiPageContentProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialDoc.title);
  const [category, setCategory] = useState(initialDoc.category);
  const [content, setContent] = useState(initialDoc.content);
  const [fileUrl, setFileUrl] = useState(initialDoc.file_url || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: "infrastructure", label: "Infrastructure" },
    { value: "dbt", label: "dbt Transformations" },
    { value: "operations", label: "Pipeline Operations" },
    { value: "qc_testing", label: "QC Testing & SLA" },
    { value: "general", label: "General Guides" },
  ];

  async function handleSave() {
    setError(null);
    setLoading(true);
    try {
      const { error: updateErr } = await supabase
        .from("wiki_documents")
        .update({
          title,
          category,
          content,
          file_url: fileUrl.trim() === "" ? null : fileUrl.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", initialDoc.id);

      if (updateErr) throw updateErr;

      setIsEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi lưu tài liệu.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Bạn có chắc chắn muốn xóa tài liệu này? Hành động này không thể hoàn tác.")) {
      return;
    }

    setLoading(true);
    try {
      const { error: deleteErr } = await supabase
        .from("wiki_documents")
        .delete()
        .eq("id", initialDoc.id);

      if (deleteErr) throw deleteErr;

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi xóa tài liệu.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-900">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại Dashboard
        </Link>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-300 hover:text-white transition-all"
                disabled={loading}
              >
                <Eye className="h-3.5 w-3.5" /> Hủy bỏ
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-xs font-bold text-white shadow-lg shadow-sky-500/20 hover:scale-[1.01] transition-all"
                disabled={loading}
              >
                <Save className="h-3.5 w-3.5" /> {loading ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-950 bg-rose-950/20 text-xs font-bold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-all"
                disabled={loading}
                title="Xóa tài liệu"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white hover:bg-slate-850 hover:border-slate-700 transition-all"
              >
                <Edit3 className="h-3.5 w-3.5 text-sky-400" /> Chỉnh sửa tài liệu
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl border border-rose-950/30 bg-rose-950/15 text-xs text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main View Area */}
      {isEditing ? (
        <div className="space-y-6 bg-slate-950/20 border border-slate-900 p-6 sm:p-8 rounded-3xl backdrop-blur-sm">
          <h2 className="font-display text-lg font-black text-white mb-4">Chỉnh sửa nội dung Wiki</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Tiêu đề tài liệu
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-white placeholder:text-slate-700 outline-none focus:border-sky-500 focus:bg-slate-900/75 transition-all"
                placeholder="Nhập tiêu đề Wiki..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5" title="Copy link file anh upload len Supabase Storage roi paste vao day">
                  File đính kèm (Supabase Storage URL)
                </label>
                <input
                  type="text"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-white placeholder:text-slate-700 outline-none focus:border-sky-500 focus:bg-slate-900/75 transition-all"
                  placeholder="https://...supabase.co/storage/v1/object/public/..."
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Nội dung tài liệu (Markdown format)
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={18}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/40 p-4 font-mono text-xs text-slate-300 placeholder:text-slate-700 outline-none focus:border-sky-500 focus:bg-slate-900 transition-all resize-y"
                placeholder="# Hướng dẫn...&#10;&#10;## 1. Giới thiệu...&#10;&#10;- Gạch đầu dòng..."
              />
            </div>
          </div>
        </div>
      ) : (
        <article className="space-y-6">
          {/* Header Metadata */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-950/30 border border-slate-900/80">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {categories.find(c => c.value === category)?.label || category}
              </span>
              
              {initialDoc.step_number && (
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Step 0{initialDoc.step_number} manual
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-4xl font-black text-white tracking-tight leading-[1.2]">
              {title}
            </h1>
            
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-4">
              Last updated: {new Date(initialDoc.updated_at).toLocaleString("vi-VN")}
            </p>
          </div>

          {/* Download Reference File Widget */}
          {initialDoc.file_url && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-sky-950/40 bg-sky-950/10 backdrop-blur-sm">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-900/20 border border-sky-800/30 text-sky-400">
                  <FileDown className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Reference Manual Attached File</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tài liệu đính kèm thiết kế cho bước này, được lưu trên Supabase Storage.</p>
                </div>
              </div>
              <a
                href={initialDoc.file_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-sky-600/10 shrink-0"
              >
                Tải xuống / Xem file <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* Markdown Content Display */}
          <div className="p-6 sm:p-10 rounded-3xl bg-slate-900/15 border border-slate-900/60 leading-relaxed max-w-full overflow-hidden">
            {renderMarkdown(content)}
          </div>
        </article>
      )}
    </div>
  );
}
