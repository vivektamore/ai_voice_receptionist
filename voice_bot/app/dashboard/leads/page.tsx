"use client";

import { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronUp, FileText, Play, Download, BrainCircuit, Phone, MessageSquare, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { triggerCallBack } from "./actions";

interface Lead {
    id: string;
    patient_name: string;
    caller_phone: string;
    intent: string;
    summary: string;
    call_transcript: string | any[];
    recording_url: string;
    call_duration: number | null;
    status: "New" | "Booked" | "Follow-up Needed" | "Archived";
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expanded, setExpanded] = useState<string | null>(null);
    const [callingLead, setCallingLead] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeads = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: clinic } = await supabase.from("clinics").select("id").eq("user_id", user.id).single();

                if (clinic) {
                    const { data, error } = await supabase
                        .from("leads")
                        .select("*")
                        .eq("clinic_id", clinic.id)
                        .order("created_at", { ascending: false });

                    if (!error && data) {
                        const mappedLeads = data.map((item: any) => ({
                            ...item,
                            status: item.status || "New"
                        }));
                        setLeads(mappedLeads);
                    }
                }
            }
            setLoading(false);
        };
        fetchLeads();
    }, []);

    const toggleExpand = (id: string) => {
        setExpanded(expanded === id ? null : id);
    };

    const handleCallBack = async (lead: Lead) => {
        setCallingLead(lead.id);
        try {
            await triggerCallBack(lead.caller_phone, lead.patient_name);
            alert(`AI is now calling ${lead.patient_name}...`);
        } catch (e: any) {
            alert("Failed to initiate call: " + e.message);
        } finally {
            setCallingLead(null);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "New": return "bg-[#9396ff]/20 text-[#a3a6ff] border border-[#9396ff]/20";
            case "Booked": return "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20";
            case "Follow-up Needed": return "bg-[#ffb2b9]/10 text-[#ff6e84] border border-[#ff6e84]/20";
            default: return "bg-[#262528] text-[#adaaad] border border-[#48474a]/20";
        }
    };

    const filteredLeads = leads.filter(
        l => l.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
            l.caller_phone?.includes(search) ||
            l.intent?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-[#a3a6ff] border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full pb-16 pt-2 px-6 md:px-10 font-['Inter']">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Header & Search */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <h2 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] tracking-tight text-[#f9f5f8]">Lead Inbox</h2>
                        <p className="text-[#adaaad] mt-1 text-sm">Review and manage recent patient inquiries captured by AI.</p>
                    </div>
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#adaaad] w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search patients, phone numbers, or intents..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#262528] border-none rounded-xl py-3 pl-12 pr-4 focus:ring-1 focus:ring-[#a3a6ff]/20 text-sm transition-all text-[#f9f5f8] placeholder:text-[#adaaad]/50 outline-none"
                        />
                    </div>
                </div>

                {/* Leads List Architecture */}
                <div className="space-y-4">
                    {filteredLeads.length === 0 ? (
                        <div className="text-[#adaaad] text-center p-8 bg-[#131315]/50 border border-white/5 rounded-2xl">
                            No leads matching "{search}" found.
                        </div>
                    ) : (
                        filteredLeads.map((lead) => {
                            const isExpanded = expanded === lead.id;
                            const initials = (lead.patient_name || "Unknown Patient").substring(0, 2).toUpperCase();
                            
                            // Derive generic status if undefined
                            const statusLabel = lead.status;

                            return (
                                <div key={lead.id} className={cn(
                                    "rounded-2xl overflow-hidden transition-all duration-300",
                                    isExpanded
                                        ? "bg-[#1C1B1D]/80 border border-[#a3a6ff]/20 shadow-[0_0_30px_-10px_rgba(163,166,255,0.1)] backdrop-blur-xl"
                                        : "bg-[#1C1B1D]/50 border border-white/5 hover:border-[#a3a6ff]/30 shadow-[0_0_20px_-5px_rgba(163,166,255,0.0)] hover:shadow-[0_0_20px_-5px_rgba(163,166,255,0.15)] flex-col"
                                )}>
                                    {/* Summary Row */}
                                    <div
                                        className={cn(
                                            "px-6 py-5 flex items-center justify-between cursor-pointer transition-colors",
                                            isExpanded ? "border-b border-[#48474a]/15 bg-[#1C1B1D]/80" : ""
                                        )}
                                        onClick={() => toggleExpand(lead.id)}
                                    >
                                        <div className="flex items-center gap-6 md:w-1/3">
                                            <div className="h-10 w-10 min-w-[40px] rounded-full bg-[#a3a6ff]/10 flex items-center justify-center text-[#a3a6ff] font-bold text-sm tracking-widest border border-[#a3a6ff]/10">
                                                {initials}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-[#f9f5f8] truncate">{lead.patient_name || "Unknown Patient"}</h3>
                                                <p className="text-xs text-[#adaaad] truncate">{lead.caller_phone || "No Phone Info"}</p>
                                            </div>
                                        </div>
                                        <div className="hidden lg:block flex-1 px-12">
                                            <p className="text-sm font-medium text-[#f9f5f8] truncate">
                                                {lead.intent || "General Inquiry"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 justify-end md:w-1/4">
                                            <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap", getStatusStyle(statusLabel))}>
                                                {statusLabel}
                                            </span>
                                            {isExpanded ? (
                                                <ChevronUp className="text-[#a3a6ff] w-5 h-5 flex-shrink-0" />
                                            ) : (
                                                <ChevronDown className="text-[#adaaad] w-5 h-5 flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Bento Layout */}
                                    {isExpanded && (
                                        <div className="p-6 bg-[#000000]/30 backdrop-blur-3xl animate-in slide-in-from-top-2 duration-300 relative z-0">
                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                                                {/* Left: Transcript & Media */}
                                                <div className="lg:col-span-8 space-y-6">
                                                    <div className="bg-[#131315] rounded-xl p-5 border border-[#48474a]/15 shadow-inner">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h4 className="text-sm font-semibold flex items-center gap-2 text-[#f9f5f8]">
                                                                <FileText className="w-4 h-4 text-[#a3a6ff]" />
                                                                Call Transcript
                                                            </h4>
                                                        </div>
                                                        <div className="h-64 overflow-y-auto space-y-4 pr-2 text-sm custom-scrollbar">
                                                            {(() => {
                                                                let transcriptLines = [];
                                                                if (Array.isArray(lead.call_transcript)) {
                                                                    transcriptLines = lead.call_transcript;
                                                                } else if (typeof lead.call_transcript === 'string' && lead.call_transcript) {
                                                                    try {
                                                                        transcriptLines = JSON.parse(lead.call_transcript);
                                                                    } catch {
                                                                        transcriptLines = [{ role: 'system', content: lead.call_transcript }];
                                                                    }
                                                                }

                                                                if (transcriptLines.length > 0) {
                                                                    return transcriptLines.map((line: any, tIndex: number) => {
                                                                        const role = line?.role || line?.speaker || "User";
                                                                        const message = line?.content || line?.text || line?.message;
                                                                        if (!message) return null;
                                                                        const isAI = role.toLowerCase() === "assistant" || role.toLowerCase() === "ai" || role.toLowerCase() === "receptionist";
                                                                        
                                                                        return (
                                                                            <div key={tIndex} className="flex gap-3 text-[13px] leading-relaxed">
                                                                                <span className={cn("font-bold shrink-0 min-w-[40px]", isAI ? "text-[#a3a6ff]" : "text-[#f9f5f8]")}>
                                                                                    {isAI ? "AI:" : "User:"}
                                                                                </span>
                                                                                <p className={isAI ? "text-[#adaaad]" : "text-[#f9f5f8]"}>{message}</p>
                                                                            </div>
                                                                        );
                                                                    });
                                                                }
                                                                return <p className="text-xs text-[#adaaad] italic text-center mt-10">No transcript mapping found for this call.</p>;
                                                            })()}
                                                        </div>
                                                    </div>

                                                    {/* Audio Player Widget */}
                                                    {lead.recording_url && (
                                                        <div className="bg-[#262528] rounded-xl p-3 flex items-center gap-4 border border-[#48474a]/20">
                                                            <button className="h-10 w-10 rounded-full bg-[#a3a6ff] flex items-center justify-center text-[#000000] hover:scale-105 transition-transform flex-shrink-0">
                                                                <Play className="w-5 h-5 ml-0.5 fill-current" />
                                                            </button>
                                                            <div className="flex-1">
                                                                <audio controls src={lead.recording_url} className="h-8 w-full outline-none opacity-80 mix-blend-screen scale-y-75 transform origin-left" />
                                                            </div>
                                                            <button className="text-[#adaaad] hover:text-[#f9f5f8] p-2 hover:bg-[#48474a]/20 rounded-full transition-colors hidden sm:block">
                                                                <Download className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    {!lead.recording_url && (
                                                        <div className="bg-[#262528]/50 rounded-xl p-4 flex items-center justify-center border border-[#48474a]/10 border-dashed">
                                                             <p className="text-[10px] uppercase tracking-widest text-[#adaaad] font-bold">Audio Recording Unavailable</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Analysis & Actions */}
                                                <div className="lg:col-span-4 space-y-6">
                                                    <div className="bg-[#131315] rounded-xl p-5 border border-[#48474a]/15">
                                                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[#f9f5f8]">
                                                            <BrainCircuit className="w-4 h-4 text-[#ff9dd1]" />
                                                            AI Summary
                                                        </h4>
                                                        <p className="text-sm text-[#adaaad] leading-relaxed mb-4">
                                                            {lead.summary || "No AI synthesis was generated during this interaction sequence."}
                                                        </p>
                                                        {lead.intent && (
                                                            <div className="flex flex-wrap gap-2">
                                                                <span className="text-[10px] bg-[#19191c] px-2 py-1 rounded text-[#adaaad] border border-[#48474a]/20">{lead.intent}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Instant Action Bar */}
                                                    <div className="space-y-3">
                                                        <button 
                                                            onClick={() => handleCallBack(lead)}
                                                            disabled={callingLead === lead.id}
                                                            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#a3a6ff] rounded-xl text-[#000000] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                                                        >
                                                            <span>{callingLead === lead.id ? "Initiating..." : "Call Back Now"}</span>
                                                            {callingLead === lead.id ? <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin rounded-full" /> : <Phone className="w-4 h-4" />}
                                                        </button>
                                                        <button className="w-full flex items-center justify-between px-5 py-3.5 bg-[#262528] rounded-xl text-[#f9f5f8] font-semibold text-sm border border-[#48474a]/20 hover:bg-[#2c2c2f] transition-colors">
                                                            <span>Send SMS Follow-up</span>
                                                            <MessageSquare className="w-4 h-4" />
                                                        </button>
                                                        <button className="w-full flex items-center justify-between px-5 py-3.5 bg-[#262528] rounded-xl text-[#f9f5f8] font-semibold text-sm border border-[#48474a]/20 hover:bg-[#2c2c2f] transition-colors">
                                                            <span>Book Manually</span>
                                                            <Calendar className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
