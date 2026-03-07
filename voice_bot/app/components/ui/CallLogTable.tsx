"use client";

import { motion } from "framer-motion";
import { PlayCircle, Clock, CheckCircle2, AlertTriangle, MessageCircle } from "lucide-react";

export interface CallLog {
    id: string;
    caller: string;
    duration: string;
    time: string;
    result: "Booked" | "Transferred" | "Resolved";
    summary: string;
}

export function CallLogTable({ logs }: { logs: CallLog[] }) {
    const getResultIcon = (result: string) => {
        switch (result) {
            case "Booked": return <CheckCircle2 size={16} className="text-emerald-400" />;
            case "Transferred": return <AlertTriangle size={16} className="text-orange-400" />;
            case "Resolved": return <MessageCircle size={16} className="text-blue-400" />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col gap-3">
            {logs.map((log, i) => (
                <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                    whileHover={{ x: 4 }}
                    className="glass-card p-4 rounded-2xl flex flex-col md:flex-row gap-4 border-white/5 bg-[#0a0a0a]/50 hover:bg-white/[0.03] transition-colors border-l-2 hover:border-l-primary"
                >
                    {/* Quick Info */}
                    <div className="flex-shrink-0 w-full md:w-48 flex flex-col justify-center">
                        <h4 className="font-bold text-white text-sm">{log.caller}</h4>
                        <div className="flex items-center gap-2 mt-1.5 text-xs font-medium text-white/50">
                            <Clock size={12} /> {log.time}
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            {log.duration}
                        </div>
                    </div>

                    {/* AI Summary */}
                    <div className="flex-1 border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-4">
                        <h5 className="text-[10px] uppercase font-bold tracking-widest text-white/30 mb-1">AI Transcript Summary</h5>
                        <p className="text-sm text-white/70 leading-relaxed font-medium">
                            {log.summary}
                        </p>
                    </div>

                    {/* Actions & Outcome */}
                    <div className="flex-shrink-0 flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                        <div className="flex items-center gap-1.5 text-sm font-semibold bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                            {getResultIcon(log.result)}
                            <span className="text-white/90">{log.result}</span>
                        </div>

                        <button className="flex items-center gap-2 w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 justify-center hover:bg-primary hover:text-white transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:shadow-[0_0_20px_rgba(14,165,233,0.6)]">
                            <PlayCircle size={20} />
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
