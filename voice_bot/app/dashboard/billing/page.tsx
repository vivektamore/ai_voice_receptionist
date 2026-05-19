"use client";

import { motion } from "framer-motion";
import { 
    Download, RefreshCw, History, CreditCard, Wallet, Activity, Phone, MessageSquare, CheckCircle2, ChevronRight, Zap, Loader2, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getBillingData, createSubscription, createTopupOrder, cancelSubscription, toggleAutoRecharge, resumeSubscription, syncSubscriptionStatus, startTrial, createStripeCheckout, createStripePortal, cancelStripeSubscription } from "./actions";
import { getRegionConfig, detectCountryCode, getOveragePricing, type RegionConfig } from "@/lib/billing/regionConfig";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BillingPage() {
    const [autoRecharge, setAutoRecharge] = useState(true);
    const [billingData, setBillingData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [detectedCountry, setDetectedCountry] = useState<string>("US");
    const [regionConfig, setRegionConfig] = useState<RegionConfig>(getRegionConfig("US"));
    const [stripeSuccess, setStripeSuccess] = useState(false);
    const searchParams = useSearchParams();
    const reason = searchParams.get("reason");
    const showBanner = reason === "plan_expired" || reason === "subscription_required";

    // Detect ?stripe=success redirect
    useEffect(() => {
        if (searchParams.get("stripe") === "success") {
            setStripeSuccess(true);
            setTimeout(() => fetchData(), 2000); // re-fetch to get updated status
        }
    }, []);

    const fetchData = async () => {
        try {
            const data = await getBillingData();
            setBillingData(data);
            setAutoRecharge(data?.clinic?.auto_recharge ?? true);
            
            // 🧪 TEST MODE: Force US/Stripe for testing — revert after done
            const country = "US";
            // const country = data?.clinic?.country_code || await detectCountryCode(); // ← real routing
            setDetectedCountry(country);
            setRegionConfig(getRegionConfig(country));
        } catch (e) {
            console.error("Billing fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Load Razorpay Script
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handleSubscribe = async () => {
        setProcessing(true);
        // Route by detected billing provider
        if (regionConfig.provider === "stripe") {
            try {
                const data = await createStripeCheckout();
                if (data.status === "success" && data.url) {
                    window.location.href = data.url; // redirect to Stripe Checkout
                } else {
                    alert("Error: " + (data.detail || "Could not create checkout session."));
                    setProcessing(false);
                }
            } catch (e) {
                console.error("Stripe checkout error:", e);
                setProcessing(false);
            }
            return;
        }
        // India → Razorpay
        try {
            const data = await createSubscription();
            if (data.status === "success") {
                const options = {
                    key: data.key_id,
                    subscription_id: data.subscription_id,
                    name: "AI Voice Receptionist",
                    description: "Growth Plan Monthly Subscription",
                    handler: async function (response: any) {
                        try { await syncSubscriptionStatus(); } catch (err) { console.error("Sync failed:", err); }
                        alert("Subscription successful!");
                        window.location.reload();
                    },
                    modal: { ondismiss: function () { setProcessing(false); } },
                    theme: { color: "#a3a6ff" }
                };
                const rzp = new window.Razorpay(options);
                rzp.open();
            } else {
                alert("Error: " + (data.detail?.message || data.detail || "Subscription failed"));
                setProcessing(false);
            }
        } catch (e) {
            console.error("Subscription error:", e);
            setProcessing(false);
        }
    };

    const handleResume = async () => {
        setProcessing(true);
        try {
            const data = await resumeSubscription();
            if (data.status === "success") {
                alert(data.message);
                window.location.reload();
            } else {
                const msg = data.detail?.message || data.detail || "Unable to resume subscription.";
                alert(msg);
            }
        } catch (e: any) {
            console.error("Resume error:", e);
            alert("This subscription type (UPI) cannot be resumed after cancellation. You will need to re-subscribe after the current plan expires.");
        } finally {
            setProcessing(false);
        }
    };

    const handleTopup = async (amount: number) => {
        setProcessing(true);
        try {
            const currency = detectedCountry === 'IN' ? 'INR' : 'USD';
            const data = await createTopupOrder(amount, currency);
            if (data.status === "success") {
                const options = {
                    key: data.key_id,
                    amount: data.amount,
                    currency: data.currency,
                    name: "AI Voice Bot",
                    description: "Wallet Top-up",
                    order_id: data.order_id,
                    handler: function (response: any) {
                        alert("Top-up successful!");
                        window.location.reload();
                    },
                    modal: {
                        ondismiss: function () { setProcessing(false); }
                    },
                    theme: { color: "#a3a6ff" }
                };
                const rzp = new window.Razorpay(options);
                rzp.open();
            }
        } catch (e) {
            console.error("Top-up error:", e);
            setProcessing(false);
        }
    };

    const handleCancel = async () => {
        if (regionConfig.provider === "stripe") {
            if (!confirm("Your benefits remain active until end of billing period. Continue?")) return;
            setProcessing(true);
            try {
                const data = await cancelStripeSubscription();
                if (data.status === "success") { alert(data.message); window.location.reload(); }
                else alert("Error: " + (data.detail || "Cancellation failed"));
            } catch (e) { console.error("Stripe cancel error:", e); }
            finally { setProcessing(false); }
            return;
        }
        // Razorpay cancel
        const upiWarning = detectedCountry === 'IN' ? "\n\nWARNING: For UPI payments, this action cannot be undone via this dashboard. You will need to re-subscribe after your current plan expires." : "";
        if (!confirm(`Your benefits will remain active until the end of the billing cycle. Continue?${upiWarning}`)) return;
        setProcessing(true);
        try {
            const data = await cancelSubscription();
            if (data.status === "success") { alert(data.message); window.location.reload(); }
            else alert("Error: " + (data.detail?.message || data.detail || "Cancellation failed"));
        } catch (e) { console.error("Cancellation error:", e); }
        finally { setProcessing(false); }
    };

    const handleManagePlan = async () => {
        if (regionConfig.provider !== "stripe") return;
        setProcessing(true);
        try {
            const data = await createStripePortal();
            if (data.status === "success" && data.url) {
                window.location.href = data.url;
            } else {
                alert("Could not open billing portal: " + (data.detail || "Unknown error"));
                setProcessing(false);
            }
        } catch (e) {
            console.error("Portal error:", e);
            setProcessing(false);
        }
    };

    const handleToggleAutoRecharge = async (enabled: boolean) => {
        setAutoRecharge(enabled);
        try {
            await toggleAutoRecharge(enabled);
        } catch (e) {
            console.error("Toggle error:", e);
        }
    };

    const handleStartTrial = async () => {
        setProcessing(true);
        try {
            const data = await startTrial();
            if (data.status === "success") {
                alert(`🎉 Your 7-day free trial is now active! You have ${data.minutes_limit} AI voice minutes to use.`);
                window.location.reload();
            } else {
                alert("Error: " + (data.detail?.message || data.detail || "Could not start trial"));
            }
        } catch (e) {
            console.error("Trial start error:", e);
            alert("Failed to activate trial. Please try again.");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return (
        <div className="flex h-[80vh] items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#a3a6ff] animate-spin" />
        </div>
    );

    const clinic = billingData?.clinic;
    const activeNumbers = billingData?.numbers.filter((n: any) => n.status === "Active").length || 0;
    
    // Region-aware currency and provider
    const { currency, symbol, provider, priceDisplay: price } = regionConfig;
    const overage = getOveragePricing(currency);
    
    const usage = {
        minutes: { 
            used: clinic?.monthly_minutes_used || 0, 
            total: clinic?.monthly_minutes_limit || 500, 
            percent: Math.min(100, ((clinic?.monthly_minutes_used || 0) / (clinic?.monthly_minutes_limit || 500)) * 100) 
        },
        sms: { 
            used: clinic?.monthly_sms_used || 0, 
            total: clinic?.monthly_sms_limit || 500, 
            percent: Math.min(100, ((clinic?.monthly_sms_used || 0) / (clinic?.monthly_sms_limit || 500)) * 100) 
        },
        numbers: { used: activeNumbers, total: 1, overage: Math.max(0, activeNumbers - 1) },
        wallet_balance: clinic?.wallet_balance || 0,
        status: clinic?.subscription_status || 'inactive'
    };

    const isEligibleForTrial = usage.status === 'inactive' && !billingData?.transactions?.length;
    const isOnTrial = usage.status === 'trial';
    const trialEndsAt = clinic?.trial_ends_at ? new Date(clinic.trial_ends_at) : null;
    const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

    return (
        <div className="w-full pb-24 pt-2 font-['Inter']">
            <div className="max-w-7xl mx-auto space-y-10">

                {/* ── Stripe Success Banner ── */}
                {stripeSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-4 border rounded-2xl p-5 bg-emerald-500/5 border-emerald-500/30"
                    >
                        <div className="p-2 rounded-xl flex-shrink-0 bg-emerald-500/10">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-emerald-400">🎉 Subscription Activated!</p>
                            <p className="text-xs text-white/50 mt-1">Your payment was successful. Your AI Voice Agent is now fully active.</p>
                        </div>
                    </motion.div>
                )}

                {/* ── Trial Active Banner ── */}
                {isOnTrial && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-4 border rounded-2xl p-5 bg-emerald-500/5 border-emerald-500/30"
                    >
                        <div className="p-2 rounded-xl flex-shrink-0 bg-emerald-500/10">
                            <Zap className="w-5 h-5 text-emerald-400 fill-current" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-emerald-400">🎉 Free Trial Active — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining</p>
                            <p className="text-xs text-white/50 mt-1">
                                You have {usage.minutes.total} trial minutes and {usage.sms.total} SMS. Subscribe before your trial ends to keep full access.
                                {trialEndsAt && ` Trial expires on ${trialEndsAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* ── Dynamic Banner (Welcome for New / Expired for Past Users) ── */}
                {showBanner && usage.status !== 'active' && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "flex items-start gap-4 border rounded-2xl p-5",
                            billingData?.transactions?.length > 0 
                                ? "bg-red-500/5 border-red-500/30" 
                                : "bg-[#a3a6ff]/5 border-[#a3a6ff]/30"
                        )}
                    >
                        <div className={cn(
                            "p-2 rounded-xl flex-shrink-0",
                            billingData?.transactions?.length > 0 ? "bg-red-500/10" : "bg-[#a3a6ff]/10"
                        )}>
                            {billingData?.transactions?.length > 0 
                                ? <AlertTriangle className="w-5 h-5 text-red-400" /> 
                                : <Zap className="w-5 h-5 text-[#a3a6ff] fill-current" />
                            }
                        </div>
                        <div className="flex-1">
                            <p className={cn(
                                "text-sm font-bold",
                                billingData?.transactions?.length > 0 ? "text-red-400" : "text-white"
                            )}>
                                {billingData?.transactions?.length > 0 ? "Your Plan Has Expired" : "Welcome! Let's Get Your AI Voice Agent Live"}
                            </p>
                            <p className="text-xs text-white/50 mt-1">
                                {billingData?.transactions?.length > 0 
                                    ? "Your billing cycle ended and your subscription was not renewed. Please resubscribe below to restore full access." 
                                    : "You're one step away! Start your subscription below to activate your AI Voice Agent and begin taking calls."}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Header Section */}
                <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-4xl font-extrabold tracking-tight mb-2 text-[#f9f5f8] font-['Plus_Jakarta_Sans']">Billing & Usage</h2>
                        <div className="flex items-center gap-2">
                           <p className="text-[#adaaad]">Manage your subscription and track costs.</p>
                           <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[#a3a6ff] font-bold">
                               DETECTOR: {detectedCountry} ({currency})
                           </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Subscription & Quotas */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Current Plan Card */}
                        <section className="bg-gradient-to-br from-[#1C1B1D] to-[#131315] border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#a3a6ff]/5 blur-3xl rounded-full -mr-20 -mt-20 group-hover:bg-[#a3a6ff]/10 transition-colors duration-700"></div>
                            <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="bg-[#a3a6ff]/10 text-[#a3a6ff] p-2 rounded-xl border border-[#a3a6ff]/20">
                                            <Zap className="w-5 h-5 fill-current" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight">Growth Plan</h3>
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase tracking-widest border px-2 py-1 rounded",
                                            usage.status === 'active' ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20" : 
                                            usage.status === 'cancelling' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                                            "bg-red-500/10 text-red-500 border-red-500/20"
                                        )}>
                                            {usage.status === 'cancelled' ? 'CANCELLED' : usage.status === 'cancelling' ? 'CANCELLING' : usage.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-[#adaaad] text-sm md:pr-12 leading-relaxed">
                                        Includes 1 Phone Number, 500 AI Voice Minutes, and 500 Automated SMS.
                                    </p>
                                    {usage.status === 'cancelling' && (
                                        <p className="text-xs text-orange-400/80 mt-2 flex items-center gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                            Your plan is cancelled but remains active until the end of the current billing period
                                            {clinic?.subscription_end_date && (
                                                <span className="font-bold text-orange-400">
                                                    {" "}({new Date(clinic.subscription_end_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })})
                                                </span>
                                            )}.
                                            You will lose access after that date.
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-white tracking-tighter">{symbol}{price}</span>
                                        <span className="text-[#adaaad] text-sm font-medium">/ mo</span>
                                    </div>
                                    <p className="text-[11px] text-[#adaaad]">Renews Monthly</p>
                                </div>
                            </div>
                            <div className="relative z-10 mt-8 flex flex-col sm:flex-row gap-3">
                                {usage.status === 'inactive' || usage.status === 'pending' || usage.status === 'cancelled' ? (
                                    <>
                                        {isEligibleForTrial && (
                                            <button
                                                disabled={processing}
                                                onClick={handleStartTrial}
                                                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all active:scale-95 shadow-sm text-sm flex items-center gap-2 shadow-emerald-500/20"
                                            >
                                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                                Start 7-Day Free Trial
                                            </button>
                                        )}
                                        <button 
                                            disabled={processing}
                                            onClick={handleSubscribe}
                                            className="px-6 py-3 bg-[#a3a6ff] hover:bg-[#8d90fa] text-black font-bold rounded-xl transition-all active:scale-95 shadow-sm text-sm flex items-center gap-2"
                                        >
                                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                            {usage.status === 'cancelled' ? "Restart Subscription" : "Start Subscription"}
                                        </button>
                                    </>
                                ) : isOnTrial ? (
                                    <button 
                                        disabled={processing}
                                        onClick={handleSubscribe}
                                        className="px-6 py-3 bg-[#a3a6ff] hover:bg-[#8d90fa] text-black font-bold rounded-xl transition-all active:scale-95 shadow-sm text-sm flex items-center gap-2"
                                    >
                                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                        Upgrade to Full Plan
                                    </button>
                                ) : (
                                    <>
                                        {usage.status === 'cancelling' ? (
                                            <button 
                                                disabled={processing}
                                                onClick={handleResume}
                                                className="px-6 py-3 bg-[#a3a6ff] hover:bg-[#8d90fa] text-black font-bold rounded-xl transition-all active:scale-95 shadow-sm text-sm flex items-center gap-2"
                                            >
                                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                Resume Subscription
                                            </button>
                                        ) : (
                                            <>
                                                <button 
                                                    disabled={processing}
                                                    onClick={regionConfig.provider === 'stripe' ? handleManagePlan : undefined}
                                                    className="px-6 py-3 bg-white hover:bg-gray-100 text-black font-bold rounded-xl transition-all active:scale-95 shadow-sm text-sm flex items-center gap-2"
                                                >
                                                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                                    {regionConfig.provider === 'stripe' ? 'Manage Plan' : 'Manage Plan'}
                                                </button>
                                                <button 
                                                    disabled={processing}
                                                    onClick={handleCancel}
                                                    className="px-6 py-3 bg-[#262528] hover:bg-[#2c2c2f] text-white border border-white/10 font-bold rounded-xl transition-all active:scale-95 text-sm flex items-center gap-2"
                                                >
                                                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                                    Cancel Subscription
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                            <p className="text-[10px] text-[#adaaad] mt-4 italic opacity-70">
                                * Pricing and currency are automatically selected based on your clinic's location.
                            </p>
                        </section>

                        {/* Monthly Quota Trackers */}
                        <section className="bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
                            <h3 className="text-lg font-bold text-white mb-6 font-['Plus_Jakarta_Sans']">Monthly Quota Breakdown</h3>
                            
                            <div className="space-y-8">
                                {/* AI Minutes */}
                                <div>
                                    <div className="flex justify-between items-end mb-3">
                                        <div className="flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-[#a3a6ff]" />
                                            <span className="text-sm font-bold text-[#f9f5f8]">AI Voice Minutes</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black font-['JetBrains_Mono'] text-white">{usage.minutes.used}</span>
                                            <span className="text-[#adaaad] text-xs"> / {usage.minutes.total} mins</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-[#131315] rounded-full h-3 border border-white/5 overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${usage.minutes.percent}%` }} 
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] h-full rounded-full"
                                        />
                                    </div>
                                    <p className="text-[11px] text-[#adaaad] mt-2 text-right">Overage: {overage.minuteRate} / min</p>
                                </div>

                                {/* SMS Config */}
                                <div>
                                    <div className="flex justify-between items-end mb-3">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4 text-[#10b981]" />
                                            <span className="text-sm font-bold text-[#f9f5f8]">Automated SMS</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black font-['JetBrains_Mono'] text-white">{usage.sms.used}</span>
                                            <span className="text-[#adaaad] text-xs"> / {usage.sms.total} msg</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-[#131315] rounded-full h-3 border border-white/5 overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${usage.sms.percent}%` }} 
                                            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                                            className={cn("h-full rounded-full", usage.sms.percent > 80 ? "bg-gradient-to-r from-orange-400 to-[#ff6e84]" : "bg-gradient-to-r from-[#10b981] to-emerald-400")}
                                        />
                                    </div>
                                    <p className="text-[11px] text-[#adaaad] mt-2 text-right">Overage: {overage.smsRate} / msg</p>
                                </div>

                                {/* Phone Numbers */}
                                <div>
                                    <div className="flex justify-between items-end mb-3">
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-[#ffb2b9]" />
                                            <span className="text-sm font-bold text-[#f9f5f8]">Phone Numbers</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black font-['JetBrains_Mono'] text-white">{usage.numbers.used}</span>
                                            <span className="text-[#adaaad] text-xs"> / {usage.numbers.total} incl.</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-[#131315] rounded-full h-3 border border-white/5 overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: usage.numbers.used > usage.numbers.total ? '100%' : `${(usage.numbers.used / usage.numbers.total) * 100}%` }} 
                                            transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                                            className={cn("h-full rounded-full bg-gradient-to-r", usage.numbers.overage > 0 ? "from-[#ff6e84] to-red-600" : "from-[#ffb2b9] to-pink-400")}
                                        />
                                    </div>
                                    <p className="text-[11px] text-[#adaaad] mt-2 text-right">
                                        {usage.numbers.overage > 0 
                                            ? <span className="text-[#ff6e84] font-medium">Overage: {usage.numbers.overage} extra number(s) × {overage.numberRate}</span>
                                            : `Overage: ${overage.numberRate} per extra number`
                                        }
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Wallet & Invoices */}
                    <div className="space-y-8">
                        {/* Prepaid Wallet */}
                        <section className="bg-gradient-to-br from-[#262528] to-[#1C1B1D] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-[#a3a6ff]/20 transition-all">
                            <div className="flex items-center gap-3 mb-6">
                                <Wallet className="w-5 h-5 text-[#a3a6ff]" />
                                <h3 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">Overage Wallet</h3>
                            </div>
                            
                            <p className="text-xs text-[#adaaad] mb-6 leading-relaxed">
                                Used automatically to cover extra minutes, SMS, or phone numbers once plan is exhausted.
                            </p>

                            <div className="bg-[#131315] border border-white/5 rounded-2xl p-6 mb-8 text-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#a3a6ff]/5 pointer-events-none"></div>
                                <span className="text-[#adaaad] uppercase tracking-[0.2em] text-[10px] font-bold block mb-2">Available Balance</span>
                                <span className="text-5xl font-black font-['JetBrains_Mono'] text-white tracking-tighter px-4">{symbol}{usage.wallet_balance.toFixed(2)}</span>
                            </div>

                            <button 
                                disabled={processing}
                                onClick={() => handleTopup(overage.topupAmount)}
                                className="w-full py-4 bg-[#a3a6ff] hover:bg-[#8d90fa] text-black font-bold rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(163,166,255,0.15)] mb-6 flex items-center justify-center gap-2"
                            >
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Add {symbol}{overage.topupAmount} to Wallet
                            </button>

                            <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        Auto-Recharge
                                    </h4>
                                    <p className="text-[10px] text-[#adaaad] mt-1 max-w-[150px]">Recharge {symbol}{overage.topupAmount} when balance drops below {symbol}{overage.autoRechargeThreshold}.</p>
                                </div>
                                <button 
                                    onClick={() => handleToggleAutoRecharge(!autoRecharge)}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors ease-in-out duration-200 outline-none",
                                        autoRecharge ? 'bg-[#a3a6ff]' : 'bg-[#48474a]/50'
                                    )}
                                >
                                    <span className={cn(
                                        "inline-block h-4 w-4 transform rounded-full bg-black transition ease-in-out duration-200 shadow-sm",
                                        autoRecharge ? 'translate-x-6' : 'translate-x-1'
                                    )} />
                                </button>
                            </div>
                        </section>

                        {/* Recent Transactions */}
                        <section className="bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
                                    <History className="w-4 h-4 text-[#a3a6ff]" />
                                    Billing History
                                </h3>
                            </div>
                            
                            <div className="space-y-4">
                                {billingData?.transactions && billingData.transactions.length > 0 ? (
                                    billingData.transactions.map((tx: any) => (
                                        <div key={tx.id} className="flex flex-col gap-1 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm font-semibold text-white">{tx.description}</span>
                                                <span className="text-sm font-black font-['JetBrains_Mono'] text-white">{symbol}{tx.amount}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-[10px] text-[#adaaad]">{new Date(tx.created_at).toLocaleDateString()}</span>
                                                <span className={cn(
                                                    "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                                                    tx.status === 'success' ? "bg-[#10b981]/10 text-[#10b981]" : "bg-red-500/10 text-red-500"
                                                )}>
                                                    {tx.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[#adaaad] text-xs text-center py-4">No transactions yet.</p>
                                )}
                            </div>
                            
                            <button className="w-full mt-6 py-2 flex items-center justify-center gap-1 text-xs font-bold text-[#a3a6ff] hover:text-white transition-colors">
                                View Full Invoice History <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
