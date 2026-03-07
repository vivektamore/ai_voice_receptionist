"use client";

import { motion } from "framer-motion";
import {
    Building2,
    PhoneIncoming,
    CalendarCheck,
    PhoneMissed,
    DollarSign
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from "recharts";

const callData = [
    { name: 'Mon', calls: 124, booked: 84 },
    { name: 'Tue', calls: 145, booked: 92 },
    { name: 'Wed', calls: 102, booked: 65 },
    { name: 'Thu', calls: 189, booked: 124 },
    { name: 'Fri', calls: 165, booked: 105 },
    { name: 'Sat', calls: 89, booked: 45 },
    { name: 'Sun', calls: 45, booked: 20 },
];

const clinicData = [
    { name: "SmileBright Dental", calls: 342, successRate: "85%", status: "Active" },
    { name: "Oakridge Orthodontics", calls: 189, successRate: "92%", status: "Active" },
    { name: "Downtown Dental Care", calls: 84, successRate: "78%", status: "Paused" },
    { name: "Sunny Side Pediatric", calls: 215, successRate: "88%", status: "Active" },
];

export default function DashboardOverview() {
    const stats = [
        { title: "Total Clinics", value: "12", icon: Building2, change: "+2 this month", color: "text-blue-400", bg: "bg-blue-400/10" },
        { title: "Total Calls Today", value: "845", icon: PhoneIncoming, change: "+14% vs yesterday", color: "text-primary", bg: "bg-primary/10" },
        { title: "Appointments Booked", value: "532", icon: CalendarCheck, change: "63% conversion", color: "text-secondary", bg: "bg-secondary/10" },
        { title: "Missed Calls Saved", value: "89", icon: PhoneMissed, change: "$14k estimated value", color: "text-emerald-400", bg: "bg-emerald-400/10" },
        { title: "Revenue (MRR)", value: "$4,250", icon: DollarSign, change: "+8% this month", color: "text-purple-400", bg: "bg-purple-400/10" },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-[family-name:var(--font-outfit)] tracking-tight">Overview</h1>
                    <p className="text-foreground/60 mt-1">Monitor your AI receptionist performance across all clinics.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium">
                        Download Report
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 transition-colors text-white text-sm font-medium shadow-[0_0_15px_var(--primary-glow)]">
                        Add New Clinic
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        className="glass-card p-5 relative overflow-hidden group hover:border-white/20 transition-all"
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-50 ${stat.bg} -mr-8 -mt-8 group-hover:opacity-100 transition-opacity`} />
                        <div className="flex items-start justify-between mb-4 relative z-10">
                            <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                        </div>
                        <div className="space-y-1 relative z-10">
                            <h3 className="text-foreground/60 text-sm font-medium">{stat.title}</h3>
                            <div className="text-3xl font-bold font-[family-name:var(--font-outfit)]">{stat.value}</div>
                            <p className="text-xs text-foreground/40 mt-2">{stat.change}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Area */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="lg:col-span-2 glass-card p-6 flex flex-col"
                >
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Call Volume & Bookings</h2>
                            <p className="text-sm text-foreground/50">Weekly performance across all clinics</p>
                        </div>
                        <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/50 text-foreground">
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                        </select>
                    </div>

                    <div className="h-[300px] w-full mt-4 flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={callData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorBooked" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(10, 10, 10, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="calls" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                                <Area type="monotone" dataKey="booked" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorBooked)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Clinic Activity Table/List */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className="glass-card p-6 flex flex-col"
                >
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Top Clinics</h2>
                        <button className="text-primary text-sm hover:underline">View All</button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {clinicData.map((clinic, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                <div>
                                    <h4 className="font-medium text-sm">{clinic.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-foreground/50">{clinic.calls} calls</span>
                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                        <span className="text-xs text-emerald-400">{clinic.successRate} booked</span>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${clinic.status === 'Active' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-white/10 text-foreground/50'
                                    }`}>
                                    {clinic.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
