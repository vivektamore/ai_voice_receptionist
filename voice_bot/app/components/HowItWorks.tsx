"use client";

import { motion } from "framer-motion";
import { Copy, PhoneCall, CalendarCheck } from "lucide-react";

export default function HowItWorks() {
    return (
        <section className="py-24 px-6 max-w-7xl mx-auto relative border-t border-white/5 mt-10" id="how-it-works">
            <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-extrabold text-[#f9f5f8] mb-4">It just works. In 3 minutes.</h2>
                <p className="text-[#adaaad] text-lg max-w-2xl mx-auto">Skip the complex SIP configurations and CRM integrations. We built this for clinics, not IT teams.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Step 1 */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
                    className="bg-[#1C1B1D]/40 backdrop-blur-md border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center relative overflow-hidden"
                >
                    <div className="w-16 h-16 rounded-2xl bg-[#a3a6ff]/10 border border-[#a3a6ff]/20 flex items-center justify-center mb-6">
                        <Copy className="w-8 h-8 text-[#a3a6ff]" />
                    </div>
                    <div className="absolute top-8 right-8 text-[#262528] font-black text-6xl select-none">1</div>
                    <h3 className="text-xl font-bold text-[#f9f5f8] mb-3 z-10">1. Get Your AI Number</h3>
                    <p className="text-[#adaaad] text-sm z-10 w-4/5 mx-auto">Claim your dedicated phone number from our dashboard instantly. No hardware required.</p>
                </motion.div>

                {/* Step 2 */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-[#1C1B1D]/40 backdrop-blur-md border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center relative overflow-hidden"
                >
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                        <PhoneCall className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div className="absolute top-8 right-8 text-[#262528] font-black text-6xl select-none">2</div>
                    <h3 className="text-xl font-bold text-[#f9f5f8] mb-3 z-10">2. Patients Call, AI Answers</h3>
                    <p className="text-[#adaaad] text-sm z-10 w-4/5 mx-auto">Your AI receptionist answers instantly, handles inquiries, and triages emergencies 24/7.</p>
                </motion.div>

                {/* Step 3 */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-[#1C1B1D]/40 backdrop-blur-md border border-emerald-500/10 rounded-3xl p-8 flex flex-col items-center text-center relative overflow-hidden"
                >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                        <CalendarCheck className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div className="absolute top-8 right-8 text-[#262528] font-black text-6xl select-none">3</div>
                    <h3 className="text-xl font-bold text-[#f9f5f8] mb-3 z-10">3. Auto-Booked in Calendar</h3>
                    <p className="text-[#adaaad] text-sm z-10 w-4/5 mx-auto">Appointments are pushed directly to your calendar, and patients get an immediate SMS confirmation.</p>
                </motion.div>

            </div>
        </section>
    );
}
