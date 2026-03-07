"use client";

import { motion } from "framer-motion";
import { Bot, Power, Zap } from "lucide-react";
import { useState } from "react";

export interface AIToggleProps {
    initialState?: boolean;
    assistantName?: string;
    onToggle?: (newState: boolean) => void;
}

export function AIAssistantToggle({ initialState = true, assistantName = "Receptionist v2.4", onToggle }: AIToggleProps) {
    const [isActive, setIsActive] = useState(initialState);

    const handleToggle = () => {
        const newState = !isActive;
        setIsActive(newState);
        if (onToggle) onToggle(newState);
    };

    return (
        <motion.div
            layout
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`glass-card p-5 rounded-3xl border transition-colors duration-500 overflow-hidden relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${isActive ? 'border-primary/40 bg-primary/5' : 'border-white/10 bg-[#0a0a0a]/50'
                }`}
        >
            {/* Background ambient glow when active */}
            {isActive && (
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-48 h-48 bg-primary/20 blur-[80px] rounded-full point-events-none" />
            )}

            <div className="flex items-center gap-4 relative z-10">
                <div className={`p-4 rounded-2xl flex items-center justify-center ring-1 transition-all duration-500 ${isActive
                        ? 'bg-gradient-to-br from-primary to-secondary text-white ring-white/20 shadow-[0_0_30px_rgba(14,165,233,0.5)]'
                        : 'bg-white/5 text-white/40 ring-white/10'
                    }`}>
                    <Bot size={28} />
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h3 className={`text-xl font-bold tracking-wide transition-colors ${isActive ? 'text-white' : 'text-white/60'}`}>
                            AI Engine
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1 border transition-colors ${isActive ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/5 text-white/30 border-white/10'
                            }`}>
                            <Zap size={10} className={isActive ? 'animate-pulse' : ''} /> {assistantName}
                        </span>
                    </div>

                    <p className="text-sm font-medium tracking-wide text-white/50">
                        {isActive
                            ? "Assistant is actively answering calls and routing webhooks."
                            : "Assistant is paused. Calls will route to voicemail fallback."}
                    </p>
                </div>
            </div>

            {/* Modern Switch Toggle */}
            <button
                onClick={handleToggle}
                className="relative z-10 flex-shrink-0 flex items-center justify-center group"
            >
                <div className={`w-20 h-10 rounded-full flex items-center p-1 transition-colors duration-500 border relative overflow-hidden ${isActive ? 'bg-primary border-primary/50' : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}>

                    {/* Internal switch glow when active */}
                    {isActive && <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 pointer-events-none" />}

                    <motion.div
                        layout
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg relative z-10 transition-colors duration-300 ${isActive ? 'bg-white text-primary' : 'bg-white/30 text-white/50'
                            }`}
                        animate={{ x: isActive ? 40 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                        <Power size={14} strokeWidth={isActive ? 3 : 2} />
                    </motion.div>
                </div>
                <span className="sr-only">Toggle AI Engine</span>
            </button>

        </motion.div>
    );
}
