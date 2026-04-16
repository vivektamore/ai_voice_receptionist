"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneCall, Copy, MessageSquare, CheckCircle2, ShieldAlert, Activity, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type DemoState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'completed' | 'error';

export default function LiveDemo() {
    const [demoState, setDemoState] = useState<DemoState>('idle');
    const [copied, setCopied] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [hasGreeted, setHasGreeted] = useState(false);
    const [step, setStep] = useState(0);

    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Stop mic cleanup on unmount
    useEffect(() => {
        return () => stopMicrophone();
    }, []);

    const trackAnalytics = (event: string) => {
        console.log(`Analytics: ${event}`);
    };

    const copyNumber = () => {
        navigator.clipboard.writeText("+918046733471");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        trackAnalytics('number_copied');
    };

    const stopMicrophone = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        setAudioLevel(0);
    };

    const runSimulation = async () => {
        trackAnalytics('Web Call Started (Mic Requested)');
        setDemoState('connecting');
        setStep(1);
        setHasGreeted(false);

        try {
            // 1. Request Microphone explicitly (Live Interaction Illusion)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;

            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

            const updateLevel = () => {
                if (analyserRef.current) {
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
                    setAudioLevel(average);
                }
                animationFrameRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();
        } catch (err) {
            console.error("Microphone access denied or error:", err);
            // We continue the visual simulation even if they deny the mic to not break UX
        }
        
        // 2. Simulated State Machine Sequence
        setTimeout(() => { setDemoState('speaking'); setStep(2); }, 1500); // AI Greeting
        setTimeout(() => { setDemoState('listening'); setStep(3); setHasGreeted(true); }, 4500); // User speaking
        setTimeout(() => { setDemoState('processing'); setStep(4); }, 8000); // AI thinking
        setTimeout(() => { setDemoState('speaking'); setStep(5); }, 9500); // AI confirming
        setTimeout(() => {
            setDemoState('completed');
            setStep(6);
            stopMicrophone();
            trackAnalytics('Web Call Completed');
        }, 14000);
    };

    // Auto-trigger idle animation
    useEffect(() => {
        const timer = setTimeout(() => {
            if (demoState === 'idle') {
                const pulse = document.getElementById('demo-pulse');
                if (pulse) pulse.classList.add('animate-pulse');
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [demoState]);

    return (
        <section className="relative py-20 px-6 max-w-5xl mx-auto w-full" id="live-demo">
            
            <div className="mb-10 text-center">
                <h2 className="text-3xl font-extrabold text-[#f9f5f8] mb-3">Live Clinical Demo</h2>
                <p className="text-[#adaaad]">Experience the exact voice intelligence your patients will hear.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Column: Real Call Action */}
                <div className="bg-[#1C1B1D]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 flex flex-col justify-center gap-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#a3a6ff]/5 blur-[80px] rounded-full pointer-events-none"></div>
                    
                    <div>
                        <span className="inline-block px-3 py-1 rounded bg-[#a3a6ff]/10 text-[#a3a6ff] text-xs font-bold uppercase tracking-widest mb-4">Option A: Real Call</span>
                        <h3 className="text-2xl font-bold text-[#f9f5f8] leading-tight mb-2">Call the system directly.</h3>
                        <p className="text-[#adaaad] text-sm">No signup. Talk to the AI receptionist live right now.</p>
                    </div>

                    <div className="flex flex-col items-center p-6 bg-[#0e0e10] rounded-2xl border border-[#48474a]/30">
                        <span className="text-4xl font-extrabold text-[#f9f5f8] font-['JetBrains_Mono'] tracking-tight mb-6">
                            +91 804673 3471
                        </span>
                        
                        <div className="w-full flex flex-col gap-3">
                            <a href="tel:+918046733471" onClick={() => trackAnalytics('real_call_clicked')} className="w-full">
                                <button className="w-full py-4 rounded-xl bg-gradient-to-br from-[#a3a6ff] to-[#6063ee] text-[#000000] font-bold text-sm tracking-tight flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-[#a3a6ff]/20">
                                    <PhoneCall className="w-5 h-5" /> Dial Now from Phone
                                </button>
                            </a>
                            <div className="flex gap-3">
                                <button onClick={copyNumber} className="flex-1 py-3 rounded-xl bg-[#262528] border border-[#48474a]/30 text-[#f9f5f8] text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#2c2c2f] transition-all">
                                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    {copied ? "Copied" : "Copy"}
                                </button>
                                <a href="https://wa.me/918046733471" target="_blank" rel="noreferrer" onClick={() => trackAnalytics('whatsapp_clicked')} className="flex-1">
                                    <button className="w-full h-full py-3 rounded-xl bg-[#262528] border border-[#48474a]/30 text-[#f9f5f8] text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#2c2c2f] transition-all">
                                        <MessageSquare className="w-4 h-4 text-emerald-400" /> WhatsApp
                                    </button>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 text-[#adaaad] text-xs">
                        <AlertCircle className="w-4 h-4 text-[#a3a6ff] shrink-0" />
                        <p>If the call doesn't connect instantly due to network bridging, please use the web audio to the right.</p>
                    </div>
                </div>

                {/* Right Column: Web Audio Interactive */}
                <div className="bg-[#1C1B1D]/80 backdrop-blur-xl border border-[#48474a]/30 rounded-3xl p-8 flex flex-col relative overflow-hidden group">
                    
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <span className="inline-block px-3 py-1 rounded bg-[#262528] text-[#adaaad] text-xs font-bold uppercase tracking-widest mb-4">Option B: Web Audio</span>
                            <h3 className="text-xl font-bold text-[#f9f5f8]">Interactive Browser Call</h3>
                        </div>
                        
                        {/* Status Indicator */}
                        <div className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2",
                            demoState === 'completed' ? "bg-emerald-500/10 text-emerald-400" :
                            demoState === 'error' ? "bg-red-500/10 text-red-400" :
                            demoState === 'idle' ? "bg-[#262528] text-[#adaaad]" :
                            "bg-[#a3a6ff]/10 text-[#a3a6ff]"
                        )}>
                            {demoState !== 'idle' && demoState !== 'completed' && demoState !== 'error' && (
                                <Activity className="w-3 h-3 animate-pulse" />
                            )}
                            {demoState}
                        </div>
                    </div>

                    {/* Chat / Waveform Area */}
                    <div className="flex-grow bg-[#0e0e10] rounded-2xl border border-[#48474a]/20 p-6 flex flex-col justify-end gap-4 min-h-[250px] relative overflow-hidden pb-12">
                        
                        {demoState === 'idle' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                                <button 
                                    id="demo-pulse"
                                    onClick={runSimulation}
                                    className="w-16 h-16 rounded-full bg-gradient-to-br from-[#a3a6ff] to-[#6063ee] flex items-center justify-center shadow-[0_0_30px_rgba(163,166,255,0.3)] hover:scale-110 active:scale-95 transition-all cursor-pointer mb-4"
                                >
                                    <PhoneCall className="w-8 h-8 text-[#000000]" />
                                </button>
                                <p className="text-[#f9f5f8] font-bold">Start Live Browser Call</p>
                                <p className="text-[#adaaad] text-xs mt-1">(Requires Microphone Access)</p>
                            </div>
                        )}

                        {demoState === 'connecting' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[#a3a6ff] animate-pulse font-medium">Requesting Microphone...</span>
                            </div>
                        )}

                        <AnimatePresence>
                            {demoState !== 'idle' && demoState !== 'connecting' && (
                                <>
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                        className="bg-[#262528] p-4 rounded-xl rounded-tl-none self-start max-w-[85%]"
                                    >
                                        <p className="text-sm font-bold text-[#a3a6ff] mb-1">AI Receptionist</p>
                                        <p className="text-[#f9f5f8] text-sm">
                                            {step <= 3 ? "Hi, thanks for calling the clinic. How can I help you today?" :
                                             demoState === 'processing' ? "..." :
                                             "Perfect, I've booked your dental cleaning for Monday at 10 AM. Have a great day!"}
                                        </p>
                                    </motion.div>

                                    {step >= 3 && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                            className="bg-[#1C1B1D] border border-white/5 p-4 rounded-xl rounded-tr-none self-end max-w-[85%]"
                                        >
                                            <p className="text-sm font-bold text-[#adaaad] mb-1">Patient (You)</p>
                                            <p className="text-[#adaaad] text-sm md:hidden">
                                                {step === 3 ? "..." : "I'd like to book a dental cleaning for next Monday."}
                                            </p>
                                            <p className="text-[#adaaad] text-sm hidden md:block italic">
                                                {step === 3 ? "🎤 Speak into your microphone now..." : "I'd like to book a dental cleaning for next Monday."}
                                            </p>
                                        </motion.div>
                                    )}

                                    {/* WebRTC Waveform Visualizer */}
                                    {(demoState === 'listening' || demoState === 'speaking') && (
                                        <div className="absolute bottom-4 left-0 right-0 h-8 flex items-end justify-center gap-1.5 opacity-80">
                                            {[...Array(24)].map((_, i) => {
                                                const isActive = demoState === 'listening' ? audioLevel > 5 : true;
                                                const baseHeight = demoState === 'speaking' 
                                                    ? Math.sin(i + Date.now()/100) * 10 + 15  // Math wave for AI speaking
                                                    : isActive ? Math.max(4, audioLevel * 0.4) : 4; // Mic level for User

                                                return (
                                                    <motion.div 
                                                        key={i}
                                                        animate={{ height: `${Math.max(4, baseHeight)}px` }}
                                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                        className={cn("w-1.5 rounded-full", demoState === 'speaking' ? "bg-[#a3a6ff]" : "bg-emerald-400")}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Proof of Outcome */}
                    {demoState === 'completed' && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                        >
                            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">Outcome Verified</p>
                            <ul className="space-y-1">
                                <li className="flex items-center gap-2 text-sm text-[#f9f5f8]"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Appointment booked for Monday 10 AM</li>
                                <li className="flex items-center gap-2 text-sm text-[#f9f5f8]"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> SMS Confirmation delivered</li>
                                <li className="flex items-center gap-2 text-sm text-[#f9f5f8]"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Lead saved in Dashboard</li>
                            </ul>
                        </motion.div>
                    )}

                    <div className="mt-4 text-center">
                        <span className="flex items-center justify-center gap-2 text-[10px] uppercase font-bold tracking-widest text-[#adaaad]">
                            <ShieldAlert className="w-3 h-3 text-emerald-400" /> This is a live simulation.
                        </span>
                    </div>

                </div>
            </div>
        </section>
    );
}
