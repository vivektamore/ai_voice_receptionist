"use client";

import { motion } from "framer-motion";
import { Search, UserPlus, Phone, Calendar, Clock, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LeadsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [leads, setLeads] = useState<any[]>([]);

    useEffect(() => {
        fetchLeads();

        const channel = supabase
            .channel("leads-channel")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "leads",
                },
                (payload) => {
                    // Add new lead to the beginning of the list
                    setLeads((prev) => [payload.new, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchLeads() {
        const { data, error } = await supabase
            .from("leads")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching leads:", error);
        } else {
            setLeads(data || []);
        }
    }

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "Pending": return "bg-orange-100 text-orange-700 border-orange-200";
            case "Confirmed": return "bg-teal-100 text-teal-700 border-teal-200";
            case "Contacted": return "bg-blue-100 text-blue-700 border-blue-200";
            default: return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Leads & Patients</h1>
                    <p className="text-slate-500 mt-2 text-lg">Manage appointment requests captured by the AI.</p>
                </div>
                <button className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-teal-500/20 transition-all hover:scale-105 flex items-center gap-2">
                    <UserPlus size={18} /> Add Patient
                </button>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search patient name or phone..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 rounded-2xl pl-12 pr-4 py-3 text-slate-700 outline-none transition-all placeholder:text-slate-400 font-medium"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors">
                        All Statuses <ChevronDown size={16} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors">
                        This Week <ChevronDown size={16} />
                    </button>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
            >
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Info</th>
                            <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Requested Slot</th>
                            <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">AI Summary / Intent</th>
                            <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {leads.filter((l: any) => (l.patient_name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (l.caller_phone || "").includes(searchTerm)).map((lead: any, i: number) => {
                            const displayStatus = lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1) : "Pending";

                            return (
                                <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-slate-800 text-sm">{lead.patient_name || "Unknown Caller"}</span>
                                            <span className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                                                <Phone size={12} className="text-blue-500" /> {lead.caller_phone || "No Phone"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-1.5 text-slate-700 font-semibold text-sm">
                                                <Calendar size={14} className="text-teal-500" /> {lead.preferred_date || "Any Date"}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                                                <Clock size={12} /> {lead.preferred_time || "Any Time"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 max-w-xs">
                                        <div className="text-sm font-medium text-slate-600 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl truncate" title={lead.summary || "No Intent Provided"}>
                                            {lead.summary || "No Intent Provided"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold border ${getStatusStyle(displayStatus)} shadow-sm`}>
                                            {displayStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button className="text-blue-600 font-bold text-sm bg-white px-4 py-2 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-colors shadow-sm">
                                            Review
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </motion.div>
        </div>
    );
}
