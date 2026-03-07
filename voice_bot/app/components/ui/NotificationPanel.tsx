"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Info, AlertTriangle, CheckCircle, Package } from "lucide-react";

export interface Notification {
    id: string;
    type: "info" | "success" | "warning" | "system";
    message: string;
    timestamp: string;
    read: boolean;
}

export function NotificationPanel({
    notifications,
    onClose,
    isOpen
}: {
    notifications: Notification[];
    onClose: () => void;
    isOpen: boolean;
}) {

    const getIcon = (type: string) => {
        switch (type) {
            case "success": return <CheckCircle size={18} className="text-emerald-400" />;
            case "warning": return <AlertTriangle size={18} className="text-orange-400" />;
            case "system": return <Package size={18} className="text-primary" />;
            default: return <Info size={18} className="text-blue-400" />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="fixed top-20 right-4 w-80 md:w-96 z-50 glass-card bg-black/60 backdrop-blur-3xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.8)] rounded-3xl overflow-hidden flex flex-col max-h-[80vh]"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30 relative">
                                <Bell size={18} />
                                {notifications.some(n => !n.read) && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse border-2 border-[#0a0a0a]" />
                                )}
                            </div>
                            <h3 className="font-bold text-white tracking-wide">Notifications</h3>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-colors border border-white/5"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                        {notifications.map((notif, i) => (
                            <motion.div
                                key={notif.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className={`p-4 flex gap-4 hover:bg-white/[0.03] transition-colors cursor-pointer group relative ${!notif.read ? 'bg-primary/5' : ''}`}
                            >
                                {/* Unread indicator dot */}
                                {!notif.read && (
                                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_currentColor]" />
                                )}

                                <div className={`p-2 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center border border-white/5 shadow-inner ${notif.type === 'success' ? 'bg-emerald-400/10' :
                                        notif.type === 'warning' ? 'bg-orange-400/10' :
                                            notif.type === 'system' ? 'bg-primary/10' : 'bg-blue-400/10'
                                    }`}>
                                    {getIcon(notif.type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm tracking-wide font-medium leading-relaxed truncate ${notif.read ? 'text-white/70' : 'text-white'}`}>
                                        {notif.message}
                                    </p>
                                    <span className="text-xs font-bold uppercase tracking-widest text-white/30 mt-2 block">
                                        {notif.timestamp}
                                    </span>
                                </div>
                            </motion.div>
                        ))}

                        {notifications.length === 0 && (
                            <div className="p-8 text-center flex flex-col items-center justify-center">
                                <div className="w-16 h-16 rounded-full border border-dashed border-white/10 flex items-center justify-center mb-4">
                                    <Bell size={24} className="text-white/20" />
                                </div>
                                <p className="text-sm font-medium text-white/40 uppercase tracking-widest">All caught up!</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-white/5 bg-white/[0.02]">
                            <button className="w-full py-2.5 rounded-xl text-primary font-bold text-sm tracking-wide hover:bg-primary/10 transition-colors border border-transparent hover:border-primary/20">
                                Mark All as Read
                            </button>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
