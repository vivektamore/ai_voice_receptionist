"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Phone, Plus, Check, Loader2, ShieldCheck,
    Zap, Globe, ChevronRight, AlertCircle
} from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const CLINIC_ID = "8a3bf5ea-57e9-482b-adb8-e340181ef86e";

const providers = [
    {
        id: "vobiz",
        name: "Vobiz",
        flag: "🇮🇳",
        desc: "Best for India — local numbers, low cost",
        badge: "Recommended",
        badgeColor: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
        priceHint: "₹299/month",
        features: ["Indian numbers", "Low latency", "SIP ready"],
    },
    {
        id: "telnyx",
        name: "Telnyx",
        flag: "🇺🇸",
        desc: "Best for US/global numbers",
        badge: "Global",
        badgeColor: "bg-primary/15 text-primary border-primary/30",
        priceHint: "$1.50/month",
        features: ["US numbers", "High quality", "Programmable SIP"],
    },
    {
        id: "twilio",
        name: "Twilio",
        flag: "🌐",
        desc: "Global coverage, enterprise-grade",
        badge: "Enterprise",
        badgeColor: "bg-secondary/15 text-secondary border-secondary/30",
        priceHint: "$1.15/month",
        features: ["100+ countries", "Redundant", "Widely supported"],
    },
];

type Status = "idle" | "loading" | "success" | "error";

export default function PhoneNumbersPage() {
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [areaCode, setAreaCode] = useState("");
    const [status, setStatus] = useState<Status>("idle");
    const [result, setResult] = useState<{ number?: string; message?: string } | null>(null);

    // Simulated existing numbers — in production fetch from Supabase
    const existingNumbers = [
        { number: "+918856926700", provider: "Vobiz", status: "Active", calls: 42 },
    ];

    const handlePurchase = async () => {
        if (!selectedProvider) return;
        setStatus("loading");
        setResult(null);

        try {
            const res = await fetch(`${BACKEND_URL}/api/v1/payments/purchase-number`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clinic_id: CLINIC_ID,
                    provider: selectedProvider,
                    area_code: areaCode || "91",
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setStatus("success");
                setResult({ number: data.phone_number, message: data.message });
            } else {
                throw new Error(data.detail || "Purchase failed");
            }
        } catch (e: unknown) {
            setStatus("error");
            setResult({ message: e instanceof Error ? e.message : "Unknown error" });
        }
    };

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold font-[family-name:var(--font-outfit)] tracking-tight">
                    Phone Numbers
                </h1>
                <p className="text-foreground/60 mt-1">
                    Buy a number from your preferred provider — it will be auto-configured for your AI agent.
                </p>
            </div>

            {/* Existing numbers */}
            {existingNumbers.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6"
                >
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                        <Phone size={16} className="text-primary" /> Your Numbers
                    </h2>
                    <div className="space-y-3">
                        {existingNumbers.map(n => (
                            <div key={n.number} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Phone size={15} className="text-primary" />
                                    </div>
                                    <div>
                                        <div className="font-mono font-semibold text-sm">{n.number}</div>
                                        <div className="text-xs text-foreground/40 mt-0.5">{n.provider} · {n.calls} calls</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                                        {n.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Step 1: Choose Provider */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass-card p-6"
            >
                <h2 className="font-semibold mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">1</span>
                    Choose Provider
                </h2>
                <div className="space-y-3">
                    {providers.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedProvider(p.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${selectedProvider === p.id
                                ? "border-primary/60 bg-primary/8 shadow-[0_0_20px_rgba(14,165,233,0.12)]"
                                : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"}`}
                        >
                            <div className="text-2xl">{p.flag}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{p.name}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.badgeColor}`}>
                                        {p.badge}
                                    </span>
                                </div>
                                <p className="text-xs text-foreground/50 mt-0.5">{p.desc}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    {p.features.map(f => (
                                        <span key={f} className="flex items-center gap-1 text-[11px] text-foreground/40">
                                            <Check size={10} className="text-emerald-400" /> {f}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="text-sm font-semibold text-primary">{p.priceHint}</div>
                                <div className="text-xs text-foreground/30">per number</div>
                            </div>
                            {selectedProvider === p.id && (
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                    <Check size={11} className="text-white" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Step 2: Area Code */}
            <AnimatePresence>
                {selectedProvider && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="glass-card p-6"
                    >
                        <h2 className="font-semibold mb-5 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">2</span>
                            Area Code / Country Code
                        </h2>
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 max-w-xs">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 text-sm">+</span>
                                <input
                                    type="text"
                                    value={areaCode}
                                    onChange={e => setAreaCode(e.target.value.replace(/\D/g, ""))}
                                    placeholder={selectedProvider === "vobiz" ? "91 (India)" : "1 (US/Canada)"}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-foreground/30"
                                />
                            </div>
                            <div className="text-xs text-foreground/40">
                                {selectedProvider === "vobiz" ? "Leave blank for India default" : "Leave blank for provider default"}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Step 3: Purchase */}
            <AnimatePresence>
                {selectedProvider && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="glass-card p-6"
                    >
                        <h2 className="font-semibold mb-5 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">3</span>
                            Purchase & Auto-Configure
                        </h2>

                        <div className="bg-white/3 rounded-xl p-4 mb-5 border border-white/5">
                            <div className="flex items-center gap-2 text-sm text-foreground/60">
                                <ShieldCheck size={15} className="text-emerald-400" />
                                After purchase, the number is automatically configured with your LiveKit SIP trunk — no manual setup needed.
                            </div>
                        </div>

                        {status === "success" && result && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mb-4 p-4 rounded-xl bg-emerald-400/10 border border-emerald-400/30 flex items-center gap-3"
                            >
                                <Check size={20} className="text-emerald-400 flex-shrink-0" />
                                <div>
                                    <div className="font-semibold text-emerald-400">Number purchased!</div>
                                    <div className="text-sm text-foreground/60 mt-0.5 font-mono">{result.number}</div>
                                </div>
                            </motion.div>
                        )}

                        {status === "error" && result && (
                            <div className="mb-4 p-4 rounded-xl bg-red-400/10 border border-red-400/30 flex items-center gap-3">
                                <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
                                <div className="text-sm text-red-400">{result.message}</div>
                            </div>
                        )}

                        <motion.button
                            onClick={handlePurchase}
                            disabled={status === "loading"}
                            whileTap={{ scale: 0.97 }}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm shadow-[0_0_20px_var(--primary-glow)] disabled:opacity-60 transition-all"
                        >
                            {status === "loading" ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Plus size={16} />
                            )}
                            {status === "loading" ? "Purchasing..." : `Buy Number via ${providers.find(p => p.id === selectedProvider)?.name}`}
                            {status !== "loading" && <ChevronRight size={14} />}
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
