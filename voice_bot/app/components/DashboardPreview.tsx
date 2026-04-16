"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, PhoneIncoming, TrendingUp, CheckCircle2 } from "lucide-react";

export default function DashboardPreview() {
    const [callsList, setCallsList] = useState([
        { id: 1, name: "Maria Garcia", duration: "1m 42s", type: "General inquiry" },
        { id: 2, name: "David Chen", duration: "45s", type: "Reschedule" }
    ]);
    const [bookingsCount, setBookingsCount] = useState(31);
    const [justBooked, setJustBooked] = useState(false);

    useEffect(() => {
        // Micro-interaction simulation
        const timer1 = setTimeout(() => {
            setCallsList(prev => [{ id: 3, name: "Sarah Jenkins", duration: "2m 10s", type: "New Booking" }, ...prev]);
        }, 3000);

        const timer2 = setTimeout(() => {
            setBookingsCount(32);
            setJustBooked(true);
        }, 3500);

        return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }, []);

    return (
        <section className="py-24 px-6 max-w-6xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-extrabold text-[#f9f5f8] mb-4">See outcomes, not just software.</h2>
                <p className="text-[#adaaad] text-lg max-w-2xl mx-auto">Your Command Center tracks every interaction, ensuring absolute transparency.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Big Metric Box 1 */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                    className="col-span-1 bg-[#1C1B1D] border border-white/5 rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 blur-[50px]"></div>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-emerald-500/10 rounded-xl"><Calendar className="w-6 h-6 text-emerald-400" /></div>
                        <h4 className="text-[#adaaad] font-semibold">Weekly Bookings</h4>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-end gap-3">
                            <motion.span 
                                key={bookingsCount}
                                initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                className="text-6xl font-black text-[#f9f5f8] font-['JetBrains_Mono'] tracking-tighter"
                            >
                                {bookingsCount}
                            </motion.span>
                            <span className="text-emerald-400 font-bold flex items-center mb-2"><TrendingUp className="w-4 h-4 mr-1"/> +40%</span>
                        </div>
                        {justBooked && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> New booking added just now
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* Big Metric Box 2 */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                    className="col-span-1 lg:col-span-2 bg-[#1C1B1D] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#a3a6ff]/5 blur-[70px]"></div>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-[#a3a6ff]/10 rounded-xl"><PhoneIncoming className="w-6 h-6 text-[#a3a6ff]" /></div>
                            <h4 className="text-[#adaaad] font-semibold">Live Call Activity</h4>
                        </div>
                        <div className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-bold flex gap-2 items-center">
                            12 Missed Calls Saved This Week
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <AnimatePresence>
                            {callsList.map((call, idx) => (
                                <motion.div 
                                    key={call.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-[#0e0e10] border border-[#48474a]/20"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[#262528] grid place-items-center text-xs font-bold text-[#f9f5f8]">
                                            {call.name.split(' ').map(n=>n[0]).join('')}
                                        </div>
                                        <div>
                                            <p className="text-[#f9f5f8] font-bold text-sm">{call.name}</p>
                                            <p className="text-[#a3a6ff] text-xs font-medium">{call.type}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[#adaaad] font-['JetBrains_Mono'] text-sm">{call.duration}</span>
                                        {call.type === "New Booking" && (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
