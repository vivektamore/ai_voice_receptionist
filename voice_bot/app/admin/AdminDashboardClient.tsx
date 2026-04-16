"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Users, CreditCard, Zap, Activity, RefreshCw,
  ChevronDown, ChevronUp, LogOut, Bug, Wallet, ToggleLeft,
  ToggleRight, X, Check, AlertCircle, Loader2, Radio, Ban,
  ArrowUpRight, Building2, Phone, Globe, Clock
} from "lucide-react";
import {
  adminTopupWallet, adminDeductWallet, adminCancelSubscription,
  adminToggleAutoRecharge, adminFireCron, adminFireWebhookTest,
  adminUpdateSubscriptionStatus, getClinicTransactions, getClinicNumbers,
  adminActivateClinic, adminGrantTrial
} from "./actions";

type Clinic = Record<string, unknown>;

interface Props {
  clinics: Clinic[];
  stats: {
    total: number; active: number; trial: number; cancelling: number;
    inactive: number; totalWallet: number; autoRechargeEnabled: number; mrr: number;
  };
  health: Record<string, { status: number; ok: boolean; data?: unknown; error?: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  trial: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  cancelling: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  inactive: "bg-red-500/10 text-red-400 border-red-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "bg-white/5 text-zinc-400 border-white/10";
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${color}`}>
      {status || "unknown"}
    </span>
  );
}

function Toast({ msg, type, onClose }: { msg: string; type: "ok" | "err"; onClose: () => void }) {
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium ${
      type === "ok"
        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
        : "bg-red-500/10 border-red-500/30 text-red-300"
    }`}>
      {type === "ok" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

export default function AdminDashboardClient({ clinics, stats, health }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [expandedClinic, setExpandedClinic] = useState<string | null>(null);
  const [clinicDetails, setClinicDetails] = useState<Record<string, { txns: unknown[]; numbers: unknown[] }>>({});
  const [webhookResult, setWebhookResult] = useState<string | null>(null);
  const [cronResult, setCronResult] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [topupAmount, setTopupAmount] = useState<Record<string, string>>({});
  const [webhookEvent, setWebhookEvent] = useState("payment.captured");
  const [webhookClinic, setWebhookClinic] = useState(clinics[0]?.id as string || "");
  const [webhookAmount, setWebhookAmount] = useState("999");

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin-login");
  };

  const loadClinicDetails = async (clinicId: string) => {
    if (clinicDetails[clinicId]) { setExpandedClinic(clinicId); return; }
    setLoadingDetails(clinicId);
    try {
      const [txns, numbers] = await Promise.all([
        getClinicTransactions(clinicId),
        getClinicNumbers(clinicId),
      ]);
      setClinicDetails((prev) => ({ ...prev, [clinicId]: { txns, numbers } }));
      setExpandedClinic(clinicId);
    } catch { showToast("Failed to load clinic details", "err"); }
    finally { setLoadingDetails(null); }
  };

  const toggleExpand = (clinicId: string) => {
    if (expandedClinic === clinicId) { setExpandedClinic(null); return; }
    loadClinicDetails(clinicId);
  };

  const doAction = async (fn: () => Promise<unknown>, successMsg: string) => {
    startTransition(async () => {
      try {
        const res = await fn() as Record<string, unknown>;
        if (res?.status === "success" || res?.ok) {
          showToast(successMsg, "ok");
          router.refresh();
        } else {
          showToast(res?.detail as string || res?.error as string || "Action failed", "err");
        }
      } catch (e: unknown) {
        showToast(String(e), "err");
      }
    });
  };

  return (
    <div className="min-h-screen text-[#e5e1e4] font-['Inter']">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-30 bg-[#09090B]/90 backdrop-blur-xl border-b border-white/8 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#c0c1ff]/10 border border-[#c0c1ff]/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-[#c0c1ff]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">SuperAdmin Console</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">SaaS Owner Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> API Keys
          </a>
          <a
            href="/admin/debug"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#c0c1ff] bg-[#c0c1ff]/10 border border-[#c0c1ff]/20 rounded-lg hover:bg-[#c0c1ff]/15 transition-colors"
          >
            <Bug className="w-3.5 h-3.5" /> Debug Flow
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Total Clinics", value: stats.total, icon: Building2, color: "text-zinc-300" },
            { label: "Active Subs", value: stats.active, icon: Check, color: "text-emerald-400" },
            { label: "On Trial", value: stats.trial, icon: Clock, color: "text-purple-400" },
            { label: "Cancelling", value: stats.cancelling, icon: Clock, color: "text-orange-400" },
            { label: "Inactive", value: stats.inactive, icon: Ban, color: "text-red-400" },
            { label: "MRR (₹)", value: `₹${stats.mrr}`, icon: CreditCard, color: "text-emerald-300" },
            { label: "Auto-Recharge", value: stats.autoRechargeEnabled, icon: Zap, color: "text-yellow-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#111114] border border-white/8 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
              </div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── API Health ── */}
        <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#c0c1ff]" />
            <h2 className="text-sm font-bold text-white">API Health</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(health).map(([key, val]) => (
              <div key={key} className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${val.ok ? "bg-emerald-500/5 border-emerald-500/15" : "bg-red-500/5 border-red-500/15"}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${val.ok ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                <div>
                  <p className={`font-semibold ${val.ok ? "text-emerald-300" : "text-red-300"}`}>{key}</p>
                  <p className="text-zinc-500">{val.ok ? `HTTP ${val.status}` : val.error?.slice(0, 30) || `HTTP ${val.status}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Cron + Webhook Controls ── */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Cron */}
          <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-yellow-400" />
              <h2 className="text-sm font-bold text-white">Cron Job</h2>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Manually triggers the phone number rental billing cycle. Checks all due numbers, deducts wallet, or fires auto-recharge invoices.
            </p>
            <button
              onClick={() => startTransition(async () => {
                const r = await adminFireCron();
                setCronResult(JSON.stringify(r, null, 2));
                showToast("Cron job triggered", "ok");
              })}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm font-semibold rounded-xl hover:bg-yellow-500/15 transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Run Cron Now
            </button>
            {cronResult && (
              <pre className="mt-3 p-3 bg-black/30 border border-white/5 rounded-xl text-[10px] text-zinc-400 overflow-x-auto">
                {cronResult}
              </pre>
            )}
          </div>

          {/* Webhook Tester */}
          <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Radio className="w-4 h-4 text-[#c0c1ff]" />
              <h2 className="text-sm font-bold text-white">Webhook Tester</h2>
            </div>
            <div className="space-y-3 mb-4">
              <select
                value={webhookEvent}
                onChange={(e) => setWebhookEvent(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-[#c0c1ff]/40"
              >
                <option value="payment.captured">payment.captured (wallet topup)</option>
                <option value="invoice.paid">invoice.paid (auto-recharge)</option>
                <option value="subscription.charged">subscription.charged (renewal)</option>
              </select>
              <select
                value={webhookClinic}
                onChange={(e) => setWebhookClinic(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-[#c0c1ff]/40"
              >
                {clinics.map((c) => (
                  <option key={c.id as string} value={c.id as string}>
                    {c.name as string} ({c.email as string})
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={webhookAmount}
                onChange={(e) => setWebhookAmount(e.target.value)}
                placeholder="Amount (e.g. 999)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-[#c0c1ff]/40"
              />
            </div>
            <button
              onClick={() => startTransition(async () => {
                const r = await adminFireWebhookTest(webhookEvent, webhookClinic, parseFloat(webhookAmount));
                setWebhookResult(JSON.stringify(r, null, 2));
                const ok = (r as Record<string,unknown>)?.status === "ok";
                showToast(ok ? "Webhook fired successfully" : "Webhook responded with non-ok", ok ? "ok" : "err");
              })}
              disabled={isPending || !webhookClinic}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#c0c1ff]/10 border border-[#c0c1ff]/20 text-[#c0c1ff] text-sm font-semibold rounded-xl hover:bg-[#c0c1ff]/15 transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
              Fire Webhook Test
            </button>
            {webhookResult && (
              <pre className="mt-3 p-3 bg-black/30 border border-white/5 rounded-xl text-[10px] text-zinc-400 overflow-x-auto">
                {webhookResult}
              </pre>
            )}
          </div>
        </div>

        {/* ── Clinics Table ── */}
        <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#c0c1ff]" />
            <h2 className="text-sm font-bold text-white">All Clinics ({clinics.length})</h2>
          </div>
          <div className="divide-y divide-white/5">
            {clinics.map((clinic) => {
              const cId = clinic.id as string;
              const isExpanded = expandedClinic === cId;
              const isLoading = loadingDetails === cId;
              const details = clinicDetails[cId];
              const autoR = clinic.auto_recharge as boolean;
              const topup = topupAmount[cId] || "";

              return (
                <div key={cId}>
                  {/* Clinic Row */}
                  <div className="px-5 py-4 hover:bg-white/2 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Clinic Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-semibold text-white truncate">{clinic.name as string || "Unnamed"}</p>
                          <StatusPill status={clinic.subscription_status as string} />
                          {autoR && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full">
                              Auto-Recharge ON
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                          <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{clinic.email as string}</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{clinic.assigned_number as string || "No number"}</span>
                          <span className="flex items-center gap-1"><Wallet className="w-3 h-3 text-[#c0c1ff]" />
                            <span className="text-[#c0c1ff] font-semibold">
                              {clinic.currency as string || "₹"} {parseFloat(clinic.wallet_balance as string || "0").toFixed(2)}
                            </span>
                          </span>
                          <span>{clinic.monthly_minutes_used as number || 0}/{clinic.monthly_minutes_limit as number || 500} min</span>
                        </div>
                      </div>

                      {/* Right: Quick Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {/* Wallet top-up */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            placeholder="₹ amt"
                            value={topup}
                            onChange={(e) => setTopupAmount((p) => ({ ...p, [cId]: e.target.value }))}
                            className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#c0c1ff]/40 text-center"
                          />
                          <button
                            onClick={() => topup && doAction(
                              () => adminTopupWallet(cId, parseFloat(topup), clinic.currency as string || "INR"),
                              `Wallet topped up by ${clinic.currency || "₹"}${topup}`
                            )}
                            disabled={!topup || isPending}
                            className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/15 transition-colors disabled:opacity-40"
                            title="Top up wallet"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Force Activate */}
                        <button
                          onClick={() => doAction(() => adminActivateClinic(cId), `${clinic.name} activated!`)}
                          disabled={isPending || clinic.subscription_status === "active"}
                          className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/15 transition-colors disabled:opacity-30"
                          title="Force Activate subscription"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>

                        {/* Grant Trial */}
                        <button
                          onClick={() => doAction(() => adminGrantTrial(cId, 7), `7-day trial granted to ${clinic.name}`)}
                          disabled={isPending || clinic.subscription_status === "trial"}
                          className="p-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/15 transition-colors disabled:opacity-30"
                          title="Grant 7-day trial"
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Auto-Recharge */}
                        <button
                          onClick={() => doAction(
                            () => adminToggleAutoRecharge(cId, !autoR),
                            `Auto-recharge ${!autoR ? "enabled" : "disabled"}`
                          )}
                          disabled={isPending}
                          className="p-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                          title={`Toggle auto-recharge (currently ${autoR ? "ON" : "OFF"})`}
                        >
                          {autoR
                            ? <ToggleRight className="w-4 h-4 text-yellow-400" />
                            : <ToggleLeft className="w-4 h-4 text-zinc-500" />
                          }
                        </button>

                        {/* Cancel Subscription */}
                        <button
                          onClick={() => { if (confirm(`Cancel subscription for ${clinic.name}?`)) doAction(() => adminCancelSubscription(cId), "Subscription cancelled"); }}
                          disabled={isPending || !["active", "cancelling", "trial"].includes(clinic.subscription_status as string)}
                          className="p-1.5 bg-red-500/5 border border-red-500/15 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-30"
                          title="Cancel subscription"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>

                        {/* Expand Details */}
                        <button
                          onClick={() => toggleExpand(cId)}
                          className="p-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                            : isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                            : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && details && (
                    <div className="px-5 pb-5 bg-black/20 border-t border-white/5">
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {/* Numbers */}
                        <div>
                          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Phone Numbers</h4>
                          {details.numbers.length === 0 ? (
                            <p className="text-xs text-zinc-600 italic">No numbers assigned</p>
                          ) : (
                            (details.numbers as Record<string, unknown>[]).map((n, i) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-white/3 rounded-lg mb-1.5 text-xs">
                                <span className="text-zinc-300 font-mono">{n.number as string}</span>
                                <StatusPill status={n.status as string} />
                              </div>
                            ))
                          )}
                        </div>
                        {/* Transactions */}
                        <div>
                          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Last Transactions</h4>
                          {details.txns.length === 0 ? (
                            <p className="text-xs text-zinc-600 italic">No transactions</p>
                          ) : (
                            (details.txns as Record<string, unknown>[]).slice(0, 5).map((t, i) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-white/3 rounded-lg mb-1.5 text-xs">
                                <div>
                                  <p className="text-zinc-300 truncate max-w-[180px]">{t.description as string}</p>
                                  <p className="text-zinc-600 text-[10px]">{t.type as string}</p>
                                </div>
                                <div className="text-right">
                                  <p className={`font-semibold ${["wallet_deduction","admin_deduction"].includes(t.type as string) ? "text-red-400" : "text-emerald-400"}`}>
                                    {["wallet_deduction","admin_deduction"].includes(t.type as string) ? "-" : "+"}
                                    {t.currency as string} {parseFloat(t.amount as string || "0").toFixed(2)}
                                  </p>
                                  <StatusPill status={t.status as string} />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Raw clinic JSON */}
                      <details className="mt-4">
                        <summary className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 uppercase tracking-wider">Raw Clinic Data</summary>
                        <pre className="mt-2 p-3 bg-black/40 border border-white/5 rounded-xl text-[9px] text-zinc-500 overflow-x-auto leading-relaxed">
                          {JSON.stringify(clinic, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-zinc-700 pb-6">
          Admin Console • All activity is logged • Restricted access
        </p>
      </div>
    </div>
  );
}
