"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Pricing() {
    return (
        <section className="py-24 px-6 max-w-6xl mx-auto border-t border-white/5 mt-10" id="pricing">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-extrabold text-[#f9f5f8] mb-4">Pricing that makes sense.</h2>
                <div className="inline-block mt-4 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <span className="text-emerald-400 font-bold tracking-widest uppercase text-xs">No setup fees • Cancel anytime • Works in 3 minutes</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                
                {/* The "Anchor" - Human Receptionist */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    className="bg-[#121214] border border-[#48474a]/30 rounded-3xl p-8 flex flex-col justify-between opacity-80"
                >
                    <div>
                        <h3 className="text-xl font-bold text-[#adaaad] mb-2">Human Receptionist</h3>
                        <div className="text-4xl font-black text-[#88888b] mb-6 flex items-baseline gap-2">
                            $1,000+ <span className="text-sm font-medium">/mo</span>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex gap-3 text-[#88888b]"><XCircle className="w-5 h-5 shrink-0" /> Available 8 hours/day</li>
                            <li className="flex gap-3 text-[#88888b]"><XCircle className="w-5 h-5 shrink-0" /> Misses calls during breaks or when busy</li>
                            <li className="flex gap-3 text-[#88888b]"><XCircle className="w-5 h-5 shrink-0" /> Prone to scheduling errors</li>
                            <li className="flex gap-3 text-[#88888b]"><XCircle className="w-5 h-5 shrink-0" /> Requires training and payroll</li>
                        </ul>
                    </div>
                </motion.div>

                {/* The AI Voice Pro Plan */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    className="bg-[#1C1B1D] border-2 border-[#a3a6ff]/50 rounded-3xl p-8 flex flex-col justify-between shadow-[0_0_40px_rgba(163,166,255,0.1)] relative overflow-hidden transform md:-translate-y-4"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#a3a6ff]/10 blur-[80px]"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#a3a6ff] text-[#000000] text-xs font-bold uppercase tracking-widest py-1 px-4 rounded-b-lg">
                        Ultimate Value
                    </div>

                    <div className="mt-4">
                        <h3 className="text-2xl font-bold text-[#f9f5f8] mb-2">AI Voice Platform</h3>
                        <div className="text-5xl font-black text-[#f9f5f8] mb-6 flex items-baseline gap-2">
                            $299 <span className="text-[#adaaad] text-lg font-medium">/mo</span>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex gap-3 text-[#f9f5f8]"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> <strong>24/7 Availability</strong> - never sleeps</li>
                            <li className="flex gap-3 text-[#f9f5f8]"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> <strong>Zero Missed Calls</strong> - handles infinite concurrent calls</li>
                            <li className="flex gap-3 text-[#f9f5f8]"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> <strong>1,000 Voice Minutes</strong> included</li>
                            <li className="flex gap-3 text-[#f9f5f8]"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> Dedicated Phone Number included</li>
                            <li className="flex gap-3 text-[#f9f5f8]"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> Automated SMS confirmations</li>
                        </ul>
                    </div>
                    
                    <Link href="/onboarding" className="w-full">
                        <button className="w-full py-4 rounded-xl bg-gradient-to-br from-[#a3a6ff] to-[#6063ee] text-[#000000] font-bold text-base tracking-tight hover:opacity-90 transition-all flex justify-center items-center gap-2">
                            Start Free Trial <ArrowRight className="w-5 h-5" />
                        </button>
                    </Link>
                </motion.div>

            </div>
        </section>
    );
}
