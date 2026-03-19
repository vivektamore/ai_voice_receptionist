"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    PhoneIncoming, PhoneOutgoing, PhoneMissed,
    Clock, User, Search, Filter, ChevronDown,
    Download, MessageSquare, Play, Loader2
} from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const CLINIC_ID = "8a3bf5ea-57e9-482b-adb8-e340181ef86e";

type CallLog = {
    id: string;
    caller_phone: string;
    patient_name: string | null;
    intent: string | null;
    summary: string | null;
    transcript: string | null;
    recording_url: string | null;
    call_duration: number | null;
    language: string | null;
    created_at: string;
    appointment_type: string | null;
};

function formatDuration(seconds: number | null) {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

function IntentBadge({ intent }: { intent: string | null }) {
    const map: Record<string, string> = {
        booking: "bg-primary/15 text-primary border-primary/30",
        inquiry: "bg-blue-400/15 text-blue-400 border-blue-400/30",
        emergency: "bg-red-400/15 text-red-400 border-red-400/30",
        confirmation: "bg-secondary/15 text-secondary border-secondary/30",
    };
    const cls = map[intent?.toLowerCase() ?? ""] ?? "bg-white/10 text-foreground/50 border-white/10";
    return (
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${cls}`}>
            {intent || "unknown"}
        </span>
    );
}

export default function CallLogsPage() {
    const [logs, setLogs] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${BACKEND_URL}/api/v1/voice/leads?clinic_id=${CLINIC_ID}`)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setLogs(data);
                else if (data.leads) setLogs(data.leads);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const filtered = logs.filter(log => {
        const matchSearch =
            !search ||
            log.caller_phone?.includes(search) ||
            log.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
            log.summary?.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "all" || log.intent?.toLowerCase() === filter;
        return matchSearch && matchFilter;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-[family-name:var(--font-outfit)] tracking-tight">
                        Call Logs
                    </h1>
                    <p className="text-foreground/60 mt-1">
                        View transcripts, recordings & call history
                    </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition-colors">
                    <Download size={15} /> Export CSV
                </button>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total Calls", value: logs.length, color: "text-primary" },
                    { label: "Bookings", value: logs.filter(l => l.intent === "booking").length, color: "text-secondary" },
                    { label: "With Recording", value: logs.filter(l => l.recording_url).length, color: "text-emerald-400" },
                    { label: "With Transcript", value: logs.filter(l => l.transcript).length, color: "text-purple-400" },
                ].map(s => (
                    <div key={s.label} className="glass-card p-4">
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-foreground/50 mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                    <input
                        type="text"
                        placeholder="Search by name, phone, or summary..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-foreground/30"
                    />
                </div>
                <div className="flex gap-2">
                    {["all", "booking", "inquiry", "emergency", "confirmation"].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f
                                ? "bg-primary text-white"
                                : "bg-white/5 text-foreground/60 hover:bg-white/10 border border-white/10"}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Logs List */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="animate-spin text-primary" size={28} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <PhoneMissed size={40} className="mx-auto text-foreground/20 mb-4" />
                    <h3 className="font-semibold text-foreground/50">No call logs found</h3>
                    <p className="text-sm text-foreground/30 mt-1">
                        {search ? "Try adjusting your search or filter." : "Logs will appear here after your first call."}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((log, i) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="glass-card overflow-hidden"
                        >
                            {/* Row */}
                            <button
                                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                                className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/3 transition-colors"
                            >
                                {/* Icon */}
                                <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                                    <PhoneIncoming size={16} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm">
                                            {log.patient_name || log.caller_phone}
                                        </span>
                                        {log.patient_name && (
                                            <span className="text-xs text-foreground/40">{log.caller_phone}</span>
                                        )}
                                        <IntentBadge intent={log.intent} />
                                        {log.language && (
                                            <span className="text-[10px] text-foreground/30 uppercase tracking-wider">
                                                {log.language}
                                            </span>
                                        )}
                                    </div>
                                    {log.summary && (
                                        <p className="text-xs text-foreground/50 mt-1 truncate">{log.summary}</p>
                                    )}
                                </div>

                                {/* Meta */}
                                <div className="flex-shrink-0 text-right hidden sm:block">
                                    <div className="flex items-center gap-1.5 text-xs text-foreground/40">
                                        <Clock size={11} />
                                        {formatDuration(log.call_duration)}
                                    </div>
                                    <div className="text-[11px] text-foreground/30 mt-1">{formatDate(log.created_at)}</div>
                                </div>

                                <ChevronDown
                                    size={16}
                                    className={`text-foreground/30 flex-shrink-0 transition-transform ${expanded === log.id ? "rotate-180" : ""}`}
                                />
                            </button>

                            {/* Expanded detail */}
                            {expanded === log.id && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="border-t border-white/5 p-4 space-y-4"
                                >
                                    {/* Recording */}
                                    {log.recording_url && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                                                <Play size={12} /> Recording
                                            </div>
                                            <audio controls src={log.recording_url} className="w-full h-10 rounded-lg" />
                                        </div>
                                    )}

                                    {/* Transcript */}
                                    {log.transcript && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                                                <MessageSquare size={12} /> Transcript
                                            </div>
                                            <div className="bg-white/3 rounded-xl p-4 text-sm text-foreground/70 leading-relaxed max-h-48 overflow-y-auto font-mono text-xs whitespace-pre-wrap">
                                                {log.transcript}
                                            </div>
                                        </div>
                                    )}

                                    {/* Details grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                        {[
                                            { label: "Phone", val: log.caller_phone },
                                            { label: "Appointment", val: log.appointment_type || "—" },
                                            { label: "Duration", val: formatDuration(log.call_duration) },
                                            { label: "Language", val: log.language || "—" },
                                        ].map(item => (
                                            <div key={item.label} className="bg-white/3 rounded-lg p-3">
                                                <div className="text-foreground/40 mb-1">{item.label}</div>
                                                <div className="font-medium text-foreground/80">{item.val}</div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
