"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
    { id: "clinic", label: "Clinic", path: "/onboarding/clinic" },
    { id: "agent", label: "AI Agent", path: "/onboarding/agent" },
    { id: "number", label: "Telephony", path: "/onboarding/number" },
    { id: "payment", label: "Payment", path: "/onboarding/payment" },
    { id: "setup", label: "Setup", path: "/onboarding/setup" }
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState<string>("clinic");

    useEffect(() => {
        let attempts = 0;
        const checkAuth = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                
                if (currentSession) {
                    console.log("Session hydrated! (onboarding/layout.tsx)");
                    setUser(currentSession.user);
                    
                    const { data } = await supabase
                        .from("clinics")
                        .select("onboarding_step")
                        .eq("user_id", currentSession.user.id)
                        .single();

                    if (data?.onboarding_step) {
                        setCurrentStep(data.onboarding_step);
                    }
                } else if (attempts < 3) {
                    attempts++;
                    console.warn(`No session on mount (Attempt ${attempts}/3). Retrying in 500ms... (onboarding/layout.tsx)`);
                    setTimeout(checkAuth, 500);
                    return; 
                } else {
                    console.error("Max auth retries reached. Redirecting to login.");
                    router.push("/login?error=Session initialization failed");
                    return;
                }
            } catch (err) {
                console.error("Onboarding Session Check Error:", err);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [pathname, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#a3a6ff]/20 border-t-[#a3a6ff] rounded-full animate-spin" />
                    <p className="text-[#adaaad] font-medium animate-pulse">Initializing Secure Session...</p>
                </div>
            </div>
        );
    }

    const activeStepIndex = STEPS.findIndex(s => pathname.includes(s.path)) + 1;

    return (
        <div className="min-h-screen bg-[#0e0e10] text-[#f9f5f8] font-['Inter'] selection:bg-[#a3a6ff]/30 flex flex-col items-center">
            
            {/* Shared Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#0e0e10]/80 backdrop-blur-md border-b border-white/5">
                <div className="flex justify-between items-center w-full px-8 py-6 max-w-5xl mx-auto">
                    <div className="flex items-center gap-3">
                        <motion.div 
                            initial={{ rotate: -180, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            className="text-[#a3a6ff]"
                        >
                            <Sparkles className="w-6 h-6" />
                        </motion.div>
                        <span className="text-xl font-bold tracking-tighter text-[#a3a6ff] font-['Plus_Jakarta_Sans']">Receptionist AI</span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-4">
                        {STEPS.map((s, idx) => {
                            const isPast = idx + 1 < activeStepIndex;
                            const isCurrent = idx + 1 === activeStepIndex;
                            return (
                                <div key={s.id} className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full transition-all duration-500",
                                        isCurrent ? "bg-[#a3a6ff] scale-125 shadow-[0_0_10px_rgba(163,166,255,0.5)]" : 
                                        isPast ? "bg-emerald-500" : "bg-[#48474a]/50"
                                    )} />
                                    <span className={cn(
                                        "text-[10px] uppercase font-bold tracking-widest transition-colors",
                                        isCurrent ? "text-[#f9f5f8]" : "text-[#adaaad]"
                                    )}>
                                        {s.label}
                                    </span>
                                    {idx !== STEPS.length - 1 && (
                                        <div className="w-4 h-px bg-[#48474a]/30 mx-1" />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#19191c] border border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#a3a6ff]">
                                Step {activeStepIndex || 1} / 5
                            </span>
                        </div>
                        
                        <button 
                            onClick={async () => {
                                const { logout } = await import("../login/actions");
                                await logout();
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-[#adaaad] hover:text-white transition-colors"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex flex-col items-center justify-center w-full pt-20">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-[-1]">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#a3a6ff]/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px]" />
            </div>
        </div>
    );
}
