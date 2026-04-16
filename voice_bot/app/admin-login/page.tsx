"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, KeyRound, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });

    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setError("Invalid API key. Access denied.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-4">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#c0c1ff]/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-red-500/5 blur-[120px]" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin Access Only
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#111114] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/60">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#c0c1ff]/10 flex items-center justify-center border border-[#c0c1ff]/20">
              <KeyRound className="w-5 h-5 text-[#c0c1ff]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Admin Console</h1>
              <p className="text-xs text-zinc-500">Enter your API key to continue</p>
            </div>
          </div>

          <div className="h-px bg-white/5 my-6" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">
                Admin API Key
              </label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="sk-admin-••••••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#c0c1ff]/50 focus:bg-white/8 transition-all font-mono"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#c0c1ff] hover:bg-[#c0c1ff]/90 text-[#0a0a14] font-bold rounded-xl text-sm tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
              ) : (
                <><ShieldCheck className="w-4 h-4" /> Access Admin Console</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-4">
          Restricted access. All activity is logged.
        </p>
      </div>
    </div>
  );
}
