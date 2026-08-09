"use client";

import { useState } from "react";
import {
    ShieldCheck, Copy, CheckCheck, Phone, ChevronDown,
    PhoneForwarded, PhoneOff, PhoneMissed, Info, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────── */
type ForwardType = "all" | "busy" | "noanswer" | "unreachable";
type Carrier = {
    id: string;
    name: string;
    flag: string;
    country: string;
    codes: Record<ForwardType, string>;
    disableCodes: Record<ForwardType, string>;
    notes?: string;
};

/* ─── Carrier Database ──────────────────────────────────────── */
const CARRIERS: Carrier[] = [
    {
        id: "jio",
        name: "Jio",
        flag: "🇮🇳",
        country: "India",
        codes: {
            all: "*401*{NUMBER}#",
            busy: "*405*{NUMBER}#",
            noanswer: "*407*{NUMBER}#",
            unreachable: "*403*{NUMBER}#",
        },
        disableCodes: {
            all: "*402#",
            busy: "*406#",
            noanswer: "*408#",
            unreachable: "*404#",
        },
    },
    {
        id: "airtel",
        name: "Airtel",
        flag: "🇮🇳",
        country: "India",
        codes: {
            all: "*21*{NUMBER}#",
            busy: "*67*{NUMBER}#",
            noanswer: "*61*{NUMBER}#",
            unreachable: "*62*{NUMBER}#",
        },
        disableCodes: {
            all: "##21#",
            busy: "##67#",
            noanswer: "##61#",
            unreachable: "##62#",
        },
    },
    {
        id: "vi",
        name: "Vi (Vodafone Idea)",
        flag: "🇮🇳",
        country: "India",
        codes: {
            all: "*21*{NUMBER}#",
            busy: "*67*{NUMBER}#",
            noanswer: "*61*{NUMBER}#",
            unreachable: "*62*{NUMBER}#",
        },
        disableCodes: {
            all: "##21#",
            busy: "##67#",
            noanswer: "##61#",
            unreachable: "##62#",
        },
    },
    {
        id: "bsnl",
        name: "BSNL",
        flag: "🇮🇳",
        country: "India",
        codes: {
            all: "*21*{NUMBER}#",
            busy: "*67*{NUMBER}#",
            noanswer: "*61*{NUMBER}#",
            unreachable: "*62*{NUMBER}#",
        },
        disableCodes: {
            all: "##21#",
            busy: "##67#",
            noanswer: "##61#",
            unreachable: "##62#",
        },
        notes: "For BSNL landlines, contact your local exchange to enable call forwarding.",
    },
    {
        id: "att",
        name: "AT&T",
        flag: "🇺🇸",
        country: "US / Canada",
        codes: {
            all: "*21*{NUMBER}#",
            busy: "*67*{NUMBER}#",
            noanswer: "*61*{NUMBER}#",
            unreachable: "*62*{NUMBER}#",
        },
        disableCodes: {
            all: "##21#",
            busy: "##67#",
            noanswer: "##61#",
            unreachable: "##62#",
        },
    },
    {
        id: "verizon",
        name: "Verizon",
        flag: "🇺🇸",
        country: "US / Canada",
        codes: {
            all: "*72{NUMBER}",
            busy: "*71{NUMBER}",
            noanswer: "*71{NUMBER}",
            unreachable: "*72{NUMBER}",
        },
        disableCodes: {
            all: "*73",
            busy: "*73",
            noanswer: "*73",
            unreachable: "*73",
        },
        notes: "Dial the code, press Call, wait for a confirmation tone, then hang up.",
    },
    {
        id: "tmobile",
        name: "T-Mobile",
        flag: "🇺🇸",
        country: "US / Canada",
        codes: {
            all: "**21*{NUMBER}#",
            busy: "**67*{NUMBER}#",
            noanswer: "**61*{NUMBER}#",
            unreachable: "**62*{NUMBER}#",
        },
        disableCodes: {
            all: "##21#",
            busy: "##67#",
            noanswer: "##61#",
            unreachable: "##62#",
        },
    },
];

const FORWARD_TYPES: {
    id: ForwardType;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
}[] = [
    {
        id: "all",
        label: "All Calls",
        sublabel: "AI answers every call immediately",
        icon: <PhoneForwarded className="w-4 h-4" />,
    },
    {
        id: "busy",
        label: "When Busy",
        sublabel: "AI answers when you're on another call",
        icon: <PhoneOff className="w-4 h-4" />,
    },
    {
        id: "noanswer",
        label: "No Answer (15s)",
        sublabel: "AI takes over if you don't pick up",
        icon: <PhoneMissed className="w-4 h-4" />,
    },
    {
        id: "unreachable",
        label: "Unreachable / Off",
        sublabel: "AI answers when phone is off or no signal",
        icon: <Phone className="w-4 h-4" />,
    },
];

/* ─── Props ─────────────────────────────────────────────────── */
interface CarrierCheatSheetProps {
    clinicNumber?: string;
    targetBridgeNumber?: string;
    countryCode?: string;
}

export default function CarrierCheatSheet({
    clinicNumber,
    targetBridgeNumber = "+918071585859",
    countryCode = "IN",
}: CarrierCheatSheetProps) {
    const defaultCarrier = countryCode === "IN" ? "jio" : "att";
    const [selectedCarrierId, setSelectedCarrierId] = useState<string>(defaultCarrier);
    const [forwardType, setForwardType] = useState<ForwardType>("all");
    const [copied, setCopied] = useState<"enable" | "disable" | null>(null);
    const [carrierDropdownOpen, setCarrierDropdownOpen] = useState(false);

    const carrier = CARRIERS.find((c) => c.id === selectedCarrierId) ?? CARRIERS[0];

    const formatCode = (template: string) =>
        template.replace("{NUMBER}", targetBridgeNumber.replace(/\s/g, ""));

    const enableCode = formatCode(carrier.codes[forwardType]);
    const disableCode = carrier.disableCodes[forwardType];

    const copyToClipboard = (text: string, type: "enable" | "disable") => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const currentForwardDef = FORWARD_TYPES.find((f) => f.id === forwardType)!;

    return (
        <div className="w-full bg-[#131315] border border-emerald-500/20 rounded-2xl p-6 space-y-6 shadow-2xl">

            {/* Trust Banner */}
            <div className="flex items-start gap-4 pb-4 border-b border-white/5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                            Zero Number Change
                        </span>
                        <span className="text-[10px] uppercase font-bold text-[#adaaad]">
                            100% Patient Trust Retained
                        </span>
                    </div>
                    <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                        Keep Your Clinic Number{clinicNumber ? ` (${clinicNumber})` : ""}
                    </h3>
                    <p className="text-xs text-[#adaaad] leading-relaxed">
                        Patients keep calling the same number. Your handset quietly routes calls
                        to AI bridge{" "}
                        <code className="text-emerald-300 font-mono font-bold text-[11px]">
                            {targetBridgeNumber}
                        </code>{" "}
                        in the background — completely invisible to callers.
                    </p>
                </div>
            </div>

            {/* Step 1: Carrier Selector */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-[#adaaad]">
                    Step 1 — Select Your Mobile Carrier
                </label>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setCarrierDropdownOpen((v) => !v)}
                        className="w-full flex items-center justify-between bg-[#1C1B1D] border border-[#48474a]/40 rounded-xl px-4 py-3 text-white font-bold text-sm hover:border-emerald-500/40 transition-colors"
                    >
                        <span className="flex items-center gap-3">
                            <span className="text-2xl">{carrier.flag}</span>
                            <span>{carrier.name}</span>
                            <span className="text-[10px] text-[#adaaad] font-normal">{carrier.country}</span>
                        </span>
                        <ChevronDown
                            className={cn(
                                "w-4 h-4 text-[#adaaad] transition-transform",
                                carrierDropdownOpen && "rotate-180"
                            )}
                        />
                    </button>

                    {carrierDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-[#1C1B1D] border border-[#48474a]/40 rounded-xl overflow-hidden shadow-2xl">
                            {CARRIERS.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedCarrierId(c.id);
                                        setCarrierDropdownOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors text-left",
                                        selectedCarrierId === c.id
                                            ? "text-emerald-400 bg-emerald-400/5"
                                            : "text-[#f9f5f8]"
                                    )}
                                >
                                    <span className="text-xl">{c.flag}</span>
                                    <span className="font-bold">{c.name}</span>
                                    <span className="text-[10px] text-[#adaaad] ml-auto">{c.country}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Step 2: Forward Mode */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-[#adaaad]">
                    Step 2 — Choose Forwarding Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {FORWARD_TYPES.map((ft) => {
                        const isSelected = forwardType === ft.id;
                        return (
                            <button
                                key={ft.id}
                                type="button"
                                onClick={() => setForwardType(ft.id)}
                                className={cn(
                                    "flex items-start gap-3 p-3 rounded-xl border transition-all text-left",
                                    isSelected
                                        ? "border-emerald-500/50 bg-emerald-500/10"
                                        : "border-[#48474a]/30 bg-[#1C1B1D] hover:border-[#48474a]/60"
                                )}
                            >
                                <span
                                    className={cn(
                                        "mt-0.5 flex-shrink-0",
                                        isSelected ? "text-emerald-400" : "text-[#adaaad]"
                                    )}
                                >
                                    {ft.icon}
                                </span>
                                <span>
                                    <span
                                        className={cn(
                                            "block text-xs font-black",
                                            isSelected ? "text-emerald-400" : "text-[#f9f5f8]"
                                        )}
                                    >
                                        {ft.label}
                                    </span>
                                    <span className="block text-[10px] text-[#adaaad] mt-0.5 leading-tight">
                                        {ft.sublabel}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Step 3: USSD Code */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-[#adaaad] flex items-center gap-2">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    Step 3 — Dial This Code on{" "}
                    <span className="text-emerald-400">{clinicNumber || "Your Clinic Phone"}</span>
                </label>

                {/* Enable Code */}
                <div className="bg-[#0d0d0f] border border-emerald-500/30 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest">
                            Enable — {currentForwardDef.label}
                        </span>
                        <button
                            type="button"
                            onClick={() => copyToClipboard(enableCode, "enable")}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-[#adaaad] hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                        >
                            {copied === "enable" ? (
                                <>
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" /> Copy
                                </>
                            )}
                        </button>
                    </div>
                    <div className="px-5 py-4">
                        <code className="text-emerald-300 font-mono font-black text-xl tracking-wider break-all">
                            {enableCode}
                        </code>
                    </div>
                </div>

                {/* Disable Code */}
                <div className="bg-[#1C1B1D] border border-[#48474a]/30 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                        <span className="text-[10px] uppercase font-bold text-[#adaaad] tracking-widest">
                            To Disable Forwarding Later
                        </span>
                        <button
                            type="button"
                            onClick={() => copyToClipboard(disableCode, "disable")}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-[#adaaad] hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                        >
                            {copied === "disable" ? (
                                <>
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" /> Copy
                                </>
                            )}
                        </button>
                    </div>
                    <div className="px-5 py-3">
                        <code className="text-[#adaaad] font-mono font-bold text-base tracking-wider">
                            {disableCode}
                        </code>
                    </div>
                </div>
            </div>

            {/* Carrier Notes */}
            {carrier.notes && (
                <div className="flex items-start gap-3 bg-amber-400/5 border border-amber-400/20 rounded-xl p-3">
                    <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300/80 leading-relaxed">{carrier.notes}</p>
                </div>
            )}

            {/* How It Works — 3-Step Visual */}
            <div className="space-y-2">
                <p className="text-[10px] uppercase font-black tracking-widest text-[#adaaad]">
                    How It Works
                </p>
                <div className="flex items-center gap-2">
                    {[
                        { label: "1", text: `Patient dials ${clinicNumber || "your number"}` },
                        null,
                        { label: "2", text: "Carrier silently forwards" },
                        null,
                        { label: "3", text: "AI Receptionist answers instantly" },
                    ].map((item, idx) =>
                        item === null ? (
                            <div key={idx} className="text-[#48474a] font-bold flex-shrink-0">
                                →
                            </div>
                        ) : (
                            <div
                                key={idx}
                                className="flex-1 bg-[#1C1B1D] border border-[#48474a]/30 rounded-xl p-3 text-center min-w-0"
                            >
                                <div className="w-6 h-6 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center mx-auto mb-1.5">
                                    <span className="text-[10px] font-black text-emerald-400">
                                        {item.label}
                                    </span>
                                </div>
                                <p className="text-[10px] text-[#adaaad] leading-tight">{item.text}</p>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Trust Badges Footer */}
            <div className="flex items-center justify-center gap-5 pt-2 border-t border-white/5 flex-wrap">
                {[
                    { icon: "🔒", text: "No number change" },
                    { icon: "⚡", text: "1-min setup" },
                    { icon: "🆓", text: "Zero extra cost" },
                    { icon: "↩️", text: "Reversible anytime" },
                ].map((badge) => (
                    <div
                        key={badge.text}
                        className="flex items-center gap-1.5 text-[10px] text-[#adaaad] font-bold"
                    >
                        <span>{badge.icon}</span>
                        <span>{badge.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
