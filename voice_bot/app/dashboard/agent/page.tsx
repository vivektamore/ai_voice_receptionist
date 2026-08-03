"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useFormStatus } from "react-dom";
import {
    Mic, Globe, Brain, Check, ChevronRight,
    User, Users, Building2, Clock, ShieldAlert, Plus, X,
    MessageSquare, PhoneCall, Loader2, Fingerprint, CalendarCheck, HelpCircle, AlertTriangle, Mail, Smile, Globe2, CheckSquare, Lightbulb, Sparkles, Lock, Zap
} from "lucide-react";
import { saveClinicSettings } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ── Config options ─────────────────────────────────────────────────────────────
const voices = [
    { id: "priya", label: "Aria", gender: "female", desc: "Female / Warm & Professional", recommended: true },
    { id: "tarun", label: "Marcus", gender: "male", desc: "Male / Authoritative & Calm", recommended: false },
    { id: "meera", label: "Elena", gender: "female", desc: "Female / High-Energy & Friendly", recommended: false },
    { id: "arjun", label: "Julian", gender: "male", desc: "Male / Soft & Empathetic", recommended: false },
];

const callModes = [
    { id: "booking_only", label: "Booking Focus", desc: "Prioritize scheduling appointments", icon: CalendarCheck },
    { id: "booking_inquiry", label: "Inquiry Answering", desc: "Focus on FAQ and information", icon: HelpCircle },
];

const personalities = [
    { id: "friendly", label: "Friendly Receptionist", desc: "Warm, bubbly, and extremely approachable.", icon: User },
    { id: "professional", label: "Clinical Assistant", desc: "Precise, professional, and efficient.", icon: Brain },
    { id: "sales", label: "Sales-Focused", desc: "Persuasive, upbeat, and goal-oriented.", icon: Users },
    { id: "empathetic", label: "Calm/Empathetic", desc: "Soft-spoken, patient, and deeply caring.", icon: Smile },
    { id: "direct", label: "Direct & Concise", desc: "Straight to the point. Minimal small talk.", icon: MessageSquare },
    { id: "enthusiastic", label: "High-Energy", desc: "Upbeat, energetic, and highly welcoming.", icon: Zap },
    { id: "custom", label: "Custom Tone", desc: "Write your own custom tone instructions.", icon: Sparkles },
];

export default function AgentSettingsPage() {
    const searchParams = useSearchParams();
    const isSetupRequired = searchParams?.get("setup_required") === "true";

    // Shared State
    const [selectedVoice, setSelectedVoice] = useState("priya");
    const [selectedLang, setSelectedLang] = useState("en");
    const [secLang, setSecLang] = useState("none");
    const [autoDetect, setAutoDetect] = useState(true);
    const [selectedPersonality, setSelectedPersonality] = useState("professional");
    const [customTone, setCustomTone] = useState("");
    const [customPrompt, setCustomPrompt] = useState("");
    const [clinicName, setClinicName] = useState("");
    const [greetingMessage, setGreetingMessage] = useState("");

    const [workingHours, setWorkingHours] = useState("");
    const [emergencyHandling, setEmergencyHandling] = useState(false);
    const [callHandlingMode, setCallHandlingMode] = useState("booking_inquiry");
    const [postCallFollowUp, setPostCallFollowUp] = useState(false);
    const [bookingFocus, setBookingFocus] = useState(true);
    const [inquiryAnswering, setInquiryAnswering] = useState(true);

    // Collection fields — preset + custom
    const presetFields = ["Full Name", "Phone", "Date/Time", "Service Type", "Notes", "Insurance"];
    const [collectionFields, setCollectionFields] = useState<string[]>(["Full Name", "Phone", "Date/Time", "Service Type"]);
    const [customFieldInput, setCustomFieldInput] = useState("");
    const [customFields, setCustomFields] = useState<string[]>([]);

    // Special offers / clinic-specific message injected into AI prompt
    const [customMessage, setCustomMessage] = useState("");

    const [loading, setLoading] = useState(true);
    const [hasNumber, setHasNumber] = useState(false);
    const [hasSubscription, setHasSubscription] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from("clinics").select("*").eq("user_id", user.id).single();
                if (data) {
                    setHasNumber(!!(data.assigned_number));
                    setHasSubscription(['active', 'cancelling', 'trial'].includes(data.subscription_status));
                    if (data.name && data.name !== "My Setup Clinic") setClinicName(data.name);
                    if (data.voice) setSelectedVoice(data.voice);
                    if (data.language) setSelectedLang(data.language);
                    if (data.personality) {
                        if (data.personality.startsWith("custom:")) {
                            setSelectedPersonality("custom");
                            setCustomTone(data.personality.substring(7));
                        } else {
                            setSelectedPersonality(data.personality);
                        }
                    }
                    if (data.custom_prompt) setCustomPrompt(data.custom_prompt);
                    if (data.greeting_message) setGreetingMessage(data.greeting_message);
                    if (data.working_hours) setWorkingHours(data.working_hours);
                    if (data.emergency_handling) setEmergencyHandling(data.emergency_handling);
                    if (data.call_handling_mode) setCallHandlingMode(data.call_handling_mode);
                    if (data.post_call_follow_up !== undefined) setPostCallFollowUp(data.post_call_follow_up);
                    if (data.secondary_language) setSecLang(data.secondary_language);
                    if (data.collection_fields) {
                        const allSaved = data.collection_fields.split(",").map((f: string) => f.trim()).filter(Boolean);
                        const preset = presetFields;
                        const presetActive = allSaved.filter((f: string) => preset.includes(f));
                        const custom = allSaved.filter((f: string) => !preset.includes(f));
                        if (presetActive.length > 0) setCollectionFields(presetActive);
                        if (custom.length > 0) setCustomFields(custom);
                    }
                    if (data.custom_message) setCustomMessage(data.custom_message);
                }
            }
            setLoading(false);
        };
        loadSettings();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-[50vh]">
            <Loader2 className="animate-spin text-indigo-400" size={32} />
        </div>
    );

    const SubmitButton = () => {
        const { pending } = useFormStatus();
        return (
            <div className="flex justify-end items-center gap-4 pt-8 border-t border-white/5">
                <button type="button" className="px-6 py-2.5 rounded-full text-sm font-semibold text-white/80 hover:bg-white/5 transition-all">Discard Changes</button>
                <button
                    type="submit"
                    disabled={pending}
                    className="flex items-center gap-2 px-8 py-2.5 rounded-full text-sm font-bold bg-[#6366F1] text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                    {pending ? <Loader2 size={16} className="animate-spin" /> : null}
                    {pending ? "Saving..." : "Update AI Agent"}
                </button>
            </div>
        );
    };

    return (
        <div className="w-full pb-16 pt-2">
            {isSetupRequired && (
                <div className="max-w-7xl mx-auto mb-6">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/5"
                    >
                        <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-sm">Action Required: Configure Your Agent</h3>
                            <p className="text-xs text-amber-400/80 mt-1 leading-relaxed">
                                You cannot deploy your AI Receptionist until you complete its initial configuration. Please customize your clinic's greeting and identity below, then click "Update AI Agent" to save.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}

            <form action={saveClinicSettings} className="w-full">
                {/* Hidden Inputs for Form Data passing to Supabase Actions */}
                <input type="hidden" name="voice" value={selectedVoice} />
                <input type="hidden" name="language" value={selectedLang} />
                <input type="hidden" name="personality" value={selectedPersonality} />
                <input type="hidden" name="custom_tone" value={customTone} />
                <input type="hidden" name="custom_prompt" value={customPrompt} />
                <input type="hidden" name="emergency_handling" value={emergencyHandling.toString()} />
                <input type="hidden" name="call_handling_mode" value={callHandlingMode} />
                <input type="hidden" name="secondary_lang" value={secLang} />
                <input type="hidden" name="auto_detect" value={autoDetect.toString()} />
                <input type="hidden" name="post_call_follow_up" value={postCallFollowUp.toString()} />
                <input type="hidden" name="booking_focus" value={bookingFocus.toString()} />
                <input type="hidden" name="inquiry_answering" value={inquiryAnswering.toString()} />
                <input type="hidden" name="collection_fields" value={[...collectionFields, ...customFields].join(",")} />
                <input type="hidden" name="custom_message" value={customMessage} />

                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h2 className="text-[#c0c1ff] font-['Plus_Jakarta_Sans'] font-semibold text-2xl">Agent Setup</h2>
                        <p className="text-white/60 text-sm mt-1">Configure your clinical assistant's intelligence layout</p>
                    </div>

                    {/* ── Go Live Gate Banner — contextual based on what's missing ── */}
                    {(!hasNumber || !hasSubscription) && (() => {
                        const canGoLive = hasNumber && hasSubscription;
                        if (canGoLive) return null;

                        let icon = <Lock className="w-5 h-5 text-amber-400" />;
                        let title = "";
                        let desc = "";
                        let ctaHref = "";
                        let ctaLabel = "";

                        if (!hasSubscription && !hasNumber) {
                            title = "Subscribe + Get a Number to Go Live";
                            desc = "You need an active plan AND a phone number before your AI can answer real calls.";
                            ctaHref = "/dashboard/billing";
                            ctaLabel = "View Plans";
                        } else if (hasSubscription && !hasNumber) {
                            icon = <Zap className="w-5 h-5 text-emerald-400" />;
                            title = "Get Your FREE Included Number";
                            desc = "Your plan is active 🎉 — get your included phone number to start receiving calls!";
                            ctaHref = "/dashboard/numbers";
                            ctaLabel = "Get Free Number →";
                        } else {
                            title = "Subscribe to Activate Your Agent";
                            desc = "You have a number, but no active plan. Subscribe to start routing calls to your AI.";
                            ctaHref = "/dashboard/billing";
                            ctaLabel = "Subscribe Now";
                        }

                        return (
                            <div className={`mb-6 flex items-start gap-4 rounded-2xl p-5 border ${hasSubscription && !hasNumber
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : "bg-amber-500/5 border-amber-500/20"
                                }`}>
                                <div className={`p-2 rounded-xl flex-shrink-0 ${hasSubscription && !hasNumber ? "bg-emerald-500/10" : "bg-amber-500/10"
                                    }`}>
                                    {icon}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-bold ${hasSubscription && !hasNumber ? "text-emerald-400" : "text-amber-400"}`}>{title}</p>
                                    <p className="text-xs text-white/50 mt-1">{desc}</p>
                                </div>
                                <a
                                    href={ctaHref}
                                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border ${hasSubscription && !hasNumber
                                            ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400"
                                            : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400"
                                        }`}
                                >
                                    <Zap className="w-3.5 h-3.5" />
                                    {ctaLabel}
                                </a>
                            </div>
                        );
                    })()}

                    {/* Bento Grid Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* Identity Settings (7 Cols) */}
                        <section className="lg:col-span-7 bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Fingerprint className="text-[#c0c1ff] w-4 h-4" />
                                <h3 className="text-[11px] font-bold tracking-widest uppercase text-white/50">Identity Settings</h3>
                            </div>
                            <div className="space-y-5">
                                <div className="group">
                                    <label className="block text-[11px] font-semibold text-white/50 mb-2 uppercase tracking-wide">Clinic Name</label>
                                    <input
                                        type="text"
                                        name="clinic_name"
                                        value={clinicName}
                                        onChange={e => setClinicName(e.target.value)}
                                        className="w-full bg-[#0E0E10] border-0 border-b border-white/10 focus:border-[#c0c1ff] focus:ring-0 text-white py-3 transition-all duration-300 rounded-t-lg px-4"
                                        placeholder="e.g. Luminary Health Center"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-white/50 mb-2 uppercase tracking-wide">Greeting Template</label>
                                    <textarea
                                        name="greeting_message"
                                        value={greetingMessage}
                                        onChange={e => setGreetingMessage(e.target.value)}
                                        className="w-full bg-[#0E0E10] border-0 border-b border-white/10 focus:border-[#c0c1ff] focus:ring-0 text-white py-3 resize-none transition-all duration-300 rounded-t-lg px-4"
                                        placeholder="Hello, thank you for calling [Clinic Name]. How can I assist you today?"
                                        rows={3}
                                        required
                                    />
                                    <p className="text-[10px] text-white/40 mt-1.5 flex items-center gap-1.5">
                                        <Sparkles className="w-3 h-3 text-[#c0c1ff]" />
                                        <span>Use <strong className="text-white/70">[Clinic Name]</strong> as a placeholder. Patient name is collected naturally during the call.</span>
                                    </p>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wide">Voice Selection</label>
                                        <span className="text-[10px] font-bold text-[#c0c1ff]/80 bg-[#c0c1ff]/10 px-2.5 py-0.5 rounded-full border border-[#c0c1ff]/20">
                                            ⚡ Auto Multi-Model Failover
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {voices.map(v => (
                                            <div
                                                key={v.id}
                                                onClick={() => setSelectedVoice(v.id)}
                                                className={cn(
                                                    "p-5 rounded-2xl cursor-pointer transition-all border relative overflow-hidden group",
                                                    selectedVoice === v.id
                                                        ? "border-[#6366F1]/50 bg-[#6366F1]/10 shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                                                        : "border-white/5 bg-white/5 hover:bg-white/10"
                                                )}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <p className={cn("text-sm font-bold", selectedVoice === v.id ? "text-[#c0c1ff]" : "text-white")}>{v.label}</p>
                                                    {selectedVoice === v.id && <Check className="text-[#c0c1ff] w-4 h-4" />}
                                                </div>
                                                <p className="text-[11px] text-white/50 mt-1">{v.desc}</p>
                                                
                                                <div className="mt-3 flex items-center justify-between text-[9px] text-white/40 border-t border-white/5 pt-2.5">
                                                    <span>{v.models || "Sarvam • ElevenLabs • OpenAI"}</span>
                                                    <span className="text-emerald-400 font-semibold">Active</span>
                                                </div>

                                                {selectedVoice === v.id && (
                                                    <div className="mt-3 flex gap-1 h-1 items-center">
                                                        <div className="h-1 bg-[#6366F1] w-2 animate-pulse rounded-full"></div>
                                                        <div className="h-[2px] bg-[#6366F1]/30 w-full rounded-full"></div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-white/40 mt-2.5 flex items-center gap-1.5">
                                        <Zap className="w-3 h-3 text-amber-400" />
                                        <span>Automatically routes across <strong>Sarvam AI, ElevenLabs, Deepgram & OpenAI</strong> with instant failover fallback.</span>
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Conversation Control (5 Cols) */}
                        <section className="lg:col-span-5 bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-6">
                                    <Brain className="text-[#c0c1ff] w-4 h-4" />
                                    <h3 className="text-[11px] font-bold tracking-widest uppercase text-white/50">Conversation Control</h3>
                                </div>
                                <div className="space-y-3">
                                    {callModes.map(mode => (
                                        <div
                                            key={mode.id}
                                            onClick={() => setCallHandlingMode(mode.id)}
                                            className={cn(
                                                "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                                                callHandlingMode === mode.id
                                                    ? "bg-[#6366F1]/10 border-[#6366F1]/30 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                                                    : "bg-[#2A2A2C]/50 border-white/5 hover:border-white/10"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <mode.icon className={cn("w-5 h-5", callHandlingMode === mode.id ? "text-[#6366F1]" : "text-white/40")} />
                                                <div>
                                                    <p className={cn("text-sm font-semibold", callHandlingMode === mode.id ? "text-[#c0c1ff]" : "text-white")}>{mode.label}</p>
                                                    <p className="text-[10px] text-white/50">{mode.desc}</p>
                                                </div>
                                            </div>
                                            <div className={cn("w-10 h-5 rounded-full relative flex items-center px-1 transition-colors", callHandlingMode === mode.id ? "bg-[#6366F1]/20" : "bg-[#0E0E10]")}>
                                                <div className={cn("w-3 h-3 rounded-full absolute transition-all", callHandlingMode === mode.id ? "bg-[#6366F1] right-1" : "bg-white/40 left-1")} />
                                            </div>
                                        </div>
                                    ))}

                                    <div
                                        onClick={() => setEmergencyHandling(!emergencyHandling)}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                                            emergencyHandling
                                                ? "bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                                                : "bg-[#2A2A2C]/50 border-white/5 hover:border-white/10"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <AlertTriangle className={cn("w-5 h-5", emergencyHandling ? "text-red-400" : "text-white/40")} />
                                            <div>
                                                <p className={cn("text-sm font-semibold", emergencyHandling ? "text-red-400" : "text-white")}>Emergency Escalation</p>
                                                <p className={cn("text-[10px]", emergencyHandling ? "text-red-400/70" : "text-white/50")}>Instant human transfer for criticals</p>
                                            </div>
                                        </div>
                                        <div className={cn("w-10 h-5 rounded-full relative flex items-center px-1 transition-colors", emergencyHandling ? "bg-red-500/20" : "bg-[#0E0E10]")}>
                                            <div className={cn("w-3 h-3 rounded-full absolute transition-all", emergencyHandling ? "bg-red-400 right-1" : "bg-white/40 left-1")} />
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setPostCallFollowUp(!postCallFollowUp)}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                                            postCallFollowUp ? "bg-[#6366F1]/10 border-[#6366F1]/30" : "bg-[#2A2A2C]/50 border-white/5 hover:border-white/10"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <Mail className={cn("w-5 h-5", postCallFollowUp ? "text-[#6366F1]" : "text-white/40")} />
                                            <div>
                                                <p className={cn("text-sm font-semibold", postCallFollowUp ? "text-[#c0c1ff]" : "text-white")}>Post-call Follow-up</p>
                                                <p className="text-[10px] text-white/50">Send SMS or Email after hangup</p>
                                            </div>
                                        </div>
                                        <div className={cn("w-10 h-5 rounded-full relative flex items-center px-1 transition-colors", postCallFollowUp ? "bg-[#6366F1]/20" : "bg-[#0E0E10]")}>
                                            <div className={cn("w-3 h-3 rounded-full absolute transition-all", postCallFollowUp ? "bg-[#6366F1] right-1" : "bg-white/40 left-1")} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Personality Archetypes (12 Cols) */}
                        <section className="lg:col-span-12 bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8">
                            <div className="flex items-center gap-2 mb-6">
                                <Smile className="text-[#c0c1ff] w-4 h-4" />
                                <h3 className="text-[11px] font-bold tracking-widest uppercase text-white/50">Agent Personality Archetype</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {personalities.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setSelectedPersonality(p.id)}
                                        className={cn(
                                            "flex flex-col items-center text-center p-6 rounded-2xl border transition-all duration-300",
                                            selectedPersonality === p.id
                                                ? "border-[#6366F1]/50 bg-[#6366F1]/10 shadow-[0_0_20px_rgba(99,102,241,0.08)] scale-[1.02]"
                                                : "border-white/5 bg-white/5 opacity-70 hover:opacity-100 hover:scale-[1.01]"
                                        )}
                                    >
                                        <p.icon className={cn("w-8 h-8 mb-4", selectedPersonality === p.id ? "text-[#c0c1ff]" : "text-white/40")} />
                                        <p className={cn("text-sm font-bold", selectedPersonality === p.id ? "text-white" : "text-white/80")}>{p.label}</p>
                                        <p className="text-[11px] text-white/50 mt-2">{p.desc}</p>
                                    </button>
                                ))}
                            </div>

                            {selectedPersonality === "custom" && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="mt-6 p-4 rounded-xl bg-black/40 border border-white/10 space-y-2"
                                >
                                    <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wide">Custom Tone Description</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Sarcastic dental surgeon, extremely polite and formal, or cool Gen-Z receptionist..."
                                        value={customTone}
                                        onChange={e => setCustomTone(e.target.value)}
                                        className="w-full bg-[#0E0E10] border border-white/10 focus:border-[#6366F1] rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-colors"
                                        required={selectedPersonality === "custom"}
                                    />
                                </motion.div>
                            )}
                        </section>

                        {/* Multi-Language Logic (4 Cols) */}
                        <section className="lg:col-span-4 bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Globe2 className="text-[#c0c1ff] w-4 h-4" />
                                <h3 className="text-[11px] font-bold tracking-widest uppercase text-white/50">Language Stack</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Primary Language</label>
                                    <select
                                        className="w-full bg-[#0E0E10] border-0 border-b border-white/10 focus:border-[#c0c1ff] focus:ring-0 text-white text-sm py-3 px-3 rounded-t-lg outline-none"
                                        value={selectedLang}
                                        onChange={(e) => setSelectedLang(e.target.value)}
                                    >
                                        <option value="en">English (US)</option>
                                        <option value="es">Spanish</option>
                                        <option value="fr">French</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Secondary Language</label>
                                    <select
                                        className="w-full bg-[#0E0E10] border-0 border-b border-white/10 focus:border-[#c0c1ff] focus:ring-0 text-white text-sm py-3 px-3 rounded-t-lg outline-none"
                                        value={secLang}
                                        onChange={(e) => setSecLang(e.target.value)}
                                    >
                                        <option value="none">None</option>
                                        <option value="hi">Hindi</option>
                                        <option value="es_mx">Spanish (Mexico)</option>
                                    </select>
                                </div>
                                <div className="pt-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[13px] font-semibold text-white">Auto-Detect Routing</p>
                                        {autoDetect && <div className="w-2 h-2 bg-[#6366F1] rounded-full animate-pulse shadow-[0_0_10px_#6366F1]" />}
                                    </div>
                                    <div
                                        onClick={() => setAutoDetect(!autoDetect)}
                                        className={cn("w-12 h-6 rounded-full relative flex items-center px-1 cursor-pointer transition-colors", autoDetect ? "bg-[#6366F1]/30" : "bg-[#0E0E10]")}
                                    >
                                        <div className={cn("w-4 h-4 rounded-full absolute transition-all shadow-md", autoDetect ? "bg-[#c0c1ff] right-1" : "bg-white/40 left-1")} />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Booking Logic Collection Fields (8 Cols wide now) */}
                        <section className="lg:col-span-8 bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8">
                            <div className="flex items-center gap-2 mb-6">
                                <CheckSquare className="text-[#c0c1ff] w-4 h-4" />
                                <h3 className="text-[11px] font-bold tracking-widest uppercase text-white/50">Data Collection Fields</h3>
                                <span className="ml-auto text-[9px] text-white/30 uppercase tracking-widest">AI asks for these during every call</span>
                            </div>

                            {/* Preset Fields */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-2 mb-6">
                                {presetFields.map(field => {
                                    const isActive = collectionFields.includes(field);
                                    return (
                                        <label
                                            key={field}
                                            className="flex items-center gap-3 cursor-pointer group select-none"
                                            onClick={() => {
                                                setCollectionFields(prev =>
                                                    isActive ? prev.filter(f => f !== field) : [...prev, field]
                                                );
                                            }}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded border flex items-center justify-center transition-all flex-shrink-0",
                                                isActive ? "border-[#6366F1] bg-[#6366F1]/20" : "border-white/20 bg-black/20"
                                            )}>
                                                {isActive && <Check className="text-[#c0c1ff] w-3 h-3" />}
                                            </div>
                                            <span className={cn("text-xs font-semibold transition-colors", isActive ? "text-white" : "text-white/40")}>{field}</span>
                                        </label>
                                    );
                                })}
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-white/5 mb-5" />

                            {/* Custom Fields */}
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">Custom Fields</p>
                            <div className="space-y-2 mb-4">
                                {customFields.map(cf => (
                                    <div key={cf} className="flex items-center justify-between bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-lg px-3 py-2">
                                        <span className="text-xs font-semibold text-[#c0c1ff]">{cf}</span>
                                        <button type="button" onClick={() => setCustomFields(prev => prev.filter(f => f !== cf))}>
                                            <X className="w-3.5 h-3.5 text-white/40 hover:text-red-400 transition-colors" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customFieldInput}
                                    onChange={e => setCustomFieldInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            const val = customFieldInput.trim();
                                            if (val && !customFields.includes(val) && !presetFields.includes(val)) {
                                                setCustomFields(prev => [...prev, val]);
                                            }
                                            setCustomFieldInput("");
                                        }
                                    }}
                                    placeholder="e.g. Insurance Provider, Referral Source..."
                                    className="flex-1 bg-[#0E0E10] border border-white/10 focus:border-[#6366F1] rounded-lg px-3 py-2 text-xs text-white outline-none transition-colors placeholder:text-white/20"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const val = customFieldInput.trim();
                                        if (val && !customFields.includes(val) && !presetFields.includes(val)) {
                                            setCustomFields(prev => [...prev, val]);
                                        }
                                        setCustomFieldInput("");
                                    }}
                                    className="px-3 py-2 bg-[#6366F1]/20 hover:bg-[#6366F1]/40 border border-[#6366F1]/30 rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4 text-[#c0c1ff]" />
                                </button>
                            </div>
                        </section>

                        {/* Special Offers & Custom Message (4 Cols) */}
                        <section className="lg:col-span-4 bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="text-[#c0c1ff] w-4 h-4" />
                                <h3 className="text-[11px] font-bold tracking-widest uppercase text-white/50">Special Offers & Message</h3>
                            </div>
                            <p className="text-[11px] text-white/40 leading-relaxed">
                                Add any active offers, promotions, or custom instructions. The AI will mention these naturally during calls and in follow-up messages.
                            </p>
                            <textarea
                                value={customMessage}
                                onChange={e => setCustomMessage(e.target.value)}
                                rows={6}
                                placeholder={`e.g. "We are offering a free dental check-up for first-time patients this month. Mention this to every caller."`}
                                className="w-full bg-[#0E0E10] border border-white/10 focus:border-[#6366F1] rounded-xl px-4 py-3 text-xs text-white outline-none resize-none transition-colors placeholder:text-white/20 leading-relaxed"
                            />
                            {customMessage && (
                                <div className="flex items-start gap-2 bg-emerald-400/5 border border-emerald-400/20 rounded-lg px-3 py-2">
                                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-[10px] text-emerald-400">This message will be included in both inbound and outbound AI prompts automatically.</p>
                                </div>
                            )}
                        </section>

                        {/* Operational Hours & Fallback (4 Cols) */}
                        <section className="lg:col-span-4 bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 space-y-6">
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Clock className="text-[#c0c1ff] w-4 h-4" />
                                    <h3 className="text-[11px] font-bold tracking-widest uppercase text-white/50">Operating Hours</h3>
                                </div>
                                <input
                                    type="text"
                                    name="working_hours"
                                    value={workingHours}
                                    onChange={(e) => setWorkingHours(e.target.value)}
                                    className="w-full flex items-center justify-center text-center text-sm font-mono text-white py-2 px-3 bg-[#0E0E10] rounded-lg border border-white/10 outline-none focus:border-[#6366F1]"
                                    placeholder="08:00 AM — 06:00 PM"
                                />
                            </div>
                            <div className="p-4 bg-[#6366F1]/10 rounded-xl border border-[#6366F1]/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]">
                                <div className="flex items-center gap-2 mb-3">
                                    <Lightbulb className="text-[#6366F1] w-3 h-3" />
                                    <p className="text-[10px] font-bold text-[#6366F1] uppercase tracking-widest">Closed Fallback Script</p>
                                </div>
                                <p className="text-[11px] leading-relaxed italic text-[#c0c1ff]/80">
                                    "We are currently closed. Please leave your name and number, and we will return your call during business hours tomorrow."
                                </p>
                            </div>
                        </section>

                        {/* Custom Instructions & Knowledge Base (4 Cols) */}
                        <section className="lg:col-span-4 bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Brain className="text-[#c0c1ff] w-4 h-4" />
                                <h3 className="text-[11px] font-bold tracking-widest uppercase text-white/50">Custom Instructions & Knowledge</h3>
                            </div>
                            <p className="text-[11px] text-white/40 leading-relaxed">
                                Add details the AI must know: clinic doctors, parking instructions, pricing estimates, or clinic policies.
                            </p>
                            <textarea
                                value={customPrompt}
                                onChange={e => setCustomPrompt(e.target.value)}
                                rows={6}
                                placeholder={`e.g. "Dr. Vivek is the lead dentist. Parking is free behind the building. We do not accept insurance for teeth whitening."`}
                                className="w-full bg-[#0E0E10] border border-white/10 focus:border-[#6366F1] rounded-xl px-4 py-3 text-xs text-white outline-none resize-none transition-colors placeholder:text-white/20 leading-relaxed"
                            />
                        </section>

                    </div>

                    <SubmitButton />
                </div>
            </form>
        </div>
    );
}
