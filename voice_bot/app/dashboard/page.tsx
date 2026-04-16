"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  PhoneMissed, TrendingUp, PhoneIncoming, 
  CalendarCheck, Clock, Hash, BotMessageSquare,
  ArrowRight, CheckCircle2, AlertCircle, Phone
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export default function DashboardOverview() {
    const [callData, setCallData] = React.useState<any[]>([]);
    const [recentLeads, setRecentLeads] = React.useState<any[]>([]);
    const [clinicName, setClinicName] = React.useState("Your Clinic");
    const [overview, setOverview] = React.useState({
        missed_calls: 0,
        total_calls_today: 0,
        appointments_booked: 0,
        conversion_rate: 0,
        avg_response_time: 1.8,
        minutes_used: 0,
        active_numbers: 0
    });

    React.useEffect(() => {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const fetchData = async () => {
            try {
                const [overviewRes, chartRes] = await Promise.all([
                    fetch(`${backendUrl}/api/v1/dashboard/overview`),
                    fetch(`${backendUrl}/api/v1/dashboard/chart`)
                ]);
                if (overviewRes.ok) {
                    const oData = await overviewRes.json();
                    setOverview(oData);
                    if (oData.clinic_name) setClinicName(oData.clinic_name);
                    const mappedLeads = (oData.recent_leads || []).map((l: any) => ({
                        name: l.name || l.patient_name || "Unknown Caller",
                        phone: l.phone || l.caller_phone || "—",
                        duration: l.duration ? `${Math.floor(l.duration / 60)}m ${l.duration % 60}s` : "—",
                        status: l.status || "New",
                        time: l.created_at ? new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—",
                        summary: l.summary || ""
                    }));
                    setRecentLeads(mappedLeads);
                }
                if (chartRes.ok) {
                    const cData = await chartRes.json();
                    setCallData(cData.map((item: any) => ({
                        name: item.day,
                        "Calls": item.calls,
                        "Booked": item.booked ?? 0
                    })));
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            }
        };
        fetchData();
    }, []);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const aiIsActive = overview.active_numbers > 0;

    return (
        <div className="w-full flex-1 flex flex-col min-h-screen pb-16 font-['Inter']">

            {/* ── Page Header ── */}
            <div className="px-6 md:px-10 pt-8 pb-2">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-3 mb-1">
                        <div className={cn("w-2.5 h-2.5 rounded-full", aiIsActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")} />
                        <span className={cn("text-xs font-bold uppercase tracking-widest", aiIsActive ? "text-emerald-400" : "text-zinc-500")}>
                            {aiIsActive ? "AI Receptionist is Live" : "No Active Lines Yet"}
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-['Plus_Jakarta_Sans'] font-bold text-white tracking-tight">
                        {greeting}, {clinicName} 👋
                    </h1>
                    <p className="text-zinc-400 mt-1 text-sm">Here's what your AI Receptionist did today.</p>
                </motion.div>
            </div>

            <div className="px-6 md:px-10 py-8 space-y-8 max-w-[1440px] w-full mx-auto">

                {/* ── TOP KPI CARDS ── */}
                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

                    {/* Calls Handled */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                        className="bg-[#18181b] border border-white/5 rounded-2xl p-6 flex flex-col gap-3 hover:border-[#a3a6ff]/30 transition-all shadow-lg">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-zinc-400 font-semibold">Calls Handled Today</p>
                            <div className="w-9 h-9 bg-[#a3a6ff]/10 rounded-xl flex items-center justify-center">
                                <PhoneIncoming className="w-4 h-4 text-[#a3a6ff]" />
                            </div>
                        </div>
                        <div className="text-4xl font-bold font-['Plus_Jakarta_Sans'] text-white">{overview.total_calls_today}</div>
                        <p className="text-xs text-zinc-500">Total inbound calls answered by AI</p>
                    </motion.div>

                    {/* Appointments Booked */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="bg-[#18181b] border border-white/5 rounded-2xl p-6 flex flex-col gap-3 hover:border-emerald-400/30 transition-all shadow-lg">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-zinc-400 font-semibold">Appointments Booked</p>
                            <div className="w-9 h-9 bg-emerald-400/10 rounded-xl flex items-center justify-center">
                                <CalendarCheck className="w-4 h-4 text-emerald-400" />
                            </div>
                        </div>
                        <div className="text-4xl font-bold font-['Plus_Jakarta_Sans'] text-emerald-400">{overview.appointments_booked}</div>
                        <p className="text-xs text-zinc-500">{overview.conversion_rate}% of calls converted to bookings</p>
                    </motion.div>

                    {/* Missed Calls */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                        className={cn("bg-[#18181b] border rounded-2xl p-6 flex flex-col gap-3 transition-all shadow-lg",
                            overview.missed_calls > 0 ? "border-red-500/30 hover:border-red-500/50" : "border-white/5 hover:border-white/20"
                        )}>
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-zinc-400 font-semibold">Missed Calls</p>
                            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", overview.missed_calls > 0 ? "bg-red-500/10" : "bg-zinc-800")}>
                                <PhoneMissed className={cn("w-4 h-4", overview.missed_calls > 0 ? "text-red-400" : "text-zinc-500")} />
                            </div>
                        </div>
                        <div className={cn("text-4xl font-bold font-['Plus_Jakarta_Sans']", overview.missed_calls > 0 ? "text-red-400" : "text-white")}>
                            {overview.missed_calls}
                        </div>
                        <p className="text-xs text-zinc-500">{overview.missed_calls === 0 ? "✅ All calls were answered" : "⚠️ Action needed — check leads"}</p>
                    </motion.div>

                    {/* Active Phone Lines */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="bg-[#18181b] border border-white/5 rounded-2xl p-6 flex flex-col gap-3 hover:border-[#a3a6ff]/30 transition-all shadow-lg">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-zinc-400 font-semibold">Active Phone Lines</p>
                            <div className="w-9 h-9 bg-[#a3a6ff]/10 rounded-xl flex items-center justify-center">
                                <Hash className="w-4 h-4 text-[#a3a6ff]" />
                            </div>
                        </div>
                        <div className="text-4xl font-bold font-['Plus_Jakarta_Sans'] text-white">{overview.active_numbers}</div>
                        <Link href="/dashboard/numbers" className="text-xs text-[#a3a6ff] hover:underline flex items-center gap-1 w-fit">
                            Manage numbers <ArrowRight className="w-3 h-3" />
                        </Link>
                    </motion.div>
                </section>

                {/* ── AI STATUS BANNER (empty state for new users) ── */}
                {overview.total_calls_today === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                        className="bg-[#a3a6ff]/5 border border-[#a3a6ff]/20 rounded-2xl p-5 flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#a3a6ff]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <BotMessageSquare className="w-5 h-5 text-[#a3a6ff]" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">Your AI Receptionist is ready and waiting</p>
                            <p className="text-xs text-zinc-400 mt-0.5">No calls have come in yet today. When patients call, their conversations and bookings will appear here automatically.</p>
                        </div>
                    </motion.div>
                )}

                {/* ── MAIN CONTENT GRID ── */}
                <section className="grid grid-cols-12 gap-6">

                    {/* Call Activity Chart */}
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}
                        className="col-span-12 xl:col-span-8 bg-[#18181b] border border-white/5 rounded-2xl p-6 flex flex-col h-[380px] shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white text-base">Call Activity This Week</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Calls received vs. appointments confirmed</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-zinc-400">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#a3a6ff] inline-block rounded-full" /> Calls</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded-full" /> Booked</span>
                            </div>
                        </div>
                        <div className="flex-1 -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={callData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a3a6ff" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#a3a6ff" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gBooked" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4edea3" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#4edea3" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} dx={-5} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1C1B1D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                                        labelStyle={{ color: '#fff', fontWeight: 700, marginBottom: 4 }}
                                        itemStyle={{ color: '#aaa' }}
                                    />
                                    <Area type="monotone" dataKey="Calls" stroke="#a3a6ff" strokeWidth={2.5} fillOpacity={1} fill="url(#gCalls)" />
                                    <Area type="monotone" dataKey="Booked" stroke="#4edea3" strokeWidth={2.5} fillOpacity={1} fill="url(#gBooked)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Right Column */}
                    <div className="col-span-12 xl:col-span-4 flex flex-col gap-4">

                        {/* AI Performance Summary */}
                        <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                            className="bg-[#18181b] border border-white/5 rounded-2xl p-5 flex-1 shadow-lg">
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">AI Performance Summary</p>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                                        <span className="text-sm text-zinc-300">Booking Rate</span>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-400">{overview.conversion_rate}%</span>
                                </div>
                                <div className="h-px bg-white/5" />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-[#a3a6ff]" />
                                        <span className="text-sm text-zinc-300">Avg. Response Time</span>
                                    </div>
                                    <span className="text-sm font-bold text-white">{overview.avg_response_time}s</span>
                                </div>
                                <div className="h-px bg-white/5" />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-zinc-500" />
                                        <span className="text-sm text-zinc-300">Minutes Used</span>
                                    </div>
                                    <span className="text-sm font-bold text-white">{overview.minutes_used}</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Quick Actions */}
                        <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                            className="bg-[#18181b] border border-white/5 rounded-2xl p-5 shadow-lg">
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Quick Actions</p>
                            <div className="space-y-2">
                                <Link href="/dashboard/leads" className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#a3a6ff] text-[#000] font-bold text-sm hover:opacity-90 active:scale-95 transition-all">
                                    <span>View Patient Calls</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link href="/dashboard/agent" className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-sm hover:bg-white/10 transition-all">
                                    <span>Update AI Settings</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link href="/dashboard/numbers" className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-sm hover:bg-white/10 transition-all">
                                    <span>Manage Phone Numbers</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </motion.div>

                    </div>
                </section>

                {/* ── RECENT PATIENT CALLS ── */}
                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                    className="bg-[#18181b] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                    <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white">Recent Patient Calls</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Latest calls handled by your AI receptionist</p>
                        </div>
                        <Link href="/dashboard/leads" className="text-xs font-bold text-[#a3a6ff] hover:underline bg-[#a3a6ff]/10 px-4 py-2 rounded-xl border border-[#a3a6ff]/20 flex items-center gap-1.5">
                            See All <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {recentLeads.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <div className="text-4xl mb-3">📞</div>
                            <p className="font-semibold text-zinc-400">No calls yet today</p>
                            <p className="text-xs text-zinc-600 mt-1">Patient calls will appear here as they come in.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {recentLeads.map((lead, i) => (
                                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.04 }}
                                    className="flex items-center gap-4 px-6 py-4 hover:bg-white/3 transition-colors group">
                                    {/* Avatar */}
                                    <div className="w-9 h-9 rounded-full bg-[#a3a6ff]/10 flex items-center justify-center text-[#a3a6ff] font-bold text-xs flex-shrink-0">
                                        {(lead.name || "?").substring(0, 2).toUpperCase()}
                                    </div>
                                    {/* Name + Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-white truncate">{lead.name}</p>
                                        {lead.summary ? (
                                            <p className="text-xs text-zinc-500 truncate">{lead.summary}</p>
                                        ) : (
                                            <p className="text-xs text-zinc-600 flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {lead.phone}
                                            </p>
                                        )}
                                    </div>
                                    {/* Status Badge */}
                                    <div className="flex-shrink-0 hidden sm:block">
                                        {lead.status === "Booked" ? (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                                <CheckCircle2 className="w-3 h-3" /> Booked
                                            </span>
                                        ) : lead.status === "Missed" || lead.status === "Missed/Voicemail" ? (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-400/10 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                                                <AlertCircle className="w-3 h-3" /> Missed
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 rounded-full bg-[#a3a6ff]/10 text-[#a3a6ff] text-[10px] font-bold uppercase tracking-wider">{lead.status}</span>
                                        )}
                                    </div>
                                    {/* Duration + Time */}
                                    <div className="text-right flex-shrink-0 hidden md:block">
                                        <p className="text-xs font-mono text-zinc-400">{lead.duration}</p>
                                        <p className="text-[10px] text-zinc-600">{lead.time}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.section>

            </div>
        </div>
    );
}
