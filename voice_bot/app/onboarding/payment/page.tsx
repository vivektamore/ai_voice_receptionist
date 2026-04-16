"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, Phone, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PaymentStep() {
    const router = useRouter();
    const [lockedNumber, setLockedNumber] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLockedNumber = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                // 1. Get the clinic UUID for this user
                const { data: clinicData, error: clinicErr } = await supabase
                    .from("clinics")
                    .select("id")
                    .eq("user_id", session.user.id)
                    .single();

                if (clinicErr || !clinicData) {
                    console.error("Could not fetch clinic profile:", clinicErr?.message);
                    setError("Could not find your clinic profile. Please go back to Step 1.");
                    setLoading(false);
                    return;
                }

                // 2. Query number_locks using the clinic UUID
                const { data, error } = await supabase
                    .from("number_locks")
                    .select("*")
                    .eq("user_id", clinicData.id)
                    .gte("expires_at", new Date().toISOString())
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (error || !data) {
                    setError("No active number lock found. Please go back and select a number.");
                } else {
                    setLockedNumber(data);
                }
            } catch (err: any) {
                console.error("Lock fetch exception:", err.message || err);
                setError("System synchronization error. Please refresh the page.");
            } finally {
                setLoading(false);
            }
        };

        fetchLockedNumber();
    }, []);

    const handleProvisioning = async () => {
        setProcessing(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            const { data: clinicData } = await supabase
                .from("clinics")
                .select("id")
                .eq("user_id", session.user.id)
                .single();

            if (!clinicData) throw new Error("Clinic session invalid. Please go back.");

            // Directly trigger the backend to purchase/provision the number (Free for first number)
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/payments/purchase-number`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clinic_id: clinicData.id,
                    phone_number: lockedNumber.number,
                    provider: lockedNumber.number.startsWith('+91') ? 'vobiz' : 'telnyx'
                })
            });

            if (!res.ok) {
                const orderError = await res.json();
                throw new Error(orderError.detail || "Failed to initialize provisioning pipeline");
            }

            // Success! The job was created in provisioning_jobs. Setup page will poll it.
            router.push("/onboarding/setup");

        } catch (err: any) {
            setError(err.message || "Network exception during provisioning. Please retry.");
            setProcessing(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#a3a6ff] animate-spin mb-4" />
            <p className="text-[#adaaad] font-medium animate-pulse uppercase text-[10px] tracking-widest">Securing Lock Context...</p>
        </div>
    );

    return (
        <div className="flex flex-col items-center w-full px-6 max-w-2xl mx-auto">
            <section className="text-center space-y-3 mb-10 w-full">
                <h1 className="text-4xl font-extrabold tracking-tight text-[#f9f5f8] font-['Plus_Jakarta_Sans']">Final Validation</h1>
                <p className="text-[#adaaad] text-sm">Review your acquisition and secure your clinical line.</p>
            </section>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-8 flex flex-col gap-8"
            >
                <div className="flex items-center gap-3">
                    <span className="text-[#a3a6ff] font-extrabold text-xs uppercase tracking-widest bg-[#a3a6ff]/10 px-3 py-1 rounded-full">Step 04</span>
                    <h2 className="text-xl font-bold text-[#f9f5f8]">Secure Your Number</h2>
                </div>

                {lockedNumber ? (
                    <>
                        {/* Summary Card */}
                        <div className="bg-[#131315] border border-white/5 rounded-2xl p-6 flex items-center justify-between group overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#a3a6ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="bg-[#a3a6ff]/10 p-3 rounded-xl border border-[#a3a6ff]/20">
                                    <Phone className="w-6 h-6 text-[#a3a6ff]" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-[#adaaad] mb-1">Locked Number</p>
                                    <p className="text-2xl font-black font-['JetBrains_Mono'] text-white tracking-tighter">{lockedNumber.number}</p>
                                </div>
                            </div>
                            <div className="text-right relative z-10">
                                <p className="text-[10px] uppercase font-black tracking-widest text-emerald-400 mb-1">Cost</p>
                                <p className="text-xl font-black text-white">Free<span className="text-xs font-normal text-[#adaaad]">/Included</span></p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-white">Instant Deployment</p>
                                    <p className="text-xs text-[#adaaad] leading-relaxed">Your first number acts as your AI Sandbox line. Provisioning begins immediately and securely links to your new dashboard.</p>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <p className="text-xs font-bold leading-relaxed">{error}</p>
                                </div>
                            )}
                        </div>

                        <div className="w-full h-px bg-[#48474a]/30" />

                        <button 
                            disabled={processing}
                            onClick={handleProvisioning}
                            className="w-full py-5 rounded-2xl bg-[#f9f5f8] text-[#000000] font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-3 group"
                        >
                            {processing ? (
                                <div className="w-5 h-5 border-2 border-[#000000]/20 border-t-[#000000] rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Launch Provisioning Sequence
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </>
                ) : (
                    <div className="bg-red-500/5 border border-red-500/20 p-8 rounded-2xl text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">Number Lock Expired</h3>
                        <p className="text-[#adaaad] text-xs leading-relaxed max-w-sm mb-6">
                            For security and availability reasons, phone numbers are only locked for 5 minutes during checkout. This lock has now expired.
                        </p>
                        <button
                            onClick={() => router.push("/onboarding/number")}
                            className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white transition-all uppercase tracking-widest font-black text-xs rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.3)] active:scale-95"
                        >
                            Return to Selection
                        </button>
                    </div>
                )}

                <p className="text-[10px] text-[#adaaad] text-center italic opacity-60">
                    Your first number is included in your plan. You will not be charged.
                </p>
            </motion.div>
        </div>
    );
}
