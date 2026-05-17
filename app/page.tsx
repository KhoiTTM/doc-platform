import Link from "next/link";
import { Database, ShieldAlert, FileText, Activity, LayoutGrid, CheckCircle } from "lucide-react";

export default function LandingPage() {
  const stepsPreview = [
    { num: 1, name: "AX Data Extraction", platform: "Synapse", time: "06:00 AM" },
    { num: 2, name: "Trigger Databricks", platform: "Synapse API", time: "On Step 1 Success" },
    { num: 3, name: "dbt Transform", platform: "Databricks Spark", time: "On Step 2 Success" },
    { num: 4, name: "Gold Data Ready", platform: "Synapse SQL", time: "Automatic" },
    { num: 5, name: "AS Model Refresh", platform: "AS Tabular", time: "08:00 AM" },
    { num: 6, name: "Power BI Live", platform: "Power BI", time: "Automatic" },
  ];

  return (
    <div className="relative min-h-dvh flex flex-col overflow-hidden bg-[#020617]">
      {/* Background Neon Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />

      {/* Navigation Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-12 border-b border-slate-900 bg-slate-950/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
            <Database className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg font-bold tracking-tight text-white leading-none">AX DATA OPS</span>
            <span className="text-[10px] uppercase tracking-wider text-sky-400 font-semibold mt-1">DOCUMENT CENTER</span>
          </div>
        </div>
        <div>
          <Link
            href="/login"
            className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 shadow-lg shadow-sky-500/25 hover:shadow-indigo-500/30 hover:scale-[1.02]"
          >
            Sign In to Dashboard
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 sm:px-12 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-950/20 px-4 py-1.5 text-xs font-semibold text-sky-400 backdrop-blur-md mb-6">
            <ShieldAlert className="h-3.5 w-3.5 animate-pulse" />
            <span>Operational Wiki & Telemetry Runbooks</span>
          </div>
          
          <h1 className="font-display text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
            Unified Portal for
            <span className="block mt-2 bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              AX Data Pipeline Wiki
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed mb-10 max-w-2xl mx-auto">
            Hệ thống quản lý, lưu trữ tài liệu vận hành (runbooks) chuyên sâu và giám sát chất lượng cho 6 bước luồng ETL. Đồng bộ hóa vai trò của Data Engineer, DataOps và QC.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-sky-500/20 transition-all duration-300 hover:scale-[1.02]"
            >
              Explore Wiki Documents
            </Link>
            <a
              href="#steps-preview"
              className="w-full sm:w-auto rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700 px-8 py-4 text-base font-semibold text-slate-300 transition-all duration-300"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* 6 Steps Interactive Visual Grid */}
        <section id="steps-preview" className="w-full mt-24">
          <div className="flex flex-col items-center mb-10 text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-2">6-Step Data Pipeline Flow</h2>
            <p className="text-slate-400 text-sm max-w-md">Kiểm tra tài liệu kỹ thuật và kịch bản vận hành chi tiết cho từng giai đoạn</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {stepsPreview.map((s) => (
              <div
                key={s.num}
                className="glass-card glass-card-hover p-6 rounded-3xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-sky-500/5 to-transparent rounded-tr-3xl" />
                
                <div className="flex items-center justify-between mb-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 font-bold text-sky-400 text-xs border border-slate-800">
                    0{s.num}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest bg-slate-950/65 px-2.5 py-1 rounded-full border border-slate-800/50">
                    {s.platform}
                  </span>
                </div>

                <h3 className="font-display text-lg font-bold text-white mb-2 group-hover:text-sky-400 transition-colors">
                  {s.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Xem kịch bản cấu hình, lịch trình, tài liệu liên quan đến đầu ra và hướng dẫn xử lý sự cố.
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-900 text-[11px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Activity className="h-3 w-3 text-emerald-400" /> Running
                  </span>
                  <span>SLA Time: {s.time}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mt-24 border-t border-slate-900 pt-16">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-950/30 border border-sky-800/30 text-sky-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-white mb-1">Markdown Wiki</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Tài liệu hướng dẫn viết bằng Markdown, dễ đọc, dễ viết và chỉnh sửa.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-950/30 border border-indigo-800/30 text-indigo-400">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-white mb-1">Supabase Storage Links</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Kết nối trực tiếp tới tệp PDF/Doc thiết kế đính kèm lưu trên Supabase Storage.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-950/30 border border-emerald-800/30 text-emerald-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-white mb-1">SLA Alert Signals</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Cảnh báo rủi ro lệch múi giờ AS Tabular Model Refresh (08:00 AM) khi ETL trễ.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-950/30 border border-amber-800/30 text-amber-400">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-white mb-1">Role-based Access</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Đăng nhập phân quyền theo Data Engineer, DataOps và QC chuyên môn.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 sm:px-12 border-t border-slate-950 bg-slate-950/40 text-center text-xs text-slate-500">
        <p>© 2026 AX Data Platform Document Center. Deployed on Vercel with Supabase.</p>
      </footer>
    </div>
  );
}
