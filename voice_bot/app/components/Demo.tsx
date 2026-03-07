"use client";

import { motion } from "framer-motion";
import { Mic, PhoneCall, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function Demo() {
    const [isCalling, setIsCalling] = useState(false);

    return (
        <section className="py-24 relative">
            <div className="max-w-5xl mx-auto px-6 lg:px-8">
                <div className="glass-card p-8 md:p-12 overflow-hidden relative border-primary/20 bg-gradient-to-br from-white/[0.02] to-primary/[0.05]">

                    <div className="grid md:grid-cols-2 gap-12 items-center">

                        <div className="z-10">
                            <h2 className="text-3xl md:text-5xl font-bold font-[family-name:var(--font-outfit)] mb-6">
                                Hear it in <span className="text-gradient">action</span>.
                            </h2>
                            <p className="text-foreground/70 mb-8 text-lg">
                                Experience exactly what your patients will hear when they call. Natural pauses, intelligent responses, and perfect tone.
                            </p>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="text-primary w-5 h-5" />
                                    <span>"I need to schedule a cleaning next week."</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="text-primary w-5 h-5" />
                                    <span>"My tooth hurts, is the doctor available?"</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsCalling(!isCalling)}
                                className={`px-8 py-4 rounded-full font-medium flex items-center gap-3 transition-all ${isCalling
                                        ? "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20"
                                        : "bg-primary text-white hover:bg-primary/90 hover:scale-105 shadow-[0_0_20px_var(--primary-glow)]"
                                    }`}
                            >
                                {isCalling ? <PhoneCall className="animate-pulse" /> : <Mic />}
                                {isCalling ? "End Demo Call" : "Call the AI Now"}
                            </button>
                        </div>

                        {/* Simulated Live Audio UI */}
                        <div className="relative h-64 flex items-center justify-center z-10 w-full">
                            {isCalling ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-2"
                                >
                                    {[1, 2, 3, 4, 5, 4, 3, 2].map((height, i) => (
                                        <motion.div
                                            key={i}
                                            animate={{ height: [`${height * 10}px`, `${height * 20}px`, `${height * 10}px`] }}
                                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                                            className="w-2 bg-primary rounded-full"
                                        />
                                    ))}
                                </motion.div>
                            ) : (
                                <div className="w-full h-full glass-card border-white/5 flex flex-col items-center justify-center gap-4 group">
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform cursor-pointer" onClick={() => setIsCalling(true)}>
                                        <PhoneCall className="w-8 h-8 text-white/50" />
                                    </div>
                                    <span className="text-sm font-medium text-white/50">Click to connect</span>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}
