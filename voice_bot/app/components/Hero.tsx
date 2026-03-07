"use client";

import { motion } from "framer-motion";
import { ArrowRight, Phone, Calendar, MessageSquare } from "lucide-react";
import React from "react";

export default function Hero() {
    return (
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 flex flex-col items-center text-center">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8"
                >
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    The future of dental reception is here
                </motion.div>

                <motion.h1
                    className="text-5xl md:text-7xl font-bold font-[family-name:var(--font-outfit)] tracking-tight mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    Never Miss Another <br className="hidden md:block" />
                    <span className="text-gradient">Patient Call</span>
                </motion.h1>

                <motion.p
                    className="max-w-2xl text-lg md:text-xl text-foreground/70 mb-10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    An intelligent AI Voice Receptionist that answers calls, books appointments directly into your calendar, and sends SMS confirmations—24/7.
                </motion.p>

                <motion.div
                    className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <button className="px-8 py-4 rounded-full bg-primary text-white font-medium flex items-center justify-center gap-2 hover:bg-primary/90 hover:scale-105 transition-all shadow-[0_0_20px_var(--primary-glow)]">
                        Start Free Trial
                        <ArrowRight size={18} />
                    </button>
                    <button className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-medium flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                        Book Demo
                    </button>
                </motion.div>

                {/* 3D Visual Concept */}
                <motion.div
                    className="mt-20 relative w-full max-w-4xl"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent blur-3xl -z-10" />
                    <div className="glass-card p-6 md:p-8 flex flex-col items-center justify-center gap-6 relative overflow-hidden">

                        {/* Decorative rings */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-white/5 rounded-full animate-[spin_10s_linear_infinite]" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/5 rounded-full border-t-primary/30 animate-[spin_15s_linear_infinite_reverse]" />

                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.4)] z-10 mb-4">
                            <Phone className="text-white w-10 h-10 animate-pulse" />
                        </div>

                        <div className="flex flex-wrap justify-center gap-4 z-10">
                            <div className="glass-card px-4 py-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                    <Calendar size={16} />
                                </div>
                                <span className="text-sm font-medium">Smart Booking</span>
                            </div>
                            <div className="glass-card px-4 py-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
                                    <MessageSquare size={16} />
                                </div>
                                <span className="text-sm font-medium">SMS Follow-up</span>
                            </div>
                        </div>

                    </div>
                </motion.div>

            </div>
        </section>
    );
}
