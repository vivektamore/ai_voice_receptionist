"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Search, Globe, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const COUNTRIES = [
    { code: "IN", name: "India", flag: "🇮🇳" },
    { code: "US", name: "United States", flag: "🇺🇸" },
    { code: "CA", name: "Canada", flag: "🇨🇦" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
    { code: "AU", name: "Australia", flag: "🇦🇺" }
];

interface PhoneNumber {
    number: string;
    price_monthly: number;
    provider: string;
}

export default function NumberSelection() {
    const router = useRouter();
    const [country, setCountry] = useState("IN");
    const [areaCode, setAreaCode] = useState("");
    const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
    const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [locking, setLocking] = useState(false);
    const [skipping, setSkipping] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [mode, setMode] = useState<"inventory" | "byo">("inventory");
    const [byoNumber, setByoNumber] = useState("");

    const handleBYOLock = async () => {
        if (!byoNumber || byoNumber.trim().length < 8) {
            setError("Please enter a valid phone number with country code (e.g. +91 98765 43210)");
            return;
        }
        setLocking(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session found. Please log in.");

            const { data: clinicData } = await supabase
                .from("clinics")
                .select("id")
                .eq("user_id", session.user.id)
                .single();

            if (!clinicData) throw new Error("Clinic profile not found.");

            const cleanNumber = byoNumber.replace(/[^\d\+]/g, "");
            const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL && !process.env.NEXT_PUBLIC_BACKEND_URL.includes("localhost"))
                ? process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")
                : "https://api.clinicassistai.online";

            const res = await fetch(`${baseUrl}/api/v1/payments/lock-number`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clinic_id: clinicData.id,
                    phone_number: cleanNumber,
                    country_code: country
                })
            });

            if (!res.ok) {
                const lockData = await res.json();
                throw new Error(lockData.detail || "Failed to register number.");
            }

            await supabase.from("clinics").update({ onboarding_step: "payment" }).eq("id", clinicData.id);
            router.push("/onboarding/payment");
        } catch (err: any) {
            setError(err.message || "Failed to register your number. Please retry.");
        } finally {
            setLocking(false);
        }
    };

    useEffect(() => {
        const fetchSavedCountry = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: clinic } = await supabase
                    .from("clinics")
                    .select("country_code")
                    .eq("user_id", user.id)
                    .single();
                if (clinic?.country_code) {
                    setCountry(clinic.country_code);
                }
            }
        };
        fetchSavedCountry();
    }, []);

    const fetchNumbers = async () => {
        setLoading(true);
        setError(null);
        try {
            const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL && !process.env.NEXT_PUBLIC_BACKEND_URL.includes("localhost"))
                ? process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")
                : "https://api.clinicassistai.online";
            const provider = country === "IN" ? "vobiz" : "telnyx";
            const res = await fetch(`${baseUrl}/api/v1/payments/available-numbers?country_code=${country}&area_code=${areaCode}&provider=${provider}`);
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.detail || "Failed to fetch numbers");
            }
            
            if (data.status === "success") {
                if (data.numbers && data.numbers.length > 0) {
                    setNumbers(data.numbers);
                } else {
                    setNumbers([]);
                    setError(data.message || `No numbers currently available for ${country}. Select another country or skip to dashboard.`);
                }
            } else {
                throw new Error(data.message || "Failed to fetch numbers");
            }
        } catch (err: any) {
            setError(err.message || "Unable to reach telephony provider. Please try again.");
            setNumbers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleLock = async () => {
        if (!selectedNumber) return;
        setLocking(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session found. Please log in.");

            // 1. Fetch clinic_id
            const { data: clinicData } = await supabase
                .from("clinics")
                .select("id")
                .eq("user_id", session.user.id)
                .single();

            if (!clinicData) throw new Error("Clinic profile not found. Please complete Step 1.");

            const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL && !process.env.NEXT_PUBLIC_BACKEND_URL.includes("localhost"))
                ? process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")
                : "https://api.clinicassistai.online";
            const res = await fetch(`${baseUrl}/api/v1/payments/lock-number`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clinic_id: clinicData.id,
                    phone_number: selectedNumber,
                    country_code: country
                })
            });

            const lockData = await res.json();
            
            if (!res.ok) {
                if (res.status === 409) {
                    setError("Someone else just locked this number. Please select another.");
                    fetchNumbers();
                    return;
                }
                throw new Error(lockData.detail || "Failed to secure number lock.");
            }

            if (lockData.status === "success") {
                // 3. Update Step
                await supabase.from("clinics").update({ onboarding_step: "payment" }).eq("id", clinicData.id);
                router.push("/onboarding/payment");
            } else {
                throw new Error("Lock failed");
            }
        } catch (err: any) {
            setError(err.message || "Failed to secure number lock. Please retry.");
        } finally {
            setLocking(false);
        }
    };

    const handleSkip = async () => {
        setSkipping(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session. Please log in again.");

            const { data: clinicData } = await supabase
                .from("clinics")
                .select("id")
                .eq("user_id", session.user.id)
                .single();

            if (!clinicData) throw new Error("Clinic not found. Please complete Step 1.");

            // Mark onboarding as completed WITHOUT assigning a number
            await supabase
                .from("clinics")
                .update({ onboarding_step: "completed" })
                .eq("id", clinicData.id);

            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Could not skip. Please try again.");
        } finally {
            setSkipping(false);
        }
    };

    return (
        <div className="flex flex-col items-center w-full px-6 max-w-3xl mx-auto">
            <section className="text-center space-y-3 mb-10 w-full">
                <h1 className="text-4xl font-extrabold tracking-tight text-[#f9f5f8] font-['Plus_Jakarta_Sans']">Telephony Interface</h1>
                <p className="text-[#adaaad] text-sm">Select your AI's physical phone number. Real-time availability.</p>
            </section>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-8 flex flex-col gap-10"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-[#a3a6ff] font-extrabold text-xs uppercase tracking-widest bg-[#a3a6ff]/10 px-3 py-1 rounded-full">Step 03</span>
                        <h2 className="text-xl font-bold text-[#f9f5f8]">Acquire Number</h2>
                    </div>
                    <div className="flex bg-[#262528] rounded-xl p-1 border border-[#48474a]/30">
                        {COUNTRIES.map(c => (
                            <button
                                key={c.code}
                                onClick={() => { setCountry(c.code); setNumbers([]); setSelectedNumber(null); }}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                    country === c.code ? "bg-[#a3a6ff] text-[#000000]" : "text-[#adaaad] hover:text-[#f9f5f8]"
                                )}
                            >
                                <span>{c.flag}</span> {c.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-2 gap-3 bg-[#131315] p-1.5 rounded-2xl border border-white/5">
                    <button
                        type="button"
                        onClick={() => { setMode("inventory"); setError(null); }}
                        className={cn(
                            "py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                            mode === "inventory"
                                ? "bg-[#a3a6ff] text-[#000000] shadow-md"
                                : "text-[#adaaad] hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Globe className="w-4 h-4" />
                        Search Inventory
                    </button>

                    <button
                        type="button"
                        onClick={() => { setMode("byo"); setError(null); }}
                        className={cn(
                            "py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                            mode === "byo"
                                ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-[#000000] shadow-md"
                                : "text-[#adaaad] hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Phone className="w-4 h-4" />
                        Bring Your Own (Free Call Forwarding)
                    </button>
                </div>

                {mode === "byo" ? (
                    /* BYO Call Forwarding Container */
                    <div className="space-y-6 bg-[#131315] border border-emerald-500/20 rounded-2xl p-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-emerald-400">
                                Enter Your Existing Clinic Phone Number
                            </label>
                            <input
                                type="text"
                                value={byoNumber}
                                onChange={(e) => setByoNumber(e.target.value)}
                                placeholder="e.g. +91 98765 43210 or +1 (415) 555-0123"
                                className="w-full bg-[#262528] border border-[#48474a]/40 rounded-xl px-4 py-3.5 text-white font-mono font-bold text-lg focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                            />
                            <p className="text-[11px] text-[#adaaad] leading-relaxed">
                                Use your existing clinic mobile or landline number. Cost: <strong className="text-emerald-400">FREE ($0.00)</strong>.
                            </p>
                        </div>

                        {/* Carrier Call Forwarding Guide */}
                        <div className="bg-[#1C1B1D] border border-white/5 rounded-xl p-4 space-y-3">
                            <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                How Call Forwarding Works:
                            </p>
                            <ul className="text-xs text-[#adaaad] space-y-2 list-disc list-inside leading-relaxed">
                                <li><strong>India (Jio / Airtel / Vi)</strong>: Dial <code className="bg-black/50 text-emerald-300 px-2 py-0.5 rounded">*21*&lt;AI_Line&gt;#</code> or <code className="bg-black/50 text-emerald-300 px-2 py-0.5 rounded">*401*&lt;AI_Line&gt;</code> to route incoming calls to AI.</li>
                                <li><strong>US / Canada (AT&T / Verizon / T-Mobile)</strong>: Dial <code className="bg-black/50 text-emerald-300 px-2 py-0.5 rounded">*72 &lt;AI_Line&gt;</code> or enable call forwarding in mobile settings.</li>
                            </ul>
                        </div>

                        <button
                            disabled={!byoNumber || locking}
                            onClick={handleBYOLock}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 text-black font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            {locking ? (
                                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>Connect Via Call Forwarding (Free) <ArrowRight className="w-5 h-5" /></>
                            )}
                        </button>
                    </div>
                ) : (
                    /* Inventory Search Container */
                    <>
                        {/* Filter / Search Bar */}
                        <div className="flex gap-4">
                            <div className="flex-grow relative group">
                                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#adaaad]" />
                                <input 
                                    type="text"
                                    placeholder="Optional: Area Code (e.g. 80)"
                                    value={areaCode}
                                    onChange={(e) => setAreaCode(e.target.value)}
                                    className="w-full bg-[#262528] border border-[#48474a]/30 rounded-xl pl-11 pr-5 py-3 text-[#f9f5f8] font-medium focus:ring-2 focus:ring-[#a3a6ff]/50 transition-all"
                                />
                            </div>
                            <button 
                                onClick={fetchNumbers}
                                disabled={loading}
                                className="bg-[#262528] border border-[#48474a]/30 px-6 rounded-xl font-black text-xs uppercase tracking-widest text-[#a3a6ff] hover:bg-[#a3a6ff]/10 transition-colors disabled:opacity-50"
                            >
                                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Search"}
                            </button>
                        </div>

                        {/* Numbers List */}
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {loading && (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-8 h-8 border-2 border-[#a3a6ff]/20 border-t-[#a3a6ff] rounded-full animate-spin" />
                                    <p className="text-[10px] uppercase font-black tracking-widest text-[#adaaad] animate-pulse">Scanning Telephony Spans...</p>
                                </div>
                            )}
                            
                            {!loading && numbers.length === 0 && !error && (
                                <div className="text-center py-12 border-2 border-dashed border-[#48474a]/20 rounded-2xl">
                                    <Globe className="w-10 h-10 text-[#48474a]/50 mx-auto mb-4" />
                                    <p className="text-[#adaaad] font-medium">Select criteria and click search</p>
                                </div>
                            )}

                            {!loading && numbers.map((n) => {
                                const isSelected = selectedNumber === n.number;
                                return (
                                    <button
                                        key={n.number}
                                        onClick={() => setSelectedNumber(n.number)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300",
                                            isSelected 
                                                ? "bg-gradient-to-br from-[#a3a6ff] to-[#6063ee] border-transparent shadow-[0_0_20px_rgba(163,166,255,0.1)] text-[#000000]"
                                                : "bg-[#262528] border-[#48474a]/30 hover:border-[#a3a6ff]/30 text-[#f9f5f8]"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn("p-2 rounded-lg", isSelected ? "bg-white/20" : "bg-[#131315] text-[#a3a6ff]")}>
                                                <Phone className="w-5 h-5" />
                                            </div>
                                            <span className="font-['JetBrains_Mono'] font-bold text-lg tracking-tight">{n.number}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={cn("text-[10px] font-black tracking-tighter uppercase px-2 py-0.5 rounded-full", isSelected ? "bg-[#000000]/10" : "bg-[#a3a6ff]/10 text-[#a3a6ff]")}>
                                                {country === 'IN' ? '₹499/mo' : country === 'GB' ? '£8/mo' : '$10/mo'}
                                            </span>
                                            {isSelected && <CheckCircle2 className="w-5 h-5" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                <AnimatePresence>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500"
                        >
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-xs font-bold leading-tight">{error}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="w-full h-px bg-[#48474a]/30" />

                <button 
                    disabled={!selectedNumber || locking || loading}
                    onClick={handleLock}
                    className="w-full py-4 rounded-2xl bg-gradient-to-br from-[#a3a6ff] to-[#6063ee] text-[#000000] font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#a3a6ff]/20 flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group"
                >
                    {locking ? (
                        <div className="w-5 h-5 border-2 border-[#000000]/20 border-t-[#000000] rounded-full animate-spin" />
                    ) : (
                        <>Reserve Number <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                    )}
                </button>

                {/* Skip Option */}
                <div className="flex flex-col items-center gap-2">
                    <button
                        onClick={handleSkip}
                        disabled={skipping || locking || loading}
                        className="flex items-center gap-2 text-[#adaaad] text-xs font-bold uppercase tracking-widest hover:text-white transition-colors disabled:opacity-30 py-2 px-4 rounded-xl hover:bg-white/5"
                    >
                        {skipping ? (
                            <div className="w-4 h-4 border-2 border-[#adaaad]/20 border-t-[#adaaad] rounded-full animate-spin" />
                        ) : (
                            <Lock className="w-3.5 h-3.5" />
                        )}
                        Skip for now — Access Dashboard (Limited)
                    </button>
                    <p className="text-[10px] text-[#48474a] text-center max-w-xs">
                        You can configure your AI Agent, but you won't be able to <span className="text-amber-400">Go Live</span> until you purchase a number.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
