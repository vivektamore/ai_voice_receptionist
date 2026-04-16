"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { Stethoscope, Activity, FilePlus, ChevronRight, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CLINIC_TYPES = [
    { id: "dental", name: "Dental Clinics", icon: Stethoscope, subtitle: "Full appointment management for surgeries." },
    { id: "general", name: "General Practice", icon: Activity, subtitle: "Triage and reception for high-volume GPs." },
    { id: "chiro", name: "Chiropractic", icon: FilePlus, subtitle: "Specialized flow for wellness centers." }
];

export default function ClinicSelection() {
    const router = useRouter();
    const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
    const [detectedCountry, setDetectedCountry] = useState<string>("US");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-detect country on mount
    useState(() => {
        const detect = async () => {
            try {
                // Try IP API first
                const res = await fetch('https://ipapi.co/json/');
                const geo = await res.json();
                if (geo.country_code) {
                    setDetectedCountry(geo.country_code);
                    return;
                }
            } catch (e) {
                console.warn("IP detection failed, trying timezone...");
            }
            
            // Fallback: Guess by Timezone
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (tz.includes("Kolkata") || tz.includes("India")) setDetectedCountry("IN");
            else if (tz.includes("London")) setDetectedCountry("GB");
            else if (tz.includes("Sydney") || tz.includes("Australia")) setDetectedCountry("AU");
            else if (tz.includes("Toronto") || tz.includes("Canada")) setDetectedCountry("CA");
        };
        detect();
    });

    const handleNext = async () => {
        if (!selectedClinic) return;
        setLoading(true);
        setError(null);

        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                attempts++;
                console.log(`Clinic upsert attempt ${attempts} of ${maxAttempts}...`);

                // 1. Re-fetch user to ensure we are current
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                
                if (authError || !user) {
                    await supabase.auth.signOut();
                    throw new Error("Session expired. Please log in again.");
                }

                // 2. Perform the upsert with Retry-aware logic
                const { error: dbError } = await supabase
                    .from("clinics")
                    .upsert({ 
                        user_id: user.id, 
                        email: user.email,
                        name: "My New Clinic",
                        clinic_type: selectedClinic,
                        country_code: detectedCountry,
                        onboarding_step: "agent" 
                    }, { onConflict: "user_id" });

                if (dbError) {
                    // Specific check for Foreign Key constraint errors which are common in new magic link signups
                    if (dbError.message?.includes("foreign key constraint") && attempts < maxAttempts) {
                        console.warn(`FK constraint error on attempt ${attempts}. Retrying in 1s...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue; // try again
                    }
                    throw dbError; // throw other errors or if we've exhausted attempts
                }

                // Success! Redirect to next step
                router.push("/onboarding/agent");
                break; // break out of while loop

            } catch (error: any) {
                console.error(`Clinic selection error (Attempt ${attempts}):`, error.message || error);
                
                if (attempts === maxAttempts) {
                    setError(error.message || "Failed to save selection. High database load, please try again.");
                    
                    if (error.message?.includes("foreign key constraint") || error.message?.toLowerCase().includes("session")) {
                        await supabase.auth.signOut();
                        window.location.href = "/login";
                    }
                } else {
                    // General retry delay for non-FK errors if we have attempts left
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center w-full px-6 max-w-2xl mx-auto">
            
            <section className="text-center space-y-3 mb-10 w-full">
                <h1 className="text-4xl font-extrabold tracking-tight text-[#f9f5f8] font-['Plus_Jakarta_Sans']">Zero-to-Live</h1>
                <p className="text-[#adaaad] text-sm">Deploy your clinical voice intelligence in under 3 minutes.</p>
            </section>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-8 flex flex-col gap-8"
            >
                <div className="flex items-center gap-3">
                    <span className="text-[#a3a6ff] font-extrabold text-xs uppercase tracking-widest bg-[#a3a6ff]/10 px-3 py-1 rounded-full">Step 01</span>
                    <h2 className="text-xl font-bold text-[#f9f5f8]">Practice Specialization</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 w-full">
                    {CLINIC_TYPES.map((clinic) => {
                        const isSelected = selectedClinic === clinic.id;
                        return (
                            <button 
                                key={clinic.id}
                                onClick={() => setSelectedClinic(clinic.id)}
                                className={cn(
                                    "flex items-center justify-between p-6 rounded-2xl border transition-all duration-300 group text-left",
                                    isSelected 
                                        ? "bg-gradient-to-br from-[#a3a6ff] to-[#6063ee] border-transparent shadow-[0_0_30px_rgba(163,166,255,0.2)] text-[#000000]"
                                        : "bg-[#262528] border-[#48474a]/30 hover:border-[#a3a6ff]/30 text-[#f9f5f8]"
                                )}
                            >
                                <div className="flex items-center gap-5">
                                    <div className={cn(
                                        "p-4 rounded-xl transition-colors",
                                        isSelected ? "bg-white/20 text-[#000000]" : "bg-[#131315] text-[#a3a6ff] group-hover:bg-[#a3a6ff]/20"
                                    )}>
                                        <clinic.icon className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <p className="font-extrabold text-lg">{clinic.name}</p>
                                        <p className={cn("text-xs mt-0.5", isSelected ? "text-[#000000]/60" : "text-[#adaaad]")}>{clinic.subtitle}</p>
                                    </div>
                                </div>
                                {isSelected ? (
                                    <CheckCircle2 className="w-6 h-6" />
                                ) : (
                                    <ChevronRight className="w-6 h-6 text-[#adaaad] group-hover:text-[#a3a6ff] group-hover:translate-x-1 transition-all" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold leading-tight">
                        {error}
                    </div>
                )}

                <div className="w-full h-px bg-[#48474a]/30" />

                <button 
                    disabled={!selectedClinic || loading}
                    onClick={handleNext}
                    className="w-full py-4 rounded-2xl bg-gradient-to-br from-[#a3a6ff] to-[#6063ee] text-[#000000] font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#a3a6ff]/20 flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-[#000000]/20 border-t-[#000000] rounded-full animate-spin" />
                    ) : (
                        <>Next Selection <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                    )}
                </button>
            </motion.div>
        </div>
    );
}
