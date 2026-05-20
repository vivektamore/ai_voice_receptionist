"use client";

import { motion } from "framer-motion";
import { ArrowRight, Waves, Globe, CheckCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function LandingFooter() {
    return (
        <footer className="w-full bg-[#09090B] pt-20">
            {/* Massive Final CTA Section */}
            <div className="max-w-5xl mx-auto px-6 mb-24 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-[#1C1B1D]/0 to-[#a3a6ff]/5 rounded-[3rem] pointer-events-none"></div>
                
                <div className="bg-[#1C1B1D]/60 backdrop-blur-2xl border border-[#a3a6ff]/20 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#a3a6ff]/10 blur-[100px] pointer-events-none"></div>
                    
                    {/* Onboarding Preview (Remove Friction) */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-12 relative z-10">
                        <div className="flex items-center flex-col gap-2">
                            <div className="w-12 h-12 rounded-full bg-[#262528] flex items-center justify-center text-[#adaaad]"><Waves className="w-5 h-5"/></div>
                            <span className="text-xs font-bold text-[#adaaad] uppercase tracking-widest">1. Select Voice</span>
                        </div>
                        <div className="w-px h-8 md:w-16 md:h-px bg-[#48474a]/50"></div>
                        <div className="flex items-center flex-col gap-2">
                            <div className="w-12 h-12 rounded-full bg-[#262528] flex items-center justify-center text-[#adaaad]"><Globe className="w-5 h-5"/></div>
                            <span className="text-xs font-bold text-[#adaaad] uppercase tracking-widest">2. Get Number</span>
                        </div>
                        <div className="w-px h-8 md:w-16 md:h-px bg-[#48474a]/50"></div>
                        <div className="flex items-center flex-col gap-2">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400"><CheckCircle className="w-5 h-5"/></div>
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">3. Go Live</span>
                        </div>
                    </div>

                    <h2 className="text-4xl md:text-6xl font-black text-[#f9f5f8] tracking-tight mb-4 relative z-10">
                        Start in 3 minutes.
                    </h2>
                    <p className="text-[#adaaad] text-lg mb-10 flex flex-col md:flex-row items-center justify-center gap-2 relative z-10">
                        <span>No setup complexity.</span>
                        <span className="hidden md:inline">•</span>
                        <span>No tech skills required.</span>
                    </p>
                    
                    <Link href="/onboarding" className="relative z-10 inline-block w-full sm:w-auto">
                        <button className="w-full py-5 px-10 rounded-2xl bg-gradient-to-br from-[#a3a6ff] to-[#6063ee] text-[#000000] font-black text-lg tracking-tight hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(163,166,255,0.3)]">
                            Start Free Trial <ArrowRight className="w-6 h-6" />
                        </button>
                    </Link>
                </div>
            </div>

            {/* Standard Footer Bottom */}
            <div className="border-t border-white/5 py-8">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[#adaaad] text-sm">&copy; 2026 ClinicAssistAI. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/privacy-policy" className="text-[#adaaad] hover:text-[#f9f5f8] text-sm transition-colors">Privacy Policy</Link>
                        <Link href="/terms-of-service" className="text-[#adaaad] hover:text-[#f9f5f8] text-sm transition-colors">Terms of Service</Link>
                        <Link href="/cancellation" className="text-[#adaaad] hover:text-[#f9f5f8] text-sm transition-colors">Refund & Cancellation Policy</Link>
                        <Link href="/support" className="text-[#adaaad] hover:text-[#f9f5f8] text-sm transition-colors">Contact Us</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
