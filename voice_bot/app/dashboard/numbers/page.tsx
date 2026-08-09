"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Phone, Plus, Check, Loader2, ShieldCheck,
    Zap, Globe, ChevronRight, AlertCircle, ArrowRight,
    Search, Filter, Download, Play, Smartphone, AlertTriangle, Trash2, Lock
} from "lucide-react";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { 
    searchNumbers, testDirectPurchase, togglePhoneNumberStatus, 
    triggerTestCall, addBYONumber, toggleAiAnswering, 
    updateClinicDirectLine, releasePhoneNumber, purchaseNumberViaWallet
} from "./actions";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import CarrierCheatSheet from "@/components/CarrierCheatSheet";

const providers = [
    {
        id: "vobiz",
        name: "Vobiz",
        desc: "Low-latency clinical routing",
        badge: "Active",
        features: ["Indian numbers", "Low latency", "SIP ready"],
    },
    {
        id: "telnyx",
        name: "Telnyx",
        desc: "Global medical compliance",
        badge: "Global",
        features: ["US numbers", "High quality", "Programmable SIP"],
    },
    {
        id: "twilio",
        name: "Twilio",
        desc: "Scalable patient outreach",
        badge: "Enterprise",
        features: ["100+ countries", "Redundant", "Widely supported"],
    },
];

type Status = "idle" | "loading" | "success" | "error";

export default function PhoneNumbersPage() {
    const router = useRouter();
    const [selectedProvider, setSelectedProvider] = useState<string>("vobiz");
    const [areaCode, setAreaCode] = useState("");
    const [status, setStatus] = useState<Status>("idle");
    const [result, setResult] = useState<{ number?: string; message?: string } | null>(null);
    const [existingNumbers, setExistingNumbers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasSubscription, setHasSubscription] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [currency, setCurrency] = useState<string>("INR");

    const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
    const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isTestLoading, setIsTestLoading] = useState(false);
    const [togglingNumber, setTogglingNumber] = useState<string | null>(null);
    const [savingDirectLine, setSavingDirectLine] = useState<string | null>(null);

    // BYO Number state
    const [byoNumber, setByoNumber] = useState("");
    const [byoStatus, setByoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [byoMessage, setByoMessage] = useState("");
    const [byoRegisteredNumber, setByoRegisteredNumber] = useState<string | null>(null);

    const [releasingNumber, setReleasingNumber] = useState<string | null>(null);

    const handleRelease = async (num: string, provider: string) => {
        if (!confirm(`Are you sure you want to release ${num}? This action cannot be undone, and the number will be permanently removed from your agent.`)) return;
        setReleasingNumber(num);
        try {
            await releasePhoneNumber(num, provider);
            setExistingNumbers(prev => prev.filter(n => n.number !== num));
        } catch (e: any) {
            alert(e.message || "Failed to release number.");
        } finally {
            setReleasingNumber(null);
        }
    };

    useEffect(() => {
        const loadNumbers = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: clinic } = await supabase.from("clinics").select("id, subscription_status, wallet_balance, currency").eq("user_id", user.id).single();
                if (clinic) {
                    setHasSubscription(['active', 'cancelling', 'trial'].includes(clinic.subscription_status));
                    setWalletBalance(clinic.wallet_balance || 0);
                    setCurrency(clinic.currency || "INR");
                    const { data: numbers } = await supabase.from("phone_numbers").select("*").eq("clinic_id", clinic.id);
                    if (numbers) {
                        setExistingNumbers(numbers);
                    }
                }
            }
            setLoading(false);
        };
        loadNumbers();
    }, []);

    const handleSearch = async () => {
        if (!selectedProvider) return;
        setIsSearching(true);
        setStatus("idle");
        setResult(null);
        setAvailableNumbers([]);
        setSelectedNumber(null);
        
        try {
            const countryCode = selectedProvider === "vobiz" ? "IN" : "US";
            const numbers = await searchNumbers(selectedProvider, areaCode, countryCode);
            setAvailableNumbers(numbers);
            if (numbers.length === 0) {
                setStatus("error");
                setResult({ message: "No numbers available for this area. Try another code." });
            }
        } catch (e: any) {
            setStatus("error");
            setResult({ message: e.message || "Failed to search numbers." });
        } finally {
            setIsSearching(false);
        }
    };

    const handleWalletPurchase = async () => {
        if (!selectedProvider || !selectedNumber) return;
        setStatus("loading");
        setResult(null);

        try {
            const res = await purchaseNumberViaWallet(selectedProvider, selectedNumber);
            setStatus("success");
            setResult({ number: res.number, message: "Successfully configured." });
            setExistingNumbers([{ number: res.number, provider: selectedProvider, status: "Active" }, ...existingNumbers]);
            setAvailableNumbers([]);
        } catch (e: any) {
            setStatus("error");
            setResult({ message: e.message || "Failed to provision number." });
        }
    };

    // DEV ONLY: bypass Razorpay and directly provision the number
    const handleTestPurchase = async () => {
        if (!selectedProvider || !selectedNumber) return;
        setIsTestLoading(true);
        setResult(null);
        try {
            const res = await testDirectPurchase(selectedProvider, selectedNumber);
            setStatus("success");
            setResult({ number: res.number, message: `✅ TEST: ${res.number} provisioned & SIP configured.` });
            setExistingNumbers([{ number: res.number, provider: selectedProvider, status: "Active" }, ...existingNumbers]);
            setAvailableNumbers([]);
        } catch (e: any) {
            setStatus("error");
            setResult({ message: e.message || "Test provision failed." });
        } finally {
            setIsTestLoading(false);
        }
    };

    const handleToggleStatus = async (number: string, currentStatus: string) => {
        setTogglingNumber(number);
        try {
            await togglePhoneNumberStatus(number, currentStatus);
            // Refresh local state
            setExistingNumbers(prev => prev.map(n => 
                n.number === number 
                    ? { ...n, status: currentStatus === "Active" ? "Inactive" : "Active" } 
                    : n
            ));
        } catch (e: any) {
            alert("Failed to toggle network status: " + e.message);
        } finally {
            setTogglingNumber(null);
        }
    };

    const handleToggleAiAnswering = async (number: string, currentVal: boolean) => {
        setTogglingNumber(`ai-${number}`);
        try {
            await toggleAiAnswering(number, currentVal);
            setExistingNumbers(prev => prev.map(n => 
                n.number === number 
                    ? { ...n, ai_answering: !currentVal } 
                    : n
            ));
        } catch (e: any) {
            alert("Failed to toggle AI answering: " + e.message);
        } finally {
            setTogglingNumber(null);
        }
    };

    const handleUpdateDirectLine = async (number: string, directLine: string) => {
        setSavingDirectLine(number);
        try {
            await updateClinicDirectLine(number, directLine);
            setExistingNumbers(prev => prev.map(n => 
                n.number === number 
                    ? { ...n, clinic_direct_line: directLine } 
                    : n
            ));
        } catch (e: any) {
            alert("Failed to update direct line: " + e.message);
        } finally {
            setSavingDirectLine(null);
        }
    };

    const handleAddBYO = async () => {
        if (!byoNumber.trim()) return;
        const cleanNumber = byoNumber.trim().replace(/[^\d\+]/g, "");
        const e164Regex = /^\+[1-9]\d{6,14}$/;
        if (!e164Regex.test(cleanNumber)) {
            setByoStatus("error");
            setByoMessage("Please enter a valid number in E.164 format (e.g. +9198421783149)");
            return;
        }

        setByoStatus("loading");
        setByoMessage("");

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Unauthorized. Please log in.");

            const { data: clinic } = await supabase.from("clinics").select("id").eq("user_id", user.id).single();
            if (!clinic) throw new Error("Clinic profile not found.");

            const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL && !process.env.NEXT_PUBLIC_BACKEND_URL.includes("localhost"))
                ? process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")
                : "https://api.clinicassistai.online";

            const res = await fetch(`${baseUrl}/api/v1/payments/purchase-number`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clinic_id: clinic.id,
                    provider: "byo",
                    phone_number: cleanNumber,
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || "Failed to register BYO number.");
            }

            setByoStatus("success");
            setByoMessage(`✅ ${cleanNumber} registered successfully! Set up call forwarding below to go live.`);
            setByoRegisteredNumber(cleanNumber);
            setExistingNumbers(prev => [{ number: cleanNumber, provider: "byo", status: "Active" }, ...prev]);
            setByoNumber("");
        } catch (e: any) {
            setByoStatus("error");
            setByoMessage(e.message || "Failed to register number.");
        }
    };

    const handleTestCall = async () => {
        const phone = window.prompt("Enter your phone number in E.164 format (e.g., +9192400244230) to receive a test call:");
        if (!phone) return;

        setStatus("loading");
        setResult(null);
        try {
            await triggerTestCall(phone);
            setStatus("success");
            setResult({ message: `Calling ${phone} now... Listen for your AI agent!` });
        } catch (e: any) {
            setStatus("error");
            setResult({ message: "Test call failed: " + e.message });
        }
    };

    const rentalFee = currency === "INR" ? 1200 : 10;
    const currencySymbol = currency === "INR" ? "₹" : "$";
    const formattedFee = currency === "INR" ? `₹1,200` : `$10`;
    const hasEnoughBalance = existingNumbers.length === 0 || walletBalance >= rentalFee;

    if (loading) return (
        <div className="flex items-center justify-center h-[50vh]">
            <Loader2 className="animate-spin text-[#a3a6ff]" size={32} />
        </div>
    );

    return (
        <div className="w-full pb-16 pt-2 px-6 md:px-10">
            
            <div className="max-w-7xl mx-auto space-y-12">
                
                {/* Hero Stats / Network Vitality */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 bg-[#1C1B1D]/80 backdrop-blur-xl rounded-3xl p-8 border border-white/5 relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-[#f9f5f8] font-['Plus_Jakarta_Sans']">Network Vitality</h2>
                            <p className="text-[#adaaad] mb-6 max-w-md">Real-time status of your global voice infrastructure and provisioning pipeline.</p>
                            <div className="flex gap-4">
                                <div className="bg-[#131315] px-4 py-2 rounded-xl flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                    <span className="text-sm font-semibold uppercase tracking-wider text-white">
                                        {existingNumbers.length > 0 ? `${existingNumbers.length} Active Nodes` : "0 Active Nodes"}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute right-0 bottom-0 w-1/2 h-32 opacity-20">
                            <div className="w-full h-full bg-gradient-to-t from-[#a3a6ff] to-transparent" style={{ clipPath: "polygon(0 80%, 10% 70%, 20% 75%, 30% 60%, 40% 65%, 50% 40%, 60% 50%, 70% 20%, 80% 30%, 90% 10%, 100% 20%, 100% 100%, 0 100%)" }}></div>
                        </div>
                    </div>
                    
                    <div className="bg-[#9396ff] rounded-3xl p-8 flex flex-col justify-between text-[#0a0081] shadow-[0_20px_50px_rgba(147,150,255,0.2)]">
                        <Plus className="w-10 h-10 mb-4" />
                        <div>
                            <h3 className="text-xl font-bold mb-1">Quick Provision</h3>
                            <p className="text-sm opacity-80 font-medium">Instant activation for new clinical lines.</p>
                        </div>
                    </div>
                </section>

                {/* Provider Selection */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
                            <Globe className="text-[#a3a6ff] w-5 h-5" />
                            Carrier Backbone
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {providers.map(p => (
                            <div 
                                key={p.id}
                                onClick={() => setSelectedProvider(p.id)}
                                className={cn(
                                    "group relative rounded-2xl p-6 transition-all cursor-pointer backdrop-blur-xl",
                                    selectedProvider === p.id
                                        ? "bg-[#1f1f22] border-2 border-[#a3a6ff] shadow-[0_0_20px_rgba(163,166,255,0.15)]"
                                        : "bg-[#131315] border border-white/5 hover:border-[#a3a6ff]/40"
                                )}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#262528] flex items-center justify-center">
                                        <Smartphone className={cn("w-6 h-6", selectedProvider === p.id ? "text-[#a3a6ff]" : "text-white/40")} />
                                    </div>
                                    {selectedProvider === p.id && (
                                        <span className="text-[10px] bg-[#a3a6ff]/20 text-[#a3a6ff] font-bold px-2 py-1 rounded uppercase tracking-widest">Active</span>
                                    )}
                                </div>
                                <p className="font-bold text-lg mb-1 text-white">{p.name}</p>
                                <p className="text-xs text-[#adaaad]">{p.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Provisioning Search Form */}
                <section className="bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1 w-full relative">
                            <label className="block text-xs font-bold text-[#adaaad] uppercase tracking-widest mb-3">Area Code Search</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#adaaad] w-5 h-5" />
                                <input 
                                    type="text"
                                    value={areaCode}
                                    onChange={e => setAreaCode(e.target.value.replace(/\D/g, ""))}
                                    placeholder={selectedProvider === "vobiz" ? "91 (India focus)" : "1 (US/Canada focus)"}
                                    className="w-full bg-[#262528] border-none rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-[#48474a] outline-none focus:ring-2 focus:ring-[#a3a6ff]/40 transition-shadow" 
                                />
                            </div>
                        </div>
                        <button 
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="w-full md:w-auto bg-[#a3a6ff] text-[#000000] font-bold px-8 py-4 rounded-xl shadow-lg shadow-[#a3a6ff]/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSearching ? <Loader2 className="animate-spin w-5 h-5" /> : null}
                            {isSearching ? "Scanning..." : "Find Available Numbers"}
                        </button>
                    </div>

                    {/* Available Numbers Inventory List */}
                    <AnimatePresence>
                        {status === "error" && result && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-6 p-4 rounded-xl bg-red-400/10 border border-red-400/20 flex items-center gap-3">
                                <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
                                <div className="text-sm font-semibold text-red-400">{result.message}</div>
                            </motion.div>
                        )}
                        {status === "success" && result && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-6 p-4 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center gap-3">
                                <Check size={18} className="text-emerald-400 flex-shrink-0" />
                                <div className="text-sm font-semibold text-emerald-400">{result.message}</div>
                            </motion.div>
                        )}
                        {availableNumbers.length > 0 && status !== "success" && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8 space-y-4"
                            >
                                <h4 className="text-xs font-bold uppercase tracking-widest text-[#adaaad]">Select Provisioning Target</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {availableNumbers.map(num => (
                                        <div 
                                            key={num.number}
                                            onClick={() => setSelectedNumber(num.number)}
                                            className={cn(
                                                "p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-4",
                                                selectedNumber === num.number
                                                    ? "bg-[#a3a6ff]/10 border-[#a3a6ff]/50 shadow-[0_0_15px_rgba(163,166,255,0.05)]"
                                                    : "bg-[#131315] border-white/5 hover:border-white/20"
                                            )}
                                        >
                                            <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-colors flex-shrink-0", selectedNumber === num.number ? "border-[#a3a6ff]" : "border-white/20")}>
                                                {selectedNumber === num.number && <div className="w-2 h-2 rounded-full bg-[#a3a6ff]" />}
                                            </div>
                                            <div>
                                                <div className="font-mono text-sm font-bold text-white tracking-wide">{num.friendly_name}</div>
                                                <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mt-0.5">SIP Ready</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end mt-4 gap-3">
                                    {/* DEV ONLY: bypass payment for testing */}
                                    {process.env.NODE_ENV !== "production" && (
                                        <button
                                            onClick={handleTestPurchase}
                                            disabled={isTestLoading || status === "loading" || !selectedNumber}
                                            className="bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 font-bold px-6 py-3.5 rounded-xl hover:bg-yellow-400/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-40 disabled:hover:scale-100 text-sm"
                                        >
                                            {isTestLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Zap className="w-4 h-4" />}
                                            {isTestLoading ? "Provisioning..." : "DEV — Test Provision"}
                                        </button>
                                    )}

                                    {/* Subscription Gate */}
                                    {!hasSubscription ? (
                                        <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-3">
                                            <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs font-bold text-amber-400">Subscription Required</p>
                                                <p className="text-[10px] text-white/40">Subscribe to provision phone numbers</p>
                                            </div>
                                            <a
                                                href="/dashboard/billing"
                                                className="ml-2 flex items-center gap-1.5 px-4 py-2 bg-[#a3a6ff]/10 hover:bg-[#a3a6ff]/20 border border-[#a3a6ff]/20 rounded-lg text-[#a3a6ff] text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
                                            >
                                                <Zap className="w-3 h-3" />
                                                Subscribe
                                            </a>
                                        </div>
                                    ) : !hasEnoughBalance && selectedNumber ? (
                                        <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-3 animate-in fade-in duration-300">
                                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-amber-400">Insufficient Wallet Balance</p>
                                                <p className="text-[10px] text-white/40">Extra numbers cost {formattedFee}/month. You have {currencySymbol}{walletBalance.toFixed(2)}.</p>
                                            </div>
                                            <a
                                                href="/dashboard/billing"
                                                className="ml-2 flex items-center gap-1.5 px-4 py-2 bg-[#a3a6ff]/10 hover:bg-[#a3a6ff]/20 border border-[#a3a6ff]/20 rounded-lg text-[#a3a6ff] text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
                                            >
                                                <Zap className="w-3 h-3" />
                                                Top Up Wallet
                                            </a>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={handleWalletPurchase}
                                            disabled={status === "loading" || !selectedNumber}
                                            className="bg-[#a3a6ff] text-[#000000] font-bold px-8 py-3.5 rounded-xl shadow-[0_0_20px_rgba(163,166,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100 whitespace-nowrap"
                                        >
                                            {status === "loading" ? <Loader2 className="animate-spin w-5 h-5" /> : <ShieldCheck className="w-5 h-5"/>}
                                            {status === "loading" ? "Configuring SIP..." : (existingNumbers.length === 0 ? "✨ Get 1st Number FREE" : `Buy (${formattedFee} from Wallet)`)}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* ── BYO: Bring Your Own Number ─────────────────────────────── */}
                <section className="bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                            <Plus className="w-4 h-4 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">Bring Your Own Number (BYO)</h3>
                        <span className="ml-auto text-[10px] uppercase tracking-widest text-white/30 font-bold">No purchase needed</span>
                    </div>
                    <p className="text-xs text-[#adaaad] mb-6 leading-relaxed">
                        Already have a number from Exotel, Airtel, Knowlarity, or any other provider?
                        Enter it below — we'll skip the purchase step and configure it directly in LiveKit so your AI answers calls immediately.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#adaaad] w-4 h-4" />
                            <input
                                type="text"
                                value={byoNumber}
                                onChange={e => { setByoNumber(e.target.value); setByoStatus("idle"); setByoMessage(""); }}
                                placeholder="+919876543210  (E.164 format)"
                                className="w-full bg-[#262528] border border-white/5 focus:border-emerald-400/40 rounded-xl pl-11 pr-4 py-4 text-white placeholder:text-[#48474a] outline-none focus:ring-1 focus:ring-emerald-400/20 transition-all font-mono"
                            />
                        </div>
                        <button
                            onClick={handleAddBYO}
                            disabled={byoStatus === "loading" || !byoNumber.trim()}
                            className="flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-black font-bold rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(78,222,163,0.15)] whitespace-nowrap"
                        >
                            {byoStatus === "loading" ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                            {byoStatus === "loading" ? "Registering..." : "Register Number"}
                        </button>
                    </div>

                    {byoMessage && (
                        <div className={cn(
                            "mt-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2",
                            byoStatus === "success" ? "bg-emerald-400/10 border border-emerald-400/20 text-emerald-300" : "bg-red-400/10 border border-red-400/20 text-red-300"
                        )}>
                            {byoStatus === "success" ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                            {byoMessage}
                        </div>
                    )}

                    {/* Carrier Cheat Sheet — shown after successful BYO registration */}
                    {byoRegisteredNumber && (
                        <div className="mt-6">
                            <CarrierCheatSheet
                                clinicNumber={byoRegisteredNumber}
                                countryCode={byoRegisteredNumber.startsWith("+91") ? "IN" : "US"}
                            />
                        </div>
                    )}

                    <p className="text-[10px] text-white/20 mt-4">
                        Your SIP trunk must point inbound calls to our LiveKit SIP URI. After registering, we'll show you the SIP endpoint to configure in your provider's portal.
                    </p>
                </section>

                {/* Existing Inventory */}
                {existingNumbers.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-black text-white tracking-tight font-['Plus_Jakarta_Sans']">Active Matrix</h3>
                        </div>
                        <div className="space-y-4">
                            {existingNumbers.map((n, i) => (
                                <div key={i} className="bg-[#131315] hover:bg-[#2c2c2f] rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-6 transition-all border-l-2 border-transparent hover:border-[#a3a6ff]">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-xl bg-[#262528] flex items-center justify-center flex-shrink-0 border border-white/5">
                                            <Smartphone className="w-6 h-6 text-[#a3a6ff]" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg font-mono tracking-tight text-white">{n.number}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_var(--emerald-400)]"></div>
                                                <span className="text-[10px] uppercase font-bold text-[#adaaad]">{n.provider} • Auto-SIP Active</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col gap-1.5 w-full md:w-80 bg-black/20 p-3 rounded-xl">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] text-[#adaaad] uppercase font-bold tracking-widest">AI Answering (LiveKit)</span>
                                            <div className="relative group/toggle">
                                                <button 
                                                    onClick={() => !hasSubscription ? null : handleToggleAiAnswering(n.number, n.ai_answering !== false)}
                                                    disabled={togglingNumber === `ai-${n.number}` || !hasSubscription}
                                                    className={cn(
                                                        "relative w-9 h-5 rounded-full transition-all shadow-inner",
                                                        (n.ai_answering !== false && hasSubscription) ? "bg-emerald-500" : "bg-[#262528]",
                                                        (togglingNumber === `ai-${n.number}` || !hasSubscription) && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "absolute top-1 w-3 h-3 bg-black shadow-sm rounded-full transition-all",
                                                        (n.ai_answering !== false && hasSubscription) ? "right-1" : "left-1"
                                                    )}></div>
                                                </button>
                                                
                                                {!hasSubscription && (
                                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#1C1B1D] text-amber-400 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-amber-500/20 whitespace-nowrap opacity-0 group-hover/toggle:opacity-100 transition-opacity pointer-events-none shadow-xl z-50 flex items-center gap-2">
                                                        <Lock size={10} />
                                                        Subscribe to Unlock
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {n.ai_answering === false && (
                                            <div className="mt-2 text-xs">
                                                <p className="text-white/40 mb-2 px-1 text-[10px] leading-tight">
                                                    When AI is OFF, calls are immediately transferred to this number.
                                                </p>
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        defaultValue={n.clinic_direct_line || ""}
                                                        placeholder="+91... (Direct Phone)"
                                                        onBlur={(e) => {
                                                            if (e.target.value !== n.clinic_direct_line) {
                                                                handleUpdateDirectLine(n.number, e.target.value);
                                                            }
                                                        }}
                                                        className="w-full bg-[#1C1B1D] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#a3a6ff]/50"
                                                    />
                                                    {savingDirectLine === n.number && (
                                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[#a3a6ff] animate-spin" />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-6 justify-between md:justify-end">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-[#adaaad] uppercase font-bold tracking-widest hidden sm:block">Call Flow</span>
                                            <div className="relative group/toggle">
                                                <button 
                                                    onClick={() => !hasSubscription ? null : handleToggleStatus(n.number, n.status)}
                                                    disabled={togglingNumber === n.number || !hasSubscription}
                                                    className={cn(
                                                        "relative w-12 h-6 rounded-full transition-all shadow-inner",
                                                        (n.status === "Active" && hasSubscription) ? "bg-[#a3a6ff]" : "bg-[#262528]",
                                                        (togglingNumber === n.number || !hasSubscription) && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "absolute top-1 w-4 h-4 bg-[#000000] shadow-sm rounded-full transition-all",
                                                        (n.status === "Active" && hasSubscription) ? "right-1" : "left-1"
                                                    )}></div>
                                                </button>

                                                {!hasSubscription && (
                                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#1C1B1D] text-amber-400 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-amber-500/20 whitespace-nowrap opacity-0 group-hover/toggle:opacity-100 transition-opacity pointer-events-none shadow-xl z-50 flex items-center gap-2">
                                                        <Lock size={10} />
                                                        Subscribe to Unlock
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRelease(n.number, n.provider)}
                                            disabled={releasingNumber === n.number}
                                            className="flex items-center justify-center p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
                                            title="Release Number"
                                        >
                                            {releasingNumber === n.number ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                        <button 
                                            onClick={handleTestCall}
                                            className="flex items-center gap-2 bg-[#a3a6ff]/10 hover:bg-[#a3a6ff]/20 text-[#a3a6ff] border border-[#a3a6ff]/20 px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm hover:shadow-[0_0_15px_rgba(163,166,255,0.15)] group"
                                        >
                                            <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                                            <span className="text-xs font-bold uppercase tracking-widest">Test Call</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
