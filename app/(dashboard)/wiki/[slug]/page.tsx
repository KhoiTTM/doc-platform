import { createClient } from "@/lib/supabase/server";
import { WikiPageContent } from "@/components/wiki-page-content";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function WikiPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch the wiki document matching the slug
  const { data: doc, error } = await supabase
    .from("wiki_documents")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto space-y-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-950 bg-rose-950/20 text-rose-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-white">Tài liệu không tồn tại</h2>
          <p className="text-xs text-slate-400 mt-2">
            Đường dẫn tài liệu không hợp lệ hoặc tài liệu đã bị xóa khỏi hệ thống.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-white px-4 py-2.5 transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại Dashboard
        </Link>
      </div>
    );
  }

  return <WikiPageContent initialDoc={doc} />;
}
