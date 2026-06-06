"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, Flag, RefreshCw, Play, Filter, Download, Activity, CalendarCheck, PhoneCall } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface LogEntry {
    id: string;
    caller_phone: string;
    call_duration: number | null;
    intent: string;
    call_transcript: string | any[];
    recording_url: string;
    created_at: string;
}

export default function UnifiedCallLogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
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
                        setLogs(data);
                    }
                }
            }
            setLoading(false);
        };
        fetchLogs();
    }, []);

    const toggleExpand = (id: string) => {
        setExpanded(expanded === id ? null : id);
    };

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return "00:00";
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    const formatTimestamp = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const getIntentConfig = (intent: string = "") => {
        const i = intent.toLowerCase();
        if (i.includes("emergency") || i.includes("urgent")) {
            return { color: "bg-[#ff6e84]", text: "text-[#ff6e84]", bgClass: "bg-[#ff6e84]/10", label: "Emergency", isPulse: true };
        }
        if (i.includes("book") || i.includes("appointment") || i.includes("consult")) {
            return { color: "bg-[#10b981]", text: "text-[#10b981]", bgClass: "bg-[#10b981]/10", label: "Booking", isPulse: false };
        }
        return { color: "bg-[#a3a6ff]", text: "text-[#a3a6ff]", bgClass: "bg-[#a3a6ff]/10", label: "Inquiry", isPulse: false };
    };

    const filteredLogs = logs.filter(
        l => l.caller_phone?.includes(search) ||
            l.intent?.toLowerCase().includes(search.toLowerCase())
    );

    // Stats calculations
    const stats = useMemo(() => {
        const total = logs.length;
        const booked = logs.filter(l => l.intent?.toLowerCase().includes("book") || l.intent?.toLowerCase().includes("consult")).length;
        const successRate = total > 0 ? Math.round((booked / total) * 100) : 0;
        return { total, booked, successRate };
    }, [logs]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-[#a3a6ff] border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full pb-24 pt-2 px-6 md:px-10 font-['Inter']">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
                    <div>
                        <h2 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] tracking-tight text-[#f9f5f8]">Unified Logs</h2>
                        <p className="text-[#adaaad] mt-1 text-sm">Chronological timeline of all intelligence routing and patient interactions.</p>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#adaaad] w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Filter by caller ID or intent..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#1C1B1D]/80 border-white/5 rounded-xl py-3 pl-12 pr-4 focus:ring-1 focus:ring-[#a3a6ff]/20 text-sm transition-all text-[#f9f5f8] placeholder:text-[#adaaad]/50 outline-none backdrop-blur-md shadow-sm"
                        />
                    </div>
                </header>

                {/* Stats Strip */}
                <section className="bg-[#131315]/80 backdrop-blur-xl rounded-2xl p-6 flex justify-between items-center border border-[#48474a]/15 shadow-lg">
                    <div className="flex flex-col flex-1 items-center justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <PhoneCall className="w-3.5 h-3.5 text-[#adaaad]" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#adaaad]">Total Traffic</span>
                        </div>
                        <span className="font-['JetBrains_Mono'] text-[#a3a6ff] text-2xl font-bold drop-shadow-[0_0_8px_rgba(163,166,255,0.4)]">{stats.total}</span>
                    </div>
                    <div className="h-10 w-px bg-[#48474a]/30"></div>
                    <div className="flex flex-col flex-1 items-center justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <CalendarCheck className="w-3.5 h-3.5 text-[#adaaad]" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#adaaad]">Booked</span>
                        </div>
                        <span className="font-['JetBrains_Mono'] text-[#10b981] text-2xl font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">{stats.booked}</span>
                    </div>
                    <div className="h-10 w-px bg-[#48474a]/30"></div>
                    <div className="flex flex-col flex-1 items-center justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-3.5 h-3.5 text-[#adaaad]" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#adaaad]">Success Rate</span>
                        </div>
                        <span className="font-['JetBrains_Mono'] text-[#a3a6ff] text-2xl font-bold drop-shadow-[0_0_8px_rgba(163,166,255,0.4)]">{stats.successRate}%</span>
                    </div>
                </section>

                {/* Master List Timeline */}
                <main className="space-y-3">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center p-12 bg-[#1C1B1D]/50 border border-white/5 rounded-2xl">
                            <p className="text-[#adaaad]">No call logs found matching your filters.</p>
                        </div>
                    ) : (
                        filteredLogs.map((log) => {
                            const isExpanded = expanded === log.id;
                            const config = getIntentConfig(log.intent);

                            return (
                                <article 
                                    key={log.id} 
                                    className={cn(
                                        "bg-[#262528]/80 backdrop-blur-xl rounded-xl overflow-hidden border transition-all duration-300 relative",
                                        isExpanded ? "border-[#a3a6ff]/30 shadow-[0_0_30px_-10px_rgba(163,166,255,0.15)] ring-1 ring-[#a3a6ff]/10" : "border-[#48474a]/15 hover:bg-[#2c2c2f]"
                                    )}
                                >
                                    {config.isPulse && !isExpanded && (
                                        <div className="absolute inset-0 bg-[#ff6e84]/5 animate-pulse pointer-events-none"></div>
                                    )}
                                    
                                    <div 
                                        className="flex items-center p-4 gap-4 cursor-pointer relative z-10"
                                        onClick={() => toggleExpand(log.id)}
                                    >
                                        <div className={cn("w-1.5 h-12 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.1)]", config.color)}></div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h3 className="font-bold text-[#f9f5f8] truncate">{(log as any).patient_name || log.caller_phone}</h3>
                                                <span className="font-['JetBrains_Mono'] text-[10px] text-[#adaaad]">{formatTimestamp(log.created_at)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider", config.bgClass, config.text)}>
                                                    {config.label}
                                                </span>
                                                <span className="text-xs text-[#adaaad] truncate max-w-[180px] md:max-w-sm">{log.intent || "Unclassified Call"}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {/* Minimal Audio Visualizer Bar */}
                                            {!isExpanded && log.recording_url && (
                                                <div className="hidden sm:flex w-16 h-6 bg-[#131315] items-center justify-center rounded-full px-1.5 gap-0.5 opacity-60">
                                                    <div className={cn("w-1 h-2/3 rounded-full opacity-40", config.color)}></div>
                                                    <div className={cn("w-1 h-full rounded-full", config.color)}></div>
                                                    <div className={cn("w-1 h-4/5 rounded-full opacity-70", config.color)}></div>
                                                    <div className={cn("w-1 h-3/5 rounded-full", config.color)}></div>
                                                </div>
                                            )}
                                            {isExpanded ? (
                                                <ChevronUp className="text-[#a3a6ff] w-5 h-5 flex-shrink-0" />
                                            ) : (
                                                <ChevronDown className="text-[#adaaad] w-5 h-5 flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Transcript UI (Apple iMessage Flow) */}
                                    {isExpanded && (
                                        <div className="px-5 pb-6 pt-3 border-t border-[#48474a]/15 bg-[#131315]/60">
                                            
                                            {/* Audio Player Injection */}
                                            {log.recording_url && (
                                                 <div className="mb-6 bg-[#262528] rounded-xl p-2.5 flex items-center gap-3 border border-[#48474a]/20">
                                                    <div className="h-8 w-8 rounded-full bg-[#a3a6ff] flex items-center justify-center text-[#000000] flex-shrink-0 shadow-[0_0_10px_rgba(163,166,255,0.3)]">
                                                        <Play className="w-4 h-4 ml-0.5 fill-current" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <audio controls src={log.recording_url} className="h-8 w-full outline-none opacity-90 scale-y-75 transform origin-left" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Chat Bubble Layout */}
                                            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                                {(() => {
                                                    let transcriptLines = [];
                                                    if (Array.isArray(log.call_transcript)) {
                                                        transcriptLines = log.call_transcript;
                                                    } else if (typeof log.call_transcript === 'string' && log.call_transcript) {
                                                        try {
                                                            transcriptLines = JSON.parse(log.call_transcript);
                                                        } catch {
                                                            transcriptLines = [{ role: 'system', content: log.call_transcript }];
                                                        }
                                                    }

                                                    if (transcriptLines.length > 0) {
                                                        return transcriptLines.map((line: any, idx: number) => {
                                                            const role = line?.role || line?.speaker || "User";
                                                            const message = line?.content || line?.text || line?.message;
                                                            if (!message) return null;
                                                            const isAI = role.toLowerCase() === "assistant" || role.toLowerCase() === "ai";

                                                            if (isAI) {
                                                                return (
                                                                    <div key={idx} className="flex flex-col items-start max-w-[85%]">
                                                                        <span className="text-[9px] font-['JetBrains_Mono'] text-[#adaaad] ml-2 mb-1">AI Agent</span>
                                                                        <div className="bg-[#2c2c2f] p-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed text-[#f9f5f8] shadow-sm border border-[#48474a]/20">
                                                                            {message}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            } else {
                                                                return (
                                                                    <div key={idx} className="flex flex-col items-end max-w-[85%] ml-auto">
                                                                        <span className="text-[9px] font-['JetBrains_Mono'] text-[#adaaad] mr-2 mb-1">{(log as any).patient_name || "Patient"}</span>
                                                                        <div className="bg-[#a3a6ff]/15 border border-[#a3a6ff]/20 p-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed text-[#f9f5f8] shadow-sm">
                                                                            {message}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            }
                                                        });
                                                    }
                                                    return <p className="text-[11px] text-[#adaaad] text-center font-['JetBrains_Mono'] py-4 opacity-50">NO_TRANSCRIPT_DETECTED_FOR_SESSION</p>;
                                                })()}
                                            </div>

                                            {/* Action Bar */}
                                            <div className="grid grid-cols-3 gap-3">
                                                <button className="bg-[#262528] hover:bg-[#2c2c2f] py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-[#f9f5f8] border border-[#48474a]/20">
                                                    <Flag className="w-4 h-4 text-[#adaaad]" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Audit</span>
                                                </button>
                                                <button className="bg-[#262528] hover:bg-[#2c2c2f] py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-[#f9f5f8] border border-[#48474a]/20">
                                                    <RefreshCw className="w-4 h-4 text-[#adaaad]" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">CRM Sync</span>
                                                </button>
                                                <button className="bg-[#a3a6ff] hover:brightness-110 py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-[#000000] shadow-[0_0_15px_rgba(163,166,255,0.2)]">
                                                    <Activity className="w-4 h-4" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Extract Data</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </article>
                            );
                        })
                    )}
                </main>
            </div>
        </div>
    );
}
