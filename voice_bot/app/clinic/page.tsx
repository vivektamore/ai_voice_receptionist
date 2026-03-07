"use client";

import { motion } from "framer-motion";
import {
    CalendarPlus,
    Users,
    PhoneMissed,
    MessageCircleQuestion,
    PhoneCall,
    ArrowRight,
    TrendingUp
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const callData = [
    { time: '8 AM', value: 2 },
    { time: '10 AM', value: 8 },
    { time: '12 PM', value: 14 },
    { time: '2 PM', value: 6 },
    { time: '4 PM', value: 10 },
    { time: '6 PM', value: 3 },
];

export default function ClinicDashboard() {
    const [metrics, setMetrics] = useState({
        appointments: 0,
        leads: 0,
        callsSaved: 0,
        inquiries: 0,
    });

    const [recentCalls, setRecentCalls] = useState<any[]>([]);

    useEffect(() => {
        fetchDashboardData();

        // Optional: Realtime subscription for overview
        const channel = supabase
            .channel("dashboard-leads")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "leads" },
                () => {
                    fetchDashboardData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchDashboardData() {
        const today = new Date().toISOString().split("T")[0];

        const { data, error } = await supabase
            .from("leads")
            .select("*")
            .gte("created_at", today)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching overview data:", error);
            return;
        }

        if (data) {
            let appts = 0;
            let totalLeads = data.length;
            let saved = 0;
            let questions = 0;

            data.forEach((lead: any) => {
                const status = (lead.status || "").toLowerCase();
                const intent = (lead.call_intent || lead.summary || "").toLowerCase();

                if (status === "booked" || status === "confirmed") {
                    appts++;
                }

                if (intent.includes("missed") || intent.includes("voicemail")) {
                    saved++;
                } else {
                    // Approximate calls saved if AI handled it entirely
                    if (status === "booked" || status === "confirmed" || status === "resolved") {
                        saved++;
                    }
                }

                if (intent.includes("question") || intent.includes("inquiry")) {
                    questions++;
                } else if (!intent.includes("book") && !intent.includes("cancel")) {
                    // Fallback approximation
                    questions++;
                }
            });

            setMetrics({
                appointments: appts,
                leads: totalLeads,
                callsSaved: saved,
                inquiries: questions,
            });

            // Set the top 3 recent calls for the feed
            setRecentCalls(data.slice(0, 3));
        }
    }

    const stats = [
        { title: "Today's Appointments", value: metrics.appointments, icon: CalendarPlus, color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200" },
        { title: "AI Leads Generated", value: metrics.leads, icon: Users, color: "text-teal-600", bg: "bg-teal-100", border: "border-teal-200" },
        { title: "Calls Saved", value: metrics.callsSaved, icon: PhoneMissed, color: "text-orange-600", bg: "bg-orange-100", border: "border-orange-200" },
        { title: "Patient Inquiries", value: metrics.inquiries, icon: MessageCircleQuestion, color: "text-purple-600", bg: "bg-purple-100", border: "border-purple-200" },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Good morning, Dr. Jenkins 👋</h1>
                <p className="text-slate-500 mt-2 text-lg">Your AI receptionist is actively handling calls. Here's your clinic activity for today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.1 }}
                        className={`bg-white rounded-3xl p-6 border ${stat.border} shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all`}
                    >
                        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${stat.bg} opacity-50 group-hover:scale-150 transition-transform duration-500`} />
                        <div className="flex items-center gap-4 mb-4 relative z-10">
                            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                                <stat.icon size={24} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div className="space-y-1 relative z-10">
                            <div className="text-4xl font-extrabold text-slate-800">{stat.value}</div>
                            <h3 className="text-slate-500 font-medium">{stat.title}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Chart Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                >
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Call Volume Today</h2>
                            <div className="flex items-center gap-2 mt-1 text-teal-600 font-medium text-sm">
                                <TrendingUp size={16} /> 24% increase from yesterday
                            </div>
                        </div>
                        <button className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                            View Report
                        </button>
                    </div>

                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={callData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTeal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', fontWeight: 600 }}
                                    itemStyle={{ color: '#0f172a' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorTeal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Live Call Feed */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800">Recent AI Calls</h2>
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                        </span>
                    </div>

                    <div className="flex-1 space-y-4">
                        {recentCalls.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">
                                No calls received today.
                            </div>
                        ) : recentCalls.map((call, i) => {
                            const status = (call.status || "Pending").charAt(0).toUpperCase() + (call.status || "Pending").slice(1);

                            return (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/50 border border-transparent hover:border-blue-100 transition-colors cursor-pointer group">
                                    <div className={`p-2 rounded-xl ${status === "Booked" || status === "Confirmed" ? "bg-teal-100 text-teal-600" :
                                        status === "Transferred" ? "bg-orange-100 text-orange-600" :
                                            "bg-blue-100 text-blue-600"
                                        }`}>
                                        <PhoneCall size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{call.patient_name || "Unknown Caller"}</p>
                                        <p className="text-xs text-slate-500 truncate" title={call.summary || "No Intent Provided"}>
                                            {call.summary || "No Intent Provided"}
                                        </p>
                                    </div>
                                    <div className="text-right flex flex-col justify-center">
                                        <p className="text-xs font-semibold text-slate-600">{status}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">
                                            {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <button className="w-full mt-4 py-3 rounded-xl text-blue-600 font-semibold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                        View full log <ArrowRight size={16} />
                    </button>
                </motion.div>

            </div>
        </div>
    );
}
