"use client";

import { motion } from "framer-motion";
import { Bell, MessageSquare, AlertCircle, CalendarClock, Settings2 } from "lucide-react";

export default function NotificationsPage() {
    const notifications = [
        {
            id: 1,
            type: "booking",
            icon: CalendarClock,
            title: "New Appointment Booked",
            desc: "David Chen successfully booked a Consultation for Oct 24 at 2:30 PM via AI Voice.",
            time: "10 mins ago",
            color: "text-teal-600",
            bg: "bg-teal-100",
            unread: true
        },
        {
            id: 2,
            type: "sms",
            icon: MessageSquare,
            title: "SMS Confirmation Delivered",
            desc: "Automated SMS receipt sent to Maria Garcia (512) 555-0198.",
            time: "2 hours ago",
            color: "text-blue-600",
            bg: "bg-blue-100",
            unread: true
        },
        {
            id: 3,
            type: "alert",
            icon: AlertCircle,
            title: "Emergency Transfer Request",
            desc: "Caller noted severe toothache. Call was transferred to front-desk bypass line.",
            time: "Yesterday, 3:45 PM",
            color: "text-orange-600",
            bg: "bg-orange-100",
            unread: false
        },
        {
            id: 4,
            type: "system",
            icon: Settings2,
            title: "Invoice Generated",
            desc: "Your monthly usage invoice for Oct 2026 has been generated.",
            time: "Oct 20, 2026",
            color: "text-slate-500",
            bg: "bg-slate-200",
            unread: false
        }
    ];

    return (
        <div className="space-y-8 max-w-4xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl inline-block mb-2">
                            <Bell size={24} />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Notifications</h1>
                    </div>
                    <p className="text-slate-500 mt-2 text-lg">Stay updated on real-time AI bookings, SMS logs, and system alerts.</p>
                </div>
                <button className="text-blue-600 font-semibold px-4 py-2 hover:bg-blue-50 rounded-xl transition-colors">Mark all as read</button>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
            >
                <div className="divide-y divide-slate-100">
                    {notifications.map((notif, i) => (
                        <div
                            key={notif.id}
                            className={`p-6 flex gap-5 items-start transition-colors hover:bg-slate-50 ${notif.unread ? 'bg-blue-50/20' : ''}`}
                        >
                            <div className={`p-3 rounded-2xl shrink-0 ${notif.bg} ${notif.color}`}>
                                <notif.icon size={20} />
                            </div>
                            <div className="flex-1 space-y-1 mt-1">
                                <div className="flex justify-between items-start">
                                    <h3 className={`font-bold ${notif.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                                        {notif.title}
                                    </h3>
                                    <span className="text-xs font-semibold text-slate-400 whitespace-nowrap ml-4">{notif.time}</span>
                                </div>
                                <p className="text-sm font-medium leading-relaxed text-slate-500 max-w-2xl">{notif.desc}</p>
                            </div>
                            {notif.unread && (
                                <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-3 shadow-[0_0_8px_rgb(59,130,246,0.6)]" />
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
