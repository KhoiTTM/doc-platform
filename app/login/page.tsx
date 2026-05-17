"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Database, Eye, EyeOff } from "lucide-react";

type UserRole = "data_engineer" | "data_ops" | "qc_analyst" | "viewer";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roleLabels: Record<UserRole, string> = {
    data_engineer: "Data Engineer",
    data_ops: "DataOps",
    qc_analyst: "QC Analyst",
    viewer: "Viewer / Guest",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split("@")[0],
              role,
            },
          },
        });
        if (signUpError) throw signUpError;
        alert("Đăng ký thành công! Hãy đăng nhập bằng tài khoản vừa tạo.");
        setMode("signin");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        
        router.refresh();
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra. Hãy thử lại!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh flex flex-col justify-between overflow-hidden bg-[#020617]">
      {/* Background Neon Glows */}
      <div className="absolute top-[-10%] left-[-15%] w-[40%] h-[40%] rounded-full bg-sky-600/10 blur-[130px]" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[130px]" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-12 border-b border-slate-900 bg-slate-950/20 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg">
            <Database className="h-4.5 w-4.5" />
          </div>
          <span className="font-display text-base font-bold text-white tracking-tight">AX DATA PLATFORM</span>
        </Link>
        <Link href="/" className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors">
          ← Back Home
        </Link>
      </header>

      {/* Main Form */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="glass-card rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl border border-slate-800/80">
            <div className="text-center mb-8">
              <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
                {mode === "signin" ? "Đăng nhập hệ thống" : "Tạo tài khoản mới"}
              </h1>
              <p className="mt-2 text-xs text-slate-400">
                {mode === "signin"
                  ? "Truy cập hệ thống tài liệu kỹ thuật & kịch bản vận hành."
                  : "Đăng ký thành viên và lựa chọn vị trí chuyên môn của bạn."}
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex rounded-2xl bg-slate-950/80 p-1 border border-slate-900 mb-8">
              <button
                type="button"
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
                  mode === "signin"
                    ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
                  mode === "signup"
                    ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div>
                    <label htmlFor="displayName" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Họ và Tên
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-sky-500 focus:bg-slate-900/80 transition-all duration-200"
                      placeholder="Alex Nguyen"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Vị trí Chuyên môn (Role)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["data_engineer", "data_ops", "qc_analyst", "viewer"] as UserRole[]).map((r) => (
                        <label
                          key={r}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 text-center cursor-pointer transition-all duration-200 ${
                            role === r
                              ? "border-sky-500 bg-sky-950/20 text-sky-400 shadow-md shadow-sky-500/5"
                              : "border-slate-800 bg-slate-950/25 text-slate-500 hover:border-slate-700 hover:text-slate-400"
                          }`}
                        >
                          <input
                            type="radio"
                            name="role"
                            className="sr-only"
                            checked={role === r}
                            onChange={() => setRole(r)}
                          />
                          <span className="text-xs font-bold">{roleLabels[r]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Email công việc
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-sky-500 focus:bg-slate-900/80 transition-all duration-200"
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Mật khẩu
                </label>
                <div className="relative mt-2">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/40 pl-4 pr-10 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-sky-500 focus:bg-slate-900/80 transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl border border-rose-900/50 bg-rose-950/20 text-xs font-semibold text-rose-400 animate-pulse">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition-all duration-300 disabled:opacity-60 disabled:pointer-events-none hover:scale-[1.01]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Please wait...
                  </span>
                ) : mode === "signin" ? (
                  "Đăng Nhập"
                ) : (
                  "Tạo Tài Khoản"
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-600">
        <p>Hệ thống nội bộ. Vui lòng không chia sẻ tài khoản ra ngoài.</p>
      </footer>
    </div>
  );
}
