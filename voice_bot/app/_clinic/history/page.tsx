"use client";

import { motion } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, PhoneCall, CheckCircle, AlertTriangle, Clock, Volume2, Search, Filter } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CallHistoryPage() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeCallId, setActiveCallId] = useState<string | null>(null);
    const [calls, setCalls] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        fetchCalls();

        const channel = supabase
            .channel("calls-history")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "calls" },
                (payload) => {
                    setCalls((prev) => [payload.new, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchCalls() {
        const { data, error } = await supabase
            .from("calls")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching calls:", error);
            return;
        }
        setCalls(data || []);
        if (data && data.length > 0) setActiveCallId(data[0].id);
    }

    // Toggle native audio playback
    const togglePlayback = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Call History Logs</h1>
                    <p className="text-slate-500 mt-2 text-lg">Review AI conversations, play audio recordings, and read transcripts.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="Search by name or number..." className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 font-medium focus:border-blue-500 outline-none w-64 shadow-[0_2px_10px_rgb(0,0,0,0.02)]" />
                    </div>
                    <button className="bg-white border border-slate-200 p-2.5 rounded-xl text-slate-600 hover:bg-slate-50 shadow-[0_2px_10px_rgb(0,0,0,0.02)]"><Filter size={18} /></button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Sidebar Call List */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 flex flex-col gap-2 relative overflow-hidden h-[600px] overflow-y-auto"
                >
                    <h2 className="text-lg font-bold text-slate-800 px-2 pb-4 pt-2 sticky top-0 bg-white/90 backdrop-blur z-10 border-b border-slate-50">Recent Calls</h2>
                    {calls.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 font-medium text-sm p-4 text-center">
                            No calls recorded yet.
                        </div>
                    ) : calls.map((c) => {
                        const callDate = new Date(c.created_at);
                        const durationMins = Math.floor(c.call_duration / 60);
                        const durationSecs = Math.floor(c.call_duration % 60);
                        const timeStr = isNaN(callDate.getTime()) ? "Unknown Time" : callDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                            <div
                                key={c.id}
                                onClick={() => setActiveCallId(c.id)}
                                className={`p-4 rounded-2xl cursor-pointer transition-all border shrink-0 ${activeCallId === c.id ? 'bg-blue-50 border-blue-200 shadow-[0_4px_15px_rgb(59,130,246,0.1)]' : 'bg-transparent border-transparent hover:bg-slate-50'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`font-bold truncate max-w-[140px] ${activeCallId === c.id ? 'text-blue-900' : 'text-slate-800'}`}>{c.caller_phone || "Unknown"}</span>
                                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0"><Clock size={12} /> {durationMins}:{durationSecs.toString().padStart(2, '0')}</span>
                                </div>
                                <p className="text-xs font-medium text-slate-500 mb-3">{timeStr}</p>
                                <div className="flex gap-2 flex-wrap">
                                    <span className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-lg bg-white border border-slate-200 text-slate-600">
                                        {c.status || "Completed"}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </motion.div>

                {/* Call Details View */}
                {calls.length > 0 && activeCallId ? (() => {
                    const activeCall = calls.find(c => c.id === activeCallId) || calls[0];
                    const activeDate = new Date(activeCall.created_at);
                    const timeStr = isNaN(activeDate.getTime()) ? "" : activeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    // Simple parse of newlines to split the standard AI transcript block usually formatted like: "AI: Hello\nUser: Hi"
                    const transcriptLines = (activeCall.call_transcript || "").split('\n').filter((l: string) => l.trim() !== '');

                    return (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={activeCall.id}
                            className="lg:col-span-2 flex flex-col gap-6"
                        >
                            {/* Summary Card */}
                            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-full -z-10" />
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${activeCall.status === "Booked" ? "bg-teal-100 text-teal-700" : activeCall.status === "Transferred" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                                            {activeCall.status === "Booked" ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                                            {activeCall.status || "Completed"}
                                        </span>
                                        <span className="text-sm font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{timeStr}</span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800">{activeCall.caller_phone || "Unknown Number"}</h2>
                                    <p className="text-slate-600 font-medium">Duration: <span className="text-slate-800 font-bold">{Math.floor(activeCall.call_duration / 60)}m {Math.floor(activeCall.call_duration % 60)}s</span></p>

                                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mt-4">
                                        <h4 className="text-xs uppercase font-bold text-slate-400 mb-2">AI Summary</h4>
                                        <p className="text-sm font-medium text-slate-700 leading-relaxed">
                                            {activeCall.summary || "No summary provided by the AI for this interaction."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Audio Player Card */}
                            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Volume2 size={20} className="text-blue-500" /> Call Recording
                                    </h3>
                                </div>

                                <div className="w-full bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden flex items-center px-4 py-3 gap-4">
                                    {activeCall.recording_url ? (
                                        <audio
                                            ref={audioRef}
                                            src={activeCall.recording_url}
                                            className="w-full"
                                            controls
                                            onPlay={() => setIsPlaying(true)}
                                            onPause={() => setIsPlaying(false)}
                                            onEnded={() => setIsPlaying(false)}
                                        />
                                    ) : (
                                        <div className="text-sm font-medium text-slate-400 w-full text-center py-2">No recording URL captured from Vapi.</div>
                                    )}
                                </div>
                            </div>

                            {/* Transcript Log */}
                            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col gap-6 h-[400px] overflow-hidden">
                                <h3 className="text-lg font-bold text-slate-800">Transcript</h3>
                                <div className="flex-1 overflow-y-auto pr-4 space-y-6">
                                    {transcriptLines.length === 0 ? (
                                        <div className="text-sm text-slate-400 font-medium italic">No transcript generated.</div>
                                    ) : transcriptLines.map((line: string, i: number) => {
                                        const isAI = line.toLowerCase().startsWith("ai:") || line.toLowerCase().startsWith("bot:");
                                        const cleanLine = line.replace(/^(AI|Bot|User|Customer):\s*/i, "");

                                        if (isAI) {
                                            return (
                                                <div key={i} className="flex gap-4 max-w-[85%]">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white shrink-0 mt-1 shadow-sm"><PhoneCall size={14} /></div>
                                                    <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none p-4">
                                                        <p className="text-sm font-medium text-slate-700 leading-relaxed">{cleanLine}</p>
                                                    </div>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div key={i} className="flex gap-4 max-w-[85%] self-end ml-auto flex-row-reverse">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0 mt-1 shadow-sm">U</div>
                                                    <div className="bg-blue-600 border border-blue-700 rounded-2xl rounded-tr-none p-4 shadow-[0_4px_15px_rgb(37,99,235,0.2)]">
                                                        <p className="text-sm font-medium text-white leading-relaxed">{cleanLine}</p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )
                })() : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center p-12 text-center h-[600px]">
                        <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6">
                            <PhoneCall size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">No Call Selected</h2>
                        <p className="text-slate-500 mt-2 max-w-sm">Select a call from the history log on the left to review its recording, AI summary, and full conversational transcript.</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
