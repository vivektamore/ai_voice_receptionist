"use client";

import { motion } from "framer-motion";
import { Phone, Calendar, Clock, ArrowRight } from "lucide-react";

export interface Lead {
    id: string | number;
    name: string;
    phone: string;
    date: string;
    time: string;
    intent: string;
    status: "Pending" | "Confirmed" | "Contacted";
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
    const getStatusStyle = (status: string) => {
        switch (status) {
            case "Pending": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
            case "Confirmed": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            case "Contacted": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            default: return "bg-white/5 text-white/60 border-white/10";
        }
    };

    return (
        <div className="glass-card overflow-hidden border-white/5 bg-[#0a0a0a]/50">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="px-6 py-5 text-xs font-semibold text-white/40 uppercase tracking-widest">Patient</th>
                            <th className="px-6 py-5 text-xs font-semibold text-white/40 uppercase tracking-widest">Requested Slot</th>
                            <th className="px-6 py-5 text-xs font-semibold text-white/40 uppercase tracking-widest">AI Intent</th>
                            <th className="px-6 py-5 text-xs font-semibold text-white/40 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-5 text-right flex-shrink-0"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {leads.map((lead, i) => (
                            <motion.tr
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.05 }}
                                key={lead.id}
                                className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-bold text-white text-sm group-hover:text-primary transition-colors">{lead.name}</span>
                                        <span className="flex items-center gap-1.5 text-white/50 text-xs font-medium">
                                            <Phone size={12} className="text-white/30" /> {lead.phone}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="flex items-center gap-1.5 text-white/80 font-medium text-sm">
                                            <Calendar size={14} className="text-white/40" /> {lead.date}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-white/50 text-xs font-medium">
                                            <Clock size={12} className="text-white/30" /> {lead.time}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-semibold text-white/70 bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg inline-block">
                                        {lead.intent}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(lead.status)} shadow-[0_0_10px_currentColor] opacity-80 backdrop-blur-sm`}>
                                        {lead.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-primary font-semibold text-sm hover:text-white transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1 justify-end ml-auto">
                                        Review <ArrowRight size={14} />
                                    </button>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
