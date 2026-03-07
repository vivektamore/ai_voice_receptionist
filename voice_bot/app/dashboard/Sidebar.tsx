"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    LayoutDashboard,
    Building2,
    Phone,
    Users,
    PhoneCall,
    PieChart,
    CreditCard,
    Settings,
    Menu,
    X
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const navItems = [
        { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { name: "Clinics", href: "/dashboard/clinics", icon: Building2 },
        { name: "Phone Numbers", href: "/dashboard/numbers", icon: Phone },
        { name: "Leads", href: "/dashboard/leads", icon: Users },
        { name: "Call Logs", href: "/dashboard/logs", icon: PhoneCall },
        { name: "Analytics", href: "/dashboard/analytics", icon: PieChart },
        { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ];

    return (
        <>
            {/* Mobile Toggle */}
            <div className="md:hidden fixed top-4 right-4 z-50">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 glass-card rounded-lg text-foreground hover:text-primary transition-colors"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <AnimatePresence>
                {(isOpen || typeof window !== 'undefined' && window.innerWidth >= 768) && (
                    <motion.div
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        className={`fixed md:sticky top-0 left-0 h-screen w-64 glass-card border-l-0 border-t-0 border-b-0 rounded-none z-40 bg-background/80 backdrop-blur-2xl flex flex-col transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold font-[family-name:var(--font-outfit)] flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_15px_var(--primary-glow)]">
                                    <span className="text-white text-sm">AI</span>
                                </span>
                                Dental <span className="text-foreground/60 text-sm font-normal">Admin</span>
                            </h2>
                        </div>

                        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden group ${isActive
                                                ? "text-white bg-white/10"
                                                : "text-foreground/60 hover:text-white hover:bg-white/5"
                                            }`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent border-l-2 border-primary"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.2 }}
                                            />
                                        )}
                                        <item.icon className={`w-5 h-5 relative z-10 ${isActive ? "text-primary drop-shadow-[0_0_8px_var(--primary-glow)]" : "group-hover:text-primary transition-colors"}`} />
                                        <span className="font-medium relative z-10">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="p-4 mt-auto border-t border-white/5">
                            <div className="glass-card p-4 rounded-xl relative overflow-hidden group cursor-pointer hover:border-primary/30 transition-colors">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all" />
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
                                        A
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold">Admin User</h4>
                                        <p className="text-xs text-foreground/50">Pro Plan</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
