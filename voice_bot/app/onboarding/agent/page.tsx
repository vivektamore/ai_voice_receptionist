"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { Mic, Globe, MessageSquare, ArrowRight, PlayCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const VOICES = [
    { id: "elena", name: "Elena", subtitle: "Warm & Empathetic", color: "from-[#ff9dd1] to-[#eb7bba]", textClass: "text-[#6c0f4d]" },
    { id: "marcus", name: "Marcus", subtitle: "Clinical & Precise", color: "from-[#a3a6ff] to-[#6063ee]", textClass: "text-[#000000]" }
];

const LANGUAGES = [
    { id: "English", label: "English (US)" },
    { id: "Hindi", label: "Hindi (Indian)" },
    { id: "Hinglish", label: "Hinglish (Hybrid)" }
];

const TONES = [
    { id: "Friendly", label: "Friendly & Casual" },
    { id: "Professional", label: "Formal & Professional" },
    { id: "Urgent", label: "Direct & Fast" }
];

export default function AgentConfiguration() {
    const router = useRouter();
    const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
    const [selectedLang, setSelectedLang] = useState<string>("English");
    const [selectedTone, setSelectedTone] = useState<string>("Professional");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleNext = async () => {
        if (!selectedVoice) return;
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError("Session expired. Redirecting...");
                router.push("/login?redirect=/onboarding/agent");
                return;
            }

            // 1. Fetch clinic_id
            const { data: clinicData } = await supabase
                .from("clinics")
                .select("id")
                .eq("user_id", session.user.id)
                .single();

            if (!clinicData) throw new Error("Clinic not found");

            // 2. Upsert Agent Settings (Unified Source of Truth)
            // Note: We use the 'agent_settings' table as defined in our backend route
            const upsertData: any = { 
                clinic_id: clinicData.id, 
                voice: selectedVoice,
                language: selectedLang,
                prompt: `You are a professional clinical receptionist. Tone: ${selectedTone}. Language: ${selectedLang}.`
            };
            
            // Add tone only if selected to be safe with DB schema cache
            if (selectedTone) {
                upsertData.tone = selectedTone;
            }

            const { error: agentError } = await supabase
                .from("agent_settings")
                .upsert(upsertData, { onConflict: "clinic_id" });

            if (agentError) {
                // FALLBACK: If 'tone' column is still not recognized by schema cache, try without it
                if (agentError.message?.includes("column \"tone\" of relation \"agent_settings\" does not exist") || 
                    agentError.message?.includes("Could not find the 'tone' column")) {
                    console.warn("Retrying upsert without 'tone' column due to schema cache delay...");
                    delete upsertData.tone;
                    const { error: retryError } = await supabase
                        .from("agent_settings")
                        .upsert(upsertData, { onConflict: "clinic_id" });
                    if (retryError) throw retryError;
                } else {
                    throw agentError;
                }
            }

            // 3. Update Onboarding Step
            await supabase
                .from("clinics")
                .update({ onboarding_step: "number" })
                .eq("id", clinicData.id);

            router.push("/onboarding/number");
        } catch (error: any) {
            console.error("Failed to save agent config:", error);
            setError(error.message || "Failed to save configuration. Please try again.");
            if (error.message?.includes("session")) {
                router.push("/login?redirect=/onboarding/agent");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center w-full px-6 max-w-2xl mx-auto">
            
            <section className="text-center space-y-3 mb-10 w-full">
                <h1 className="text-4xl font-extrabold tracking-tight text-[#f9f5f8] font-['Plus_Jakarta_Sans']">Voice Personality</h1>
                <p className="text-[#adaaad] text-sm">Fine-tune the intelligence that handles your patient calls.</p>
            </section>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-8 flex flex-col gap-10"
            >
                {/* Step Header */}
                <div className="flex items-center gap-3">
                    <span className="text-[#a3a6ff] font-extrabold text-xs uppercase tracking-widest bg-[#a3a6ff]/10 px-3 py-1 rounded-full">Step 02</span>
                    <h2 className="text-xl font-bold text-[#f9f5f8]">Agent Core Identity</h2>
                </div>

                {/* Voice Selection */}
                <div className="space-y-4">
                    <label className="text-[10px] uppercase font-black tracking-widest text-[#adaaad] ml-1 flex items-center gap-2">
                        <Mic className="w-3 h-3" /> Select Voice Interface
                    </label>
                    <div className="grid grid-cols-2 gap-6">
                        {VOICES.map((voice) => {
                            const isSelected = selectedVoice === voice.id;
                            return (
                                <button 
                                    key={voice.id}
                                    onClick={() => setSelectedVoice(voice.id)}
                                    className={cn(
                                        "relative cursor-pointer overflow-hidden rounded-2xl border p-6 flex flex-col items-center gap-4 transition-all duration-300",
                                        isSelected 
                                            ? `bg-gradient-to-br ${voice.color} border-transparent shadow-[0_0_40px_rgba(163,166,255,0.15)]`
                                            : "bg-[#262528] border-[#48474a]/30 hover:border-[#a3a6ff]/30 text-[#f9f5f8] group"
                                    )}
                                >
                                    <div className="w-20 h-20 rounded-full bg-[#131315] overflow-hidden relative border-4 border-black/10">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                        <div className="w-full h-full bg-white/5 absolute inset-0 flex flex-col justify-end pb-3 items-center z-20 group-hover:bg-black/40 transition-colors">
                                            <PlayCircle className={cn("w-8 h-8 opacity-0 transition-opacity", isSelected ? "opacity-100 text-white" : "group-hover:opacity-100 text-white")} />
                                        </div>
                                    </div>
                                    <div className={cn("text-center", isSelected ? voice.textClass : "")}>
                                        <p className="font-bold text-lg mb-0">{voice.name}</p>
                                        <p className={cn("text-[9px] uppercase font-black tracking-widest", isSelected ? "opacity-80" : "text-[#adaaad]")}>{voice.subtitle}</p>
                                    </div>
                                    {isSelected && <CheckCircle2 className={cn("w-5 h-5 absolute top-4 right-4", voice.textClass)} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Language & Tone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[10px] uppercase font-black tracking-widest text-[#adaaad] ml-1 flex items-center gap-2">
                            <Globe className="w-3 h-3" /> Dialect
                        </label>
                        <select 
                            value={selectedLang}
                            onChange={(e) => setSelectedLang(e.target.value)}
                            className="w-full bg-[#262528] border border-[#48474a]/30 rounded-xl px-5 py-4 text-[#f9f5f8] font-bold focus:outline-none focus:ring-2 focus:ring-[#a3a6ff]/50 transition-all cursor-pointer"
                        >
                            {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] uppercase font-black tracking-widest text-[#adaaad] ml-1 flex items-center gap-2">
                            <MessageSquare className="w-3 h-3" /> Communication Tone
                        </label>
                        <select 
                            value={selectedTone}
                            onChange={(e) => setSelectedTone(e.target.value)}
                            className="w-full bg-[#262528] border border-[#48474a]/30 rounded-xl px-5 py-4 text-[#f9f5f8] font-bold focus:outline-none focus:ring-2 focus:ring-[#a3a6ff]/50 transition-all cursor-pointer"
                        >
                            {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold leading-tight">
                        {error}
                    </div>
                )}

                <div className="w-full h-px bg-[#48474a]/30" />

                <button 
                    disabled={!selectedVoice || loading}
                    onClick={handleNext}
                    className="w-full py-4 rounded-2xl bg-gradient-to-br from-[#a3a6ff] to-[#6063ee] text-[#000000] font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#a3a6ff]/20 flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-[#000000]/20 border-t-[#000000] rounded-full animate-spin" />
                    ) : (
                        <>Save Intelligence <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                    )}
                </button>
            </motion.div>
        </div>
    );
}
