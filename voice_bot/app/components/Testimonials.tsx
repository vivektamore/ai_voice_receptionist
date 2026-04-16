"use client";

import { motion } from "framer-motion";
import { TrendingUp, PhoneOff, Star } from "lucide-react";

export default function Testimonials() {
    return (
        <section className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-extrabold text-[#f9f5f8] mb-4">Clinics rely on us daily.</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="bg-[#121214] border border-white/5 rounded-3xl p-8 flex flex-col justify-between"
                >
                    <div>
                        <div className="flex gap-1 mb-6 text-yellow-400">
                            <Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" />
                        </div>
                        <p className="text-lg text-[#f9f5f8] mb-8 font-medium italic">"We were missing approximately 15 calls a day during our rush hours. Since deploying the AI Voice Receptionist, every patient is answered instantly, and our booking rate skyrocketed."</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#48474a]/30 pt-4">
                        <div>
                            <p className="font-bold text-[#f9f5f8]">Dr. Alan T.</p>
                            <p className="text-sm text-[#adaaad]">Dental Practice Owner</p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1 text-emerald-400 font-bold"><TrendingUp className="w-4 h-4"/> +40%</div>
                            <p className="text-xs text-[#adaaad] uppercase tracking-wider">Bookings</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                    className="bg-[#121214] border border-white/5 rounded-3xl p-8 flex flex-col justify-between"
                >
                    <div>
                        <div className="flex gap-1 mb-6 text-yellow-400">
                            <Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" />
                        </div>
                        <p className="text-lg text-[#f9f5f8] mb-8 font-medium italic">"The setup literally took 3 minutes. I bought a number and it was taking calls. Absolutely zero tech skills required, which is exactly what I needed."</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#48474a]/30 pt-4">
                        <div>
                            <p className="font-bold text-[#f9f5f8]">Sarah M.</p>
                            <p className="text-sm text-[#adaaad]">Clinic Manager</p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1 text-emerald-400 font-bold"><PhoneOff className="w-4 h-4"/> 0</div>
                            <p className="text-xs text-[#adaaad] uppercase tracking-wider">Missed Calls</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
