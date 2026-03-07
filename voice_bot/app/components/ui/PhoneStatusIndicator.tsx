"use client";

import { motion } from "framer-motion";
import { PhoneCall, Activity, AlertTriangle, ShieldCheck } from "lucide-react";

export interface PhoneStatusProps {
    number: string;
    status: "Active" | "Configuring" | "Offline" | "Error";
    clinicName?: string;
}

export function PhoneStatusIndicator({ number, status, clinicName }: PhoneStatusProps) {

    const getStatusConfig = () => {
        switch (status) {
            case "Active":
                return {
                    color: "text-emerald-400",
                    bg: "bg-emerald-400/10",
                    border: "border-emerald-400/20",
                    icon: ShieldCheck,
                    text: "Online via Vapi",
                    glow: "shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                };
            case "Configuring":
                return {
                    color: "text-blue-400",
                    bg: "bg-blue-400/10",
                    border: "border-blue-400/20",
                    icon: Activity,
                    text: "Mapping Webhooks...",
                    glow: "shadow-[0_0_20px_rgba(96,165,250,0.3)]"
                };
            case "Error":
                return {
                    color: "text-red-400",
                    bg: "bg-red-400/10",
                    border: "border-red-400/20",
                    icon: AlertTriangle,
                    text: "Disconnected",
                    glow: "shadow-[0_0_20px_rgba(248,113,113,0.3)]"
                };
            default:
                return {
                    color: "text-white/40",
                    bg: "bg-white/5",
                    border: "border-white/10",
                    icon: ShieldCheck,
                    text: "Offline",
                    glow: ""
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className={`glass-card p-4 rounded-2xl border flex items-center justify-between transition-all cursor-default ${config.border} hover:bg-white/[0.04]`}
        >
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-700 ${config.bg} ${config.color} ${config.border} ${config.glow}`}>
                    <PhoneCall size={20} className={status === 'Configuring' ? "animate-pulse" : ""} />
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold font-mono tracking-wider text-white">{number}</h3>
                        {clinicName && <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">{clinicName}</span>}
                    </div>
                    <p className={`text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 ${config.color}`}>
                        <Icon size={12} className={status === 'Configuring' ? "animate-spin" : ""} />
                        {config.text}
                    </p>
                </div>
            </div>

            <div className="flex items-center">
                {status === 'Active' && (
                    <div className="flex gap-1 items-end h-5 px-4">
                        <span className="w-1.5 bg-emerald-400/50 rounded-sm animate-[pulse_1.5s_ease-in-out_infinite]" style={{ height: '40%' }} />
                        <span className="w-1.5 bg-emerald-400/80 rounded-sm animate-[pulse_1.5s_ease-in-out_infinite_0.2s] shadow-[0_0_8px_rgba(52,211,153,0.8)]" style={{ height: '100%' }} />
                        <span className="w-1.5 bg-emerald-400/50 rounded-sm animate-[pulse_1.5s_ease-in-out_infinite_0.4s]" style={{ height: '60%' }} />
                    </div>
                )}
            </div>
        </motion.div>
    );
}
