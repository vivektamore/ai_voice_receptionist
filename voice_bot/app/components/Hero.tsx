"use client";

import { motion } from "framer-motion";
import { Sparkles, PhoneCall, ArrowRight, ShieldCheck, Clock, Mic } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const Waveform = () => (
    <div className="flex items-center gap-1 h-4">
        {[...Array(5)].map((_, i) => (
            <motion.div
                key={i}
                className="w-1 bg-accent rounded-full"
                animate={{ height: ["4px", "16px", "4px"] }}
                transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut"
                }}
            />
        ))}
    </div>
);

export default function Hero() {
    return (
        <section className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
            {/* Urgency Badge */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-bg-secondary/80 border border-primary/20 mb-8 backdrop-blur-md shadow-[0_0_15px_rgba(59,130,246,0.15)]"
            >
                <div className="relative flex items-center justify-center">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-30 animate-pulse"></span>
                    <span className="relative flex h-2.5 w-2.5 rounded-full bg-accent"></span>
                </div>
                <span className="text-text-primary text-sm font-medium tracking-wide">
                    Agent active <span className="text-text-secondary font-normal">· Listening...</span>
                </span>
            </motion.div>

            {/* Main Headlines */}
            <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl md:text-7xl font-bold text-text-primary font-space-grotesk tracking-wide leading-tight mb-6 max-w-4xl"
            >
                Never Miss Another <br className="hidden md:block"/> Patient Call
            </motion.h1>

            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg md:text-xl text-text-secondary font-medium max-w-2xl mb-12 leading-relaxed"
            >
                The AI receptionist that answers instantly, books appointments directly into your calendar, and sends SMS confirmations automatically.
            </motion.p>

            {/* CTAs */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center gap-6 w-full max-w-xl mx-auto"
            >
                {/* Free Trial Button */}
                <Link href="/onboarding" className="w-full">
                    <button className="w-full py-4 px-8 rounded-xl bg-gradient-to-br from-primary to-accent text-bg-primary font-bold text-base tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] active:scale-95 transition-all duration-300">
                        Start Free Trial <ArrowRight className="w-5 h-5" />
                    </button>
                </Link>

                {/* Real Call Embedded CTA */}
                <div className="w-full group">
                    <a href="tel:+918046733471" className="block w-full">
                        <button className="relative w-full py-4 px-8 rounded-xl bg-bg-secondary border border-border hover:border-accent/40 text-text-primary font-bold text-base tracking-wide flex items-center justify-center gap-3 transition-all duration-300 group-hover:bg-bg-secondary/80 overflow-hidden">
                            {/* Audio Pulse effect on hover */}
                            <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <Waveform />
                            <span>Call the AI Now</span>
                        </button>
                    </a>
                    <div className="text-center mt-3">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">No signup required • Try instantly</span>
                    </div>
                </div>
            </motion.div>

            {/* Trust Badges */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex items-center justify-center gap-8 mt-16 pt-8 border-t border-border w-full max-w-2xl"
            >
                <div className="flex items-center gap-2 text-text-secondary">
                    <Clock className="w-5 h-5 text-accent" />
                    <span className="text-sm font-medium">24/7 AI Coverage</span>
                </div>
                <div className="w-px h-4 bg-border"></div>
                <div className="flex items-center gap-2 text-text-secondary">
                    <ShieldCheck className="w-5 h-5 text-accent" />
                    <span className="text-sm font-medium">Zero Missed Patients</span>
                </div>
            </motion.div>

            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/10 blur-[150px] rounded-[100%] pointer-events-none -z-10"></div>
        </section>
    );
}

