"use client";

import { useState, useTransition } from "react";
import {
  Bug, ArrowLeft, Play, Loader2, Check, X, AlertCircle,
  ChevronDown, ChevronUp, Zap, RefreshCw, Radio
} from "lucide-react";
import Link from "next/link";
import { debugRunAllChecks, debugFireAutoRecharge } from "./actions";

type CheckResult = { ok: boolean; label: string; data?: unknown; error?: string };
type Results = Record<string, CheckResult>;

const STEP_ORDER = [
  "backend_health",
  "clinic_db",
  "razorpay_sync",
  "phone_numbers",
  "cron_simulation",
  "transactions",
];

const STEP_ICONS: Record<string, string> = {
  backend_health:    "🔌",
  clinic_db:         "📋",
  razorpay_sync:     "💳",
  phone_numbers:     "📞",
  cron_simulation:   "⏱️",
  transactions:      "💰",
};

function ResultCard({ id, result }: { id: string; result: CheckResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${
      result.ok
        ? "border-emerald-500/20 bg-emerald-500/3"
        : "border-red-500/20 bg-red-500/3"
    }`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{STEP_ICONS[id] || "📌"}</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">{result.label}</p>
            {result.error && (
              <p className="text-xs text-red-400 mt-0.5 truncate max-w-xs">{result.error}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${
            result.ok
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}>
            {result.ok
              ? <><Check className="w-3 h-3" /> PASS</>
              : <><X className="w-3 h-3" /> FAIL</>
            }
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-white/5 px-5 py-4">
          {result.error ? (
            <div className="flex items-start gap-2 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <pre className="font-mono text-xs whitespace-pre-wrap break-all">{result.error}</pre>
            </div>
          ) : (
            <pre className="text-[11px] text-zinc-400 leading-relaxed whitespace-pre-wrap break-all font-mono bg-black/30 border border-white/5 rounded-xl p-4 overflow-x-auto max-h-80 overflow-y-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function DebugClient({ clinics }: { clinics: { id: string; name: string; email: string }[] }) {
  const [selectedClinic, setSelectedClinic] = useState(clinics[0]?.id || "");
  const [results, setResults] = useState<Results | null>(null);
  const [rechargeResult, setRechargeResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRecharging, startRechargeTransition] = useTransition();

  const runChecks = () => {
    if (!selectedClinic) return;
    setResults(null);
    startTransition(async () => {
      const r = await debugRunAllChecks(selectedClinic);
      setResults(r);
    });
  };

  const fireAutoRecharge = () => {
    startRechargeTransition(async () => {
      const r = await debugFireAutoRecharge(selectedClinic);
      setRechargeResult(JSON.stringify(r, null, 2));
    });
  };

  const passCount = results ? Object.values(results).filter((r) => r.ok).length : 0;
  const failCount = results ? Object.values(results).filter((r) => !r.ok).length : 0;
  const totalCount = results ? Object.values(results).length : 0;

  return (
    <div className="min-h-screen text-[#e5e1e4]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#09090B]/90 backdrop-blur-xl border-b border-white/8 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-zinc-500 hover:text-zinc-300"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-lg bg-[#c0c1ff]/10 border border-[#c0c1ff]/20 flex items-center justify-center">
            <Bug className="w-4 h-4 text-[#c0c1ff]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">End-to-End Debug Flow</h1>
            <p className="text-[10px] text-zinc-500">Trace the full payment + billing pipeline</p>
          </div>
        </div>
        {results && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-400 font-bold">{passCount} PASS</span>
            <span className="text-zinc-600">/</span>
            <span className="text-red-400 font-bold">{failCount} FAIL</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">{totalCount} total</span>
          </div>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Clinic Selector + Run Button */}
        <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-4">Select Clinic to Debug</h2>
          <div className="flex gap-3 flex-wrap">
            <select
              value={selectedClinic}
              onChange={(e) => { setSelectedClinic(e.target.value); setResults(null); setRechargeResult(null); }}
              className="flex-1 min-w-[220px] bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-[#c0c1ff]/40 transition-colors"
            >
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.email}
                </option>
              ))}
            </select>
            <button
              onClick={runChecks}
              disabled={isPending || !selectedClinic}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#c0c1ff] hover:bg-[#c0c1ff]/90 text-[#0a0a14] text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
                : <><Play className="w-4 h-4" /> Run All Checks</>
              }
            </button>
          </div>
        </div>

        {/* Pipeline Diagram */}
        {!results && !isPending && (
          <div className="bg-[#111114]/60 border border-white/5 rounded-2xl p-6">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-5 text-center">Full Flow Diagram</h3>
            <div className="flex flex-col items-center gap-0">
              {[
                { emoji: "🔌", label: "Backend Health", desc: "Is FastAPI reachable?" },
                { emoji: "📋", label: "Clinic DB Record", desc: "subscription_status, wallet, auto_recharge" },
                { emoji: "💳", label: "Razorpay Sync", desc: "Live fetch from Razorpay API" },
                { emoji: "📞", label: "Phone Numbers", desc: "Active numbers + next_billing_date" },
                { emoji: "⏱️", label: "Cron Simulation", desc: "What cron would do RIGHT NOW (dry run)" },
                { emoji: "💰", label: "Transaction Log", desc: "Last 10 wallet/subscription events" },
              ].map((step, i, arr) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-5 py-3 w-full max-w-md">
                    <span className="text-xl">{step.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{step.label}</p>
                      <p className="text-xs text-zinc-500">{step.desc}</p>
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-px h-5 bg-white/10 my-0.5" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isPending && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-[#c0c1ff]/20" />
              <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-[#c0c1ff] border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-zinc-400">Running all checks…</p>
          </div>
        )}

        {/* Results */}
        {results && !isPending && (
          <>
            {/* Summary Bar */}
            <div className={`flex items-center justify-between px-5 py-3 rounded-xl border ${
              failCount === 0
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-red-500/5 border-red-500/20"
            }`}>
              <div className="flex items-center gap-2">
                {failCount === 0
                  ? <><Check className="w-4 h-4 text-emerald-400" /><span className="text-sm font-bold text-emerald-400">All systems operational</span></>
                  : <><AlertCircle className="w-4 h-4 text-red-400" /><span className="text-sm font-bold text-red-400">{failCount} check(s) failed</span></>
                }
              </div>
              <button
                onClick={runChecks}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-run
              </button>
            </div>

            {/* Step Cards */}
            <div className="space-y-3">
              {STEP_ORDER.filter((k) => results[k]).map((key) => (
                <ResultCard key={key} id={key} result={results[key]} />
              ))}
              {/* Any extra results not in STEP_ORDER */}
              {Object.keys(results)
                .filter((k) => !STEP_ORDER.includes(k))
                .map((key) => (
                  <ResultCard key={key} id={key} result={results[key]} />
                ))}
            </div>

            {/* Auto-Recharge Simulator */}
            <div className="bg-[#111114] border border-yellow-500/15 rounded-2xl p-5 mt-2">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-bold text-white">Simulate Auto-Recharge</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                Fires a fake <code className="bg-white/5 px-1 rounded text-[#c0c1ff]">invoice.paid</code> webhook
                event to your backend for this clinic. The backend will credit the wallet by ₹999 if processing succeeds.
                Works end-to-end without needing Razorpay to actually charge.
              </p>
              <button
                onClick={fireAutoRecharge}
                disabled={isRecharging}
                className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm font-semibold rounded-xl hover:bg-yellow-500/15 transition-colors disabled:opacity-50"
              >
                {isRecharging
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Firing…</>
                  : <><Radio className="w-4 h-4" /> Fire Fake invoice.paid</>
                }
              </button>
              {rechargeResult && (
                <pre className="mt-3 p-3 bg-black/30 border border-white/5 rounded-xl text-[10px] text-zinc-400 overflow-x-auto">
                  {rechargeResult}
                </pre>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
