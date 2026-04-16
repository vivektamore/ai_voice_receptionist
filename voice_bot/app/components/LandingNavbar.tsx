"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingNavbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { name: "Features", href: "#features" },
        { name: "How it Works", href: "#how-it-works" },
        { name: "Pricing", href: "#pricing" },
    ];

    return (
        <nav 
            className={cn(
                "fixed top-0 left-0 right-0 z-[100] transition-all duration-300 px-6 sm:px-12",
                scrolled ? "py-4" : "py-8"
            )}
        >
            <div 
                className={cn(
                    "max-w-7xl mx-auto flex items-center justify-between transition-all duration-500 rounded-full px-6 py-3",
                    scrolled ? "bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl shadow-purple-500/5" : "bg-transparent border-transparent"
                )}
            >
                {/* Brand */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tighter text-white font-['Plus_Jakarta_Sans']">
                        AgenticAI
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link 
                            key={link.name} 
                            href={link.href}
                            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                            {link.name}
                        </Link>
                    ))}
                    <div className="w-px h-4 bg-zinc-800" />
                    <Link 
                        href="/login" 
                        className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        Login
                    </Link>
                    <Link href="/onboarding">
                        <button className="bg-white text-black text-xs font-bold px-5 py-2.5 rounded-full hover:bg-zinc-200 transition-all flex items-center gap-2 group">
                            Start Trial <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </Link>
                </div>

                {/* Mobile Toggle */}
                <button 
                    className="md:hidden text-white"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-24 left-6 right-6 bg-zinc-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 flex flex-col gap-6 md:hidden shadow-3xl"
                    >
                        {navLinks.map((link) => (
                            <Link 
                                key={link.name} 
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-lg font-bold text-white tracking-tight"
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="h-px bg-zinc-800 w-full" />
                        <Link 
                            href="/login" 
                            onClick={() => setMobileMenuOpen(false)}
                            className="text-lg font-bold text-zinc-400"
                        >
                            Login
                        </Link>
                        <Link href="/onboarding" onClick={() => setMobileMenuOpen(false)}>
                            <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold flex items-center justify-center gap-2">
                                Get Started Free <ArrowRight />
                            </button>
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
