"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    LayoutDashboard,
    Users,
    CalendarCheck,
    PhoneForwarded,
    Bell,
    Bot,
    CreditCard,
    Menu,
    X,
    Stethoscope
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ClinicSidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const navItems = [
        { name: "Dashboard", href: "/clinic", icon: LayoutDashboard },
        { name: "Leads", href: "/clinic/leads", icon: Users },
        { name: "Appointments", href: "/clinic/appointments", icon: CalendarCheck },
        { name: "Call History", href: "/clinic/history", icon: PhoneForwarded },
        { name: "Notifications", href: "/clinic/notifications", icon: Bell },
        { name: "AI Settings", href: "/clinic/settings", icon: Bot },
        { name: "Billing", href: "/clinic/billing", icon: CreditCard },
    ];

    return (
        <>
            <div className="lg:hidden fixed top-4 right-4 z-50">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 bg-white rounded-xl text-slate-700 shadow-md hover:text-blue-600 transition-colors"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <AnimatePresence>
                {(isOpen || typeof window !== 'undefined' && window.innerWidth >= 1024) && (
                    <motion.div
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/50 z-40 flex flex-col transition-transform duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold flex items-center gap-3 text-slate-800">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white">
                                    <Stethoscope size={20} />
                                </div>
                                <div>
                                    <span className="block text-sm leading-tight text-slate-500 font-medium">Clinic Portal</span>
                                    <span className="block leading-tight tracking-tight">SmileBright</span>
                                </div>
                            </h2>
                        </div>

                        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all relative overflow-hidden group font-medium ${isActive
                                                ? "text-blue-700 bg-blue-50"
                                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                            }`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeClinicTab"
                                                className="absolute inset-0 bg-blue-500/10 border-l-4 border-blue-500"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.2 }}
                                            />
                                        )}
                                        <item.icon className={`w-5 h-5 relative z-10 ${isActive ? "text-blue-600" : "group-hover:text-blue-500 transition-colors"}`} />
                                        <span className="relative z-10">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="p-4 mt-auto">
                            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-3 hover:bg-blue-50/50 transition-colors cursor-pointer group">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                                    SJ
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="text-sm font-semibold text-slate-800 truncate">Dr. Sarah Jenkins</h4>
                                    <p className="text-xs text-slate-500 truncate group-hover:text-blue-600 transition-colors">Admin Access</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
