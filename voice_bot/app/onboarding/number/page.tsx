"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Search, Globe, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import CarrierCheatSheet from "@/components/CarrierCheatSheet";

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

// BYO sub-steps
type ByoStep = "pick-bridge" | "enter-clinic" | "cheatsheet";

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

    const [byoStep, setByoStep] = useState<ByoStep>("pick-bridge");
    const [byoBridgeNumber, setByoBridgeNumber] = useState<string>("");
    const [byoClinicNumber, setByoClinicNumber] = useState<string>("");
    const [byoSuccess, setByoSuccess] = useState<{ clinicNumber: string; bridgeNumber: string; countryCode: string } | null>(null);

    useEffect(() => {
        const fetchSavedCountry = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: clinic } = await supabase
                    .from("clinics").select("country_code").eq("user_id", user.id).single();
                if (clinic?.country_code) setCountry(clinic.country_code);
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
            if (!res.ok) throw new Error(data.detail || "Failed to fetch numbers");
            if (data.status === "success") {
                if (data.numbers?.length > 0) { setNumbers(data.numbers); }
                else { setNumbers([]); setError(data.message || `No numbers available for ${country}.`); }
            } else { throw new Error(data.message || "Failed to fetch numbers"); }
        } catch (err: any) {
            setError(err.message || "Unable to reach telephony provider. Please try again.");
            setNumbers([]);
        } finally { setLoading(false); }
    };

    const handleDirectLock = async () => {
        if (!selectedNumber) return;
        setLocking(true); setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session found. Please log in.");
            const { data: clinicData } = await supabase.from("clinics").select("id").eq("user_id", session.user.id).single();
            if (!clinicData) throw new Error("Clinic profile not found.");
            const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL && !process.env.NEXT_PUBLIC_BACKEND_URL.includes("localhost"))
                ? process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "") : "https://api.clinicassistai.online";
            const res = await fetch(`${baseUrl}/api/v1/payments/lock-number`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clinic_id: clinicData.id, phone_number: selectedNumber, country_code: country })
            });
            const lockData = await res.json();
            if (!res.ok) {
                if (res.status === 409) { setError("Someone else just locked this number. Please select another."); fetchNumbers(); return; }
                throw new Error(lockData.detail || "Failed to secure number lock.");
            }
            if (lockData.status === "success") {
                await supabase.from("clinics").update({ onboarding_step: "payment" }).eq("id", clinicData.id);
                router.push("/onboarding/payment");
            } else { throw new Error("Lock failed"); }
        } catch (err: any) { setError(err.message || "Failed to secure number lock. Please retry."); }
        finally { setLocking(false); }
    };

    const handleByoBridgeLock = async () => {
        if (!selectedNumber) return;
        setLocking(true); setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session found. Please log in.");
            const { data: clinicData } = await supabase.from("clinics").select("id").eq("user_id", session.user.id).single();
            if (!clinicData) throw new Error("Clinic profile not found.");
            const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL && !process.env.NEXT_PUBLIC_BACKEND_URL.includes("localhost"))
                ? process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "") : "https://api.clinicassistai.online";
            const res = await fetch(`${baseUrl}/api/v1/payments/lock-number`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clinic_id: clinicData.id, phone_number: selectedNumber, country_code: country, is_bridge: true })
            });
            const lockData = await res.json();
            if (!res.ok) {
                if (res.status === 409) { setError("Someone else just locked this number. Please select another."); fetchNumbers(); return; }
                throw new Error(lockData.detail || "Failed to secure AI bridge number.");
            }
            if (lockData.status === "success") {
                setByoBridgeNumber(selectedNumber);
                setSelectedNumber(null); setNumbers([]); setByoStep("enter-clinic"); setError(null);
            } else { throw new Error("Lock failed"); }
        } catch (err: any) { setError(err.message || "Failed to lock AI bridge number. Please retry."); }
        finally { setLocking(false); }
    };

    const handleByoClinicRegister = async () => {
        if (!byoClinicNumber || byoClinicNumber.trim().length < 8) {
            setError("Please enter a valid phone number with country code (e.g. +91 98765 43210)"); return;
        }
        setLocking(true); setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session found. Please log in.");
            const { data: clinicData } = await supabase.from("clinics").select("id").eq("user_id", session.user.id).single();
            if (!clinicData) throw new Error("Clinic profile not found.");
            const cleanNumber = byoClinicNumber.replace(/[^\d\+]/g, "");

            // Save clinic number in local state only (used for USSD code display)
            // Just advance the onboarding step — no new DB column required
            const { error: dbErr } = await supabase
                .from("clinics")
                .update({ onboarding_step: "payment" })
                .eq("id", clinicData.id);

            if (dbErr) throw new Error("Failed to update onboarding step. Please retry.");

            setByoSuccess({ clinicNumber: cleanNumber, bridgeNumber: byoBridgeNumber, countryCode: country });
            setByoStep("cheatsheet");
        } catch (err: any) { setError(err.message || "Failed to register your clinic number. Please retry."); }
        finally { setLocking(false); }
    };

    const handleSkip = async () => {
        setSkipping(true); setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session. Please log in again.");
            const { data: clinicData } = await supabase.from("clinics").select("id").eq("user_id", session.user.id).single();
            if (!clinicData) throw new Error("Clinic not found. Please complete Step 1.");
            await supabase.from("clinics").update({ onboarding_step: "completed" }).eq("id", clinicData.id);
            router.push("/dashboard");
        } catch (err: any) { setError(err.message || "Could not skip. Please try again."); }
        finally { setSkipping(false); }
    };

    const byoStepIndex = byoStep === "pick-bridge" ? 0 : byoStep === "enter-clinic" ? 1 : 2;
    const byoStepLabels = ["A. Buy AI Line", "B. Clinic Number", "C. Setup Forwarding"];

    const NumberList = () => (
        <>
            <div className="flex gap-4">
                <div className="flex-grow relative">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#adaaad]" />
                    <input type="text" placeholder="Optional: Area Code (e.g. 80)" value={areaCode}
                        onChange={(e) => setAreaCode(e.target.value)}
                        className="w-full bg-[#262528] border border-[#48474a]/30 rounded-xl pl-11 pr-5 py-3 text-[#f9f5f8] font-medium focus:ring-2 focus:ring-[#a3a6ff]/50 transition-all" />
                </div>
                <button onClick={fetchNumbers} disabled={loading}
                    className="bg-[#262528] border border-[#48474a]/30 px-6 rounded-xl font-black text-xs uppercase tracking-widest text-[#a3a6ff] hover:bg-[#a3a6ff]/10 transition-colors disabled:opacity-50">
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Search"}
                </button>
            </div>
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="w-8 h-8 border-2 border-[#a3a6ff]/20 border-t-[#a3a6ff] rounded-full animate-spin" />
                        <p className="text-[10px] uppercase font-black tracking-widest text-[#adaaad] animate-pulse">Scanning Telephony Spans...</p>
                    </div>
                )}
                {!loading && numbers.length === 0 && !error && (
                    <div className="text-center py-12 border-2 border-dashed border-[#48474a]/20 rounded-2xl">
                        <Globe className="w-10 h-10 text-[#48474a]/50 mx-auto mb-4" />
                        <p className="text-[#adaaad] font-medium">Select criteria and click Search</p>
                    </div>
                )}
                {!loading && numbers.map((n) => {
                    const isSelected = selectedNumber === n.number;
                    return (
                        <button key={n.number} onClick={() => setSelectedNumber(n.number)}
                            className={cn("w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300",
                                isSelected ? "bg-gradient-to-br from-[#a3a6ff] to-[#6063ee] border-transparent shadow-[0_0_20px_rgba(163,166,255,0.1)] text-[#000000]"
                                    : "bg-[#262528] border-[#48474a]/30 hover:border-[#a3a6ff]/30 text-[#f9f5f8]")}>
                            <div className="flex items-center gap-4">
                                <div className={cn("p-2 rounded-lg", isSelected ? "bg-white/20" : "bg-[#131315] text-[#a3a6ff]")}>
                                    <Phone className="w-5 h-5" />
                                </div>
                                <span className="font-['JetBrains_Mono'] font-bold text-lg tracking-tight">{n.number}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={cn("text-[10px] font-black tracking-tighter uppercase px-2 py-0.5 rounded-full",
                                    isSelected ? "bg-[#000000]/10" : "bg-[#a3a6ff]/10 text-[#a3a6ff]")}>
                                    {country === "IN" ? "Rs.499/mo" : country === "GB" ? "8 GBP/mo" : "$10/mo"}
                                </span>
                                {isSelected && <CheckCircle2 className="w-5 h-5" />}
                            </div>
                        </button>
                    );
                })}
            </div>
        </>
    );

    return (
        <div className="flex flex-col items-center w-full px-6 max-w-3xl mx-auto">
            <section className="text-center space-y-3 mb-10 w-full">
                <h1 className="text-4xl font-extrabold tracking-tight text-[#f9f5f8] font-['Plus_Jakarta_Sans']">Telephony Interface</h1>
                <p className="text-[#adaaad] text-sm">Connect a phone number so your AI Receptionist can answer live patient calls.</p>
            </section>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-8 flex flex-col gap-8"
            >
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <span className="text-[#a3a6ff] font-extrabold text-xs uppercase tracking-widest bg-[#a3a6ff]/10 px-3 py-1 rounded-full">Step 03</span>
                        <h2 className="text-xl font-bold text-[#f9f5f8]">Phone Number Setup</h2>
                    </div>
                    <div className="flex bg-[#262528] rounded-xl p-1 border border-[#48474a]/30 flex-wrap">
                        {COUNTRIES.map(c => (
                            <button key={c.code}
                                onClick={() => { setCountry(c.code); setNumbers([]); setSelectedNumber(null); }}
                                className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                    country === c.code ? "bg-[#a3a6ff] text-[#000000]" : "text-[#adaaad] hover:text-[#f9f5f8]")}>
                                <span>{c.flag}</span> {c.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#131315] p-1.5 rounded-2xl border border-white/5">
                    <button type="button"
                        onClick={() => { setMode("inventory"); setError(null); }}
                        className={cn("py-3.5 px-4 rounded-xl text-xs font-extrabold transition-all flex flex-col items-center justify-center gap-1",
                            mode === "inventory" ? "bg-[#a3a6ff] text-[#000000] shadow-md" : "text-[#adaaad] hover:text-white hover:bg-white/5")}>
                        <span className="flex items-center gap-2 uppercase tracking-wider"><Globe className="w-4 h-4" />Option 1: New Dedicated AI Number</span>
                        <span className="text-[10px] opacity-80 font-normal">Cloud Line - Zero Forwarding - Patients dial AI number directly</span>
                    </button>
                    <button type="button"
                        onClick={() => { setMode("byo"); setByoStep("pick-bridge"); setSelectedNumber(null); setNumbers([]); setError(null); }}
                        className={cn("py-3.5 px-4 rounded-xl text-xs font-extrabold transition-all flex flex-col items-center justify-center gap-1",
                            mode === "byo" ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-[#000000] shadow-md" : "text-[#adaaad] hover:text-white hover:bg-white/5")}>
                        <span className="flex items-center gap-2 uppercase tracking-wider"><Phone className="w-4 h-4" />Option 2: Keep Existing Clinic Number</span>
                        <span className="text-[10px] opacity-80 font-normal">Patients keep dialing your current number - AI answers via call forwarding</span>
                    </button>
                </div>

                {mode === "inventory" && (
                    <>
                        <NumberList />
                        <AnimatePresence>
                            {error && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <p className="text-xs font-bold leading-tight">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="w-full h-px bg-[#48474a]/30" />
                        <button disabled={!selectedNumber || locking || loading} onClick={handleDirectLock}
                            className="w-full py-4 rounded-2xl bg-gradient-to-br from-[#a3a6ff] to-[#6063ee] text-[#000000] font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#a3a6ff]/20 flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group">
                            {locking ? <div className="w-5 h-5 border-2 border-[#000000]/20 border-t-[#000000] rounded-full animate-spin" />
                                : <>Reserve Number <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                        </button>
                    </>
                )}

                {mode === "byo" && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {byoStepLabels.map((label, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                        i < byoStepIndex ? "bg-emerald-500/20 text-emerald-400" :
                                        i === byoStepIndex ? "bg-emerald-400 text-black" : "bg-white/5 text-[#adaaad]")}>
                                        {i < byoStepIndex && <CheckCircle2 className="w-3 h-3" />}
                                        {label}
                                    </div>
                                    {i < byoStepLabels.length - 1 && <ChevronRight className="w-3 h-3 text-[#48474a]" />}
                                </div>
                            ))}
                        </div>

                        {byoStep === "pick-bridge" && (
                            <div className="space-y-4">
                                <div className="bg-[#131315] border border-emerald-500/20 rounded-2xl p-5 space-y-1">
                                    <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">Sub-Step A - Purchase Your Dedicated AI Bridge Line</p>
                                    <p className="text-xs text-[#adaaad] leading-relaxed">
                                        This is a <strong className="text-white">backend AI line</strong> - your patients never dial it directly.
                                        Your existing clinic SIM will silently forward incoming calls to this AI line via your carrier.
                                        Pick one number from inventory below.
                                    </p>
                                </div>
                                <NumberList />
                                <AnimatePresence>
                                    {error && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                            className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500">
                                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                            <p className="text-xs font-bold leading-tight">{error}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <button disabled={!selectedNumber || locking} onClick={handleByoBridgeLock}
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 text-black font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed">
                                    {locking ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                        : <>Secure AI Bridge Line <ArrowRight className="w-5 h-5" /></>}
                                </button>
                            </div>
                        )}

                        {byoStep === "enter-clinic" && (
                            <div className="space-y-4">
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-black text-emerald-400">AI Bridge Line Secured!</p>
                                        <p className="text-[11px] text-[#adaaad]">
                                            Your AI line: <code className="font-mono font-bold text-emerald-300">{byoBridgeNumber}</code>
                                            {" "}- patients will forward to this number.
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-3 bg-[#131315] border border-white/5 rounded-2xl p-5">
                                    <p className="text-xs font-black text-white uppercase tracking-wider">Sub-Step B - Enter Your Existing Clinic Number</p>
                                    <p className="text-[11px] text-[#adaaad] leading-relaxed">
                                        This is the number your patients already know and call. We will generate the exact
                                        carrier USSD code to silently forward incoming calls from this number to your AI bridge line.
                                    </p>
                                    <input type="text" value={byoClinicNumber} onChange={(e) => setByoClinicNumber(e.target.value)}
                                        placeholder="e.g. +91 98765 43210 or +1 (415) 555-0123"
                                        className="w-full bg-[#262528] border border-[#48474a]/40 rounded-xl px-4 py-3.5 text-white font-mono font-bold text-lg focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all" />
                                </div>
                                <AnimatePresence>
                                    {error && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                            className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500">
                                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                            <p className="text-xs font-bold leading-tight">{error}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <button disabled={!byoClinicNumber || locking} onClick={handleByoClinicRegister}
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 text-black font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed">
                                    {locking ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                        : <>Register Clinic Number <ArrowRight className="w-5 h-5" /></>}
                                </button>
                            </div>
                        )}

                        {byoStep === "cheatsheet" && byoSuccess && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-black text-emerald-400">Both Numbers Configured!</p>
                                        <p className="text-[11px] text-[#adaaad]">
                                            Clinic: <code className="font-mono font-bold text-white">{byoSuccess.clinicNumber}</code>
                                            {" "}-{">"} AI Bridge: <code className="font-mono font-bold text-emerald-300">{byoSuccess.bridgeNumber}</code>
                                        </p>
                                    </div>
                                </div>
                                <CarrierCheatSheet
                                    clinicNumber={byoSuccess.clinicNumber}
                                    targetBridgeNumber={byoSuccess.bridgeNumber}
                                    countryCode={byoSuccess.countryCode}
                                />
                                <button onClick={() => router.push("/onboarding/payment")}
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 text-black font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                                    I have Set Up Forwarding - Continue <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {(mode === "inventory" || (mode === "byo" && byoStep === "pick-bridge")) && (
                    <div className="flex flex-col items-center gap-2">
                        <button onClick={handleSkip} disabled={skipping || locking || loading}
                            className="flex items-center gap-2 text-[#adaaad] text-xs font-bold uppercase tracking-widest hover:text-white transition-colors disabled:opacity-30 py-2 px-4 rounded-xl hover:bg-white/5">
                            {skipping ? <div className="w-4 h-4 border-2 border-[#adaaad]/20 border-t-[#adaaad] rounded-full animate-spin" />
                                : <Lock className="w-3.5 h-3.5" />}
                            Skip for now - Access Dashboard (Limited)
                        </button>
                        <p className="text-[10px] text-[#48474a] text-center max-w-xs">
                            You can configure your AI Agent, but you won't be able to <span className="text-amber-400">Go Live</span> until you purchase a number.
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}