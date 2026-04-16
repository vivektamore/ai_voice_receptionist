"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { 
    CheckCircle2, Loader2, Sparkles, Phone, Server, ShieldCheck, 
    ArrowRight, AlertCircle, RefreshCw, XCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS_CONFIG: Record<string, string> = {
    "purchase": "Securing Telephony Spans...",
    "sip_trunk": "Connecting SIP Registry...",
    "livekit_rule": "Handshaking AI Protocols...",
    "db_assign": "Finalizing Clinical Identity...",
    "success": "Onboarding Complete."
};

export default function SetupState() {
    const router = useRouter();
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pollTimeout, setPollTimeout] = useState(false);
    const [pollCount, setPollCount] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        let timeoutHandle: NodeJS.Timeout;
        let internalPollCount = 0;
        const MAX_POLLS = 40; // 40 * 1.5s = 60 seconds max

        const pollJobStatus = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                // 1. Resolve Auth UUID to Clinic UUID
                const { data: clinic } = await supabase
                    .from("clinics")
                    .select("id")
                    .eq("user_id", session.user.id)
                    .single();

                if (!clinic) return;

                // 2. Fetch the absolute latest provisioning job using the Clinic ID
                const { data, error: dbError } = await supabase
                    .from("provisioning_jobs")
                    .select("*")
                    .eq("user_id", clinic.id) // Use clinic.id, not session.user.id
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                internalPollCount++;
                setPollCount(internalPollCount);

                if (dbError || !data) {
                    console.log(`Waiting for job creation... (poll ${internalPollCount}/${MAX_POLLS})`);
                    // Stop if we've exceeded max polls
                    if (internalPollCount >= MAX_POLLS) {
                        clearInterval(interval);
                        setPollTimeout(true);
                        setLoading(false);
                    }
                    return;
                }

                setJob(data);
                setLoading(false);

                if (data.status === "success") {
                    clearInterval(interval);
                } else if (data.status === "failed") {
                    setError(data.error_message || "Critical error during telephony provisioning.");
                    clearInterval(interval);
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        };

        // Poll every 1.5 seconds
        interval = setInterval(pollJobStatus, 1500);
        pollJobStatus();

        return () => clearInterval(interval);
    }, []);

    const renderStep = (stepKey: string, currentStep: string, status: string) => {
        const stepKeys = Object.keys(STEPS_CONFIG);
        const currentIndex = stepKeys.indexOf(currentStep);
        const targetIndex = stepKeys.indexOf(stepKey);
        
        const isCompleted = status === "success" || targetIndex < currentIndex;
        const isCurrent = status !== "success" && status !== "failed" && targetIndex === currentIndex;
        const isFailed = status === "failed" && targetIndex === currentIndex;

        return (
            <div className="flex items-center gap-4 py-4 px-2 relative">
                <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500",
                    isCompleted ? "bg-[#10b981]/20 text-emerald-400" :
                    isCurrent ? "bg-[#a3a6ff]/20 text-[#a3a6ff] animate-pulse" :
                    isFailed ? "bg-red-500/20 text-red-500" :
                    "bg-[#262528] text-[#48474a]"
                )}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : 
                     isCurrent ? <Loader2 className="w-5 h-5 animate-spin" /> :
                     isFailed ? <XCircle className="w-5 h-5" /> :
                     <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>
                <div className="flex flex-col">
                    <p className={cn(
                        "text-sm font-bold tracking-tight transition-colors duration-500",
                        isCompleted ? "text-emerald-400" :
                        isCurrent ? "text-[#f9f5f8]" :
                        isFailed ? "text-red-500" :
                        "text-[#adaaad]"
                    )}>
                        {STEPS_CONFIG[stepKey]}
                    </p>
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="w-10 h-10 text-[#a3a6ff] animate-spin mb-6" />
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-[#adaaad] animate-pulse">Initializing Setup Observer...</p>
            {pollCount > 5 && (
                <p className="text-[9px] text-[#48474a] mt-3">
                    Waiting for provisioning job... ({pollCount}s)
                </p>
            )}
        </div>
    );

    if (pollTimeout) return (
        <div className="flex flex-col items-center justify-center py-40 gap-6 max-w-md mx-auto text-center px-6">
            <AlertCircle className="w-12 h-12 text-amber-400" />
            <div>
                <h2 className="text-xl font-black text-white mb-2">Provisioning Job Not Found</h2>
                <p className="text-sm text-[#adaaad] leading-relaxed">
                    The backend did not create a provisioning job. This usually means the payment webhook failed or the <code className="text-amber-400 bg-white/5 px-1 rounded">provisioning_jobs</code> table is missing in Supabase.
                </p>
            </div>
            <div className="flex flex-col gap-3 w-full">
                <button
                    onClick={() => window.location.reload()}
                    className="w-full py-3 rounded-xl bg-[#a3a6ff]/20 border border-[#a3a6ff]/30 text-[#a3a6ff] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#a3a6ff]/30 transition-all"
                >
                    <RefreshCw className="w-4 h-4" /> Retry Polling
                </button>
                <button
                    onClick={() => router.push("/onboarding/payment")}
                    className="w-full py-3 rounded-xl bg-white/5 border border-white/5 text-[#adaaad] font-black text-xs uppercase tracking-widest hover:text-white transition-colors"
                >
                    ← Go Back to Payment
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col items-center w-full px-6 max-w-2xl mx-auto">
            <section className="text-center space-y-3 mb-12 w-full">
                <h1 className="text-4xl font-extrabold tracking-tight text-[#f9f5f8] font-['Plus_Jakarta_Sans']">Building Your Intelligence</h1>
                <p className="text-[#adaaad] text-sm">Please stay on this page. We are handshaking with satellite telephony spans.</p>
            </section>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-8 flex flex-col gap-6 relative overflow-hidden"
            >
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#a3a6ff]/5 blur-2xl rounded-full" />
                
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-[#a3a6ff] font-extrabold text-xs uppercase tracking-widest bg-[#a3a6ff]/10 px-3 py-1 rounded-full">Step 05</span>
                        <h2 className="text-xl font-bold text-[#f9f5f8]">Auto-Configuration Engine</h2>
                    </div>
                    {job?.status !== "success" && job?.status !== "failed" && (
                        <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg">
                            <span className="text-[9px] font-black uppercase text-[#a3a6ff] animate-pulse">Live Polling</span>
                        </div>
                    )}
                </div>

                {/* The Checklist */}
                <div className="flex flex-col divide-y divide-white/5">
                    {renderStep("purchase", job?.step, job?.status)}
                    {renderStep("sip_trunk", job?.step, job?.status)}
                    {renderStep("livekit_rule", job?.step, job?.status)}
                    {renderStep("db_assign", job?.step, job?.status)}
                </div>

                <div className="w-full h-px bg-[#48474a]/30 mt-4" />

                <AnimatePresence mode="wait">
                    {job?.status === "success" ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6 text-center pt-4"
                        >
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl flex flex-col items-center gap-3">
                                <Sparkles className="w-8 h-8 text-emerald-400" />
                                <h3 className="text-xl font-black text-white">System Activated</h3>
                                <p className="text-xs text-[#adaaad] leading-relaxed">Your AI Voice Agent is now live on <span className="text-emerald-400 font-bold">{job?.number}</span>.</p>
                            </div>

                            <button 
                                onClick={() => router.push("/dashboard")}
                                className="w-full py-5 rounded-2xl bg-[#f9f5f8] text-[#000000] font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-3 group"
                            >
                                Enter Control Center
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    ) : job?.status === "failed" ? (
                        <motion.div
                            key="failed"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex flex-col items-center gap-4 text-center"
                        >
                            <AlertCircle className="w-8 h-8 text-red-500" />
                            <div>
                                <h3 className="text-lg font-black text-white">Provisioning Exception</h3>
                                <p className="text-xs text-red-400/80 mt-1">{error}</p>
                            </div>
                            <button 
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" /> Retry Handshake
                            </button>
                        </motion.div>
                    ) : (
                        <div className="text-center pt-4">
                            <p className="text-[10px] text-[#adaaad] italic opacity-60">Estimated time remaining: 10–20 seconds</p>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
