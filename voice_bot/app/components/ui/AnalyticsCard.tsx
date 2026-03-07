"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface AnalyticsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    change?: string;
    trend?: "up" | "down" | "neutral";
    colorTheme?: "primary" | "secondary" | "emerald" | "purple" | "orange";
}

export function AnalyticsCard({
    title,
    value,
    icon: Icon,
    change,
    trend = "neutral",
    colorTheme = "primary"
}: AnalyticsCardProps) {

    const themeStyles = {
        primary: { text: "text-blue-400", bg: "bg-blue-400/10", border: "hover:border-blue-400/30" },
        secondary: { text: "text-indigo-400", bg: "bg-indigo-400/10", border: "hover:border-indigo-400/30" },
        emerald: { text: "text-emerald-400", bg: "bg-emerald-400/10", border: "hover:border-emerald-400/30" },
        purple: { text: "text-purple-400", bg: "bg-purple-400/10", border: "hover:border-purple-400/30" },
        orange: { text: "text-orange-400", bg: "bg-orange-400/10", border: "hover:border-orange-400/30" },
    };

    const currentTheme = themeStyles[colorTheme];

    return (
        <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`glass-card p-6 relative overflow-hidden group border border-white/5 transition-colors ${currentTheme.border} cursor-default`}
        >
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity -mr-12 -mt-12 ${currentTheme.bg}`} />

            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={`p-2.5 rounded-xl ${currentTheme.bg} ${currentTheme.text} shadow-[0_0_15px_currentColor] opacity-80 group-hover:opacity-100 transition-opacity`}>
                    <Icon size={22} strokeWidth={2.5} />
                </div>
                {change && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-md bg-white/5 ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-white/50"
                        }`}>
                        {change}
                    </span>
                )}
            </div>

            <div className="space-y-1 relative z-10">
                <h3 className="text-white/50 text-sm font-medium uppercase tracking-wider">{title}</h3>
                <div className="text-3xl font-extrabold text-white font-[family-name:var(--font-outfit)] tracking-tight">
                    {value}
                </div>
            </div>
        </motion.div>
    );
}
