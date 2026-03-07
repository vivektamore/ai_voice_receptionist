"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, PhoneOff, CalendarCheck, Clock, User, Phone as PhoneIcon, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

// Mock conversation sequence for the demo
const MOCK_CONVERSATION = [
    { speaker: "ai", text: "Hello! Thank you for calling SmileBright Dental. This is the AI virtual assistant. How can I help you today?", delay: 1000 },
    { speaker: "user", text: "Hi, I need to schedule a routine cleaning for next week.", delay: 4000 },
    { speaker: "ai", text: "I can absolutely help you schedule a cleaning. Have you visited our office before, or will this be your first time?", delay: 3000 },
    { speaker: "user", text: "This will be my first time.", delay: 3500 },
    { speaker: "ai", text: "Wonderful, welcome! I have an opening next Tuesday at 10:00 AM, or Thursday at 2:30 PM. Which works better for you?", delay: 4000 },
    { speaker: "user", text: "Tuesday at 10 AM sounds perfect.", delay: 3000 },
    { speaker: "ai", text: "Great! I've booked your cleaning for next Tuesday at 10:00 AM. Could you provide your full name and phone number so I can finalize it?", delay: 3500 },
    { speaker: "user", text: "Sure, it's David Smith, 512-555-0198.", delay: 4500 },
    { speaker: "ai", text: "Thank you, David. Your appointment is confirmed! I've also sent a confirmation text to your number. We look forward to seeing you!", delay: 4000, triggerBooking: true }
];

export default function InteractiveDemo() {
    const [isCalling, setIsCalling] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [transcript, setTranscript] = useState<{ speaker: string, text: string }[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [bookingConfirmed, setBookingConfirmed] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);

    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Handle simulated conversation progression
    useEffect(() => {
        if (!isCalling) return;

        if (currentStep < MOCK_CONVERSATION.length) {
            const step = MOCK_CONVERSATION[currentStep];

            const timer = setTimeout(() => {
                setTranscript(prev => [...prev, { speaker: step.speaker, text: step.text }]);
                setIsAiSpeaking(step.speaker === "ai");

                if (step.triggerBooking) {
                    setBookingConfirmed(true);
                }

                setCurrentStep(prev => prev + 1);
            }, step.delay);

            return () => clearTimeout(timer);
        } else {
            setIsAiSpeaking(false);
        }
    }, [isCalling, currentStep]);

    // WebRTC Microphone visualization
    useEffect(() => {
        if (isCalling && !isMuted && !isAiSpeaking) {
            const startMicrophone = async () => {
                try {
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
                    // Fallback animation if no mic
                    const fallbackAnim = () => {
                        setAudioLevel(Math.random() * 30 + 10);
                        animationFrameRef.current = requestAnimationFrame(fallbackAnim);
                    };
                    fallbackAnim();
                }
            };
            startMicrophone();
        } else {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            setAudioLevel(0);
        }

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isCalling, isMuted, isAiSpeaking]);

    const startCall = () => {
        setIsCalling(true);
        setTranscript([]);
        setCurrentStep(0);
        setBookingConfirmed(false);
    };

    const endCall = () => {
        setIsCalling(false);
        setIsAiSpeaking(false);
        setAudioLevel(0);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans relative overflow-hidden selection:bg-primary/30">
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
                <div className="absolute bottom-[10%] right-[20%] w-[30%] h-[40%] rounded-full bg-teal-500/10 blur-[120px]" />
                <div className="absolute top-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay" />
            </div>

            <header className="px-8 py-6 flex justify-between items-center relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.5)]">
                        <BotIcon />
                    </div>
                    <span className="font-bold text-xl tracking-tight">AI Receptionist Demo</span>
                </div>
                {!isCalling ? (
                    <button
                        onClick={startCall}
                        className="bg-white text-black px-6 py-2.5 rounded-full font-bold hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    >
                        Start Interactive Demo
                    </button>
                ) : (
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-semibold animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-red-500" /> Live Call Active
                    </div>
                )}
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">

                {/* Left Column: Transcript */}
                <div className="lg:col-span-3 flex flex-col h-[75vh] glass-card bg-white/[0.02] border-white/5 rounded-3xl overflow-hidden relative">
                    <div className="p-5 border-b border-white/5 bg-black/20 backdrop-blur-md z-10">
                        <h3 className="font-semibold text-white/80 flex items-center gap-2">
                            <MessageBubbleIcon /> Live Transcript
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 flex flex-col">
                        <AnimatePresence>
                            {transcript.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={`flex flex-col max-w-[90%] ${msg.speaker === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                                >
                                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1 px-1">
                                        {msg.speaker === 'user' ? 'You' : 'AI Assistant'}
                                    </span>
                                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-lg ${msg.speaker === 'user'
                                            ? 'bg-blue-600/20 border border-blue-500/30 text-blue-50 rounded-tr-sm backdrop-blur-md'
                                            : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-sm backdrop-blur-md'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {!isCalling && transcript.length === 0 && (
                            <div className="flex-1 flex items-center justify-center text-white/20 text-sm font-medium text-center px-4">
                                Start the call to see the live transcript appear here.
                            </div>
                        )}
                        {isCalling && currentStep < MOCK_CONVERSATION.length && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`flex gap-1.5 p-4 items-center ${isAiSpeaking ? 'self-start' : 'self-end'}`}
                            >
                                <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Center Column: Big 3D Voice Orb */}
                <div className="lg:col-span-6 flex flex-col items-center justify-center h-[75vh] relative">

                    <div className="relative w-64 h-64 flex items-center justify-center mt-[-10%]">
                        {/* Outer Glows */}
                        <motion.div
                            animate={{
                                scale: isCalling ? (isAiSpeaking ? [1, 1.2, 1] : [1, 1.05, 1]) : 1,
                                opacity: isCalling ? (isAiSpeaking ? 0.8 : 0.3) : 0.1
                            }}
                            transition={{ duration: isAiSpeaking ? 1.5 : 3, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 rounded-full bg-teal-500/30 blur-[60px]"
                        />
                        <motion.div
                            animate={{
                                scale: isCalling ? (isAiSpeaking ? [1, 1.4, 1] : [1, 1.1, 1]) : 1,
                                opacity: isCalling ? (isAiSpeaking ? 0.6 : 0.2) : 0.05
                            }}
                            transition={{ duration: isAiSpeaking ? 2 : 4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                            className="absolute inset-0 rounded-full bg-blue-500/20 blur-[80px]"
                        />

                        {/* The Orb core */}
                        <motion.div
                            animate={{
                                rotate: isCalling ? 360 : 0,
                                scale: isCalling && !isAiSpeaking && audioLevel > 10 ? 1 + (audioLevel / 200) : 1
                            }}
                            transition={{ rotate: { duration: 20, repeat: Infinity, ease: "linear" }, scale: { duration: 0.1 } }}
                            className="w-48 h-48 rounded-full relative z-10 overflow-hidden shadow-[inset_0_0_60px_rgba(255,255,255,0.4),0_0_40px_rgba(20,184,166,0.4)] bg-gradient-to-br from-white/10 to-transparent border border-white/20 backdrop-blur-xl"
                        >
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.8),transparent_40%)]" />

                            {/* Internal fluid motion */}
                            <motion.div
                                animate={{
                                    y: isCalling ? ['-10%', '10%', '-10%'] : '0%',
                                    x: isCalling ? ['-5%', '5%', '-5%'] : '0%',
                                }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-teal-400/40 to-blue-600/40 mix-blend-overlay rounded-full blur-xl"
                            />
                        </motion.div>
                    </div>

                    {/* Waveform Visualization */}
                    <div className="mt-16 h-16 w-full max-w-md flex items-center justify-center gap-1.5 px-8">
                        {isCalling ? (
                            // Dynamic waveform based on who is talking
                            [...Array(30)].map((_, i) => {
                                const isActive = isAiSpeaking ? true : audioLevel > 5;
                                const baseHeight = isAiSpeaking
                                    ? Math.sin(i) * 20 + 24 // AI speaking (math generated wave)
                                    : isActive ? Math.random() * (audioLevel || 10) + 10 : 8; // User speaking (mic level)

                                return (
                                    <motion.div
                                        key={i}
                                        animate={{ height: isCalling ? `${Math.max(4, baseHeight)}px` : '4px' }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        className={`w-1.5 rounded-full ${isAiSpeaking ? 'bg-teal-400' : 'bg-blue-400'}`}
                                    />
                                );
                            })
                        ) : (
                            <div className="text-white/20 font-medium tracking-widest text-sm uppercase">Ready to connect</div>
                        )}
                    </div>

                    {/* Call Controls */}
                    <div className="mt-12 flex items-center gap-6 glass-card p-3 rounded-full bg-white/[0.05] border-white/10 backdrop-blur-xl">
                        <button
                            disabled={!isCalling}
                            onClick={() => setIsMuted(!isMuted)}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${!isCalling ? 'opacity-30 cursor-not-allowed bg-white/5 text-white' :
                                    isMuted ? 'bg-white text-black hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                        >
                            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>

                        {!isCalling ? (
                            <button
                                onClick={startCall}
                                className="w-16 h-16 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(20,184,166,0.6)] hover:scale-105 transition-transform"
                            >
                                <PhoneIcon size={28} className="fill-current" />
                            </button>
                        ) : (
                            <button
                                onClick={endCall}
                                className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:scale-105 transition-transform"
                            >
                                <PhoneOff size={28} />
                            </button>
                        )}

                        <button
                            disabled={!isCalling}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${!isCalling ? 'opacity-30 cursor-not-allowed bg-white/5 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                        >
                            <div className="flex gap-1 items-end h-5">
                                <span className="w-1 bg-current rounded-sm animate-[pulse_1s_ease-in-out_infinite]" style={{ height: '60%' }} />
                                <span className="w-1 bg-current rounded-sm animate-[pulse_1s_ease-in-out_infinite_0.2s]" style={{ height: '100%' }} />
                                <span className="w-1 bg-current rounded-sm animate-[pulse_1s_ease-in-out_infinite_0.4s]" style={{ height: '40%' }} />
                            </div>
                        </button>
                    </div>
                </div>

                {/* Right Column: Dynamic Booking Card */}
                <div className="lg:col-span-3 flex flex-col h-[75vh]">
                    <div className="glass-card bg-[#0a0a0a] border-white/5 rounded-3xl p-6 h-full relative overflow-hidden flex flex-col">

                        {/* Glow overlay if confirmed */}
                        <AnimatePresence>
                            {bookingConfirmed && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-gradient-to-b from-teal-500/10 to-transparent pointer-events-none z-0"
                                />
                            )}
                        </AnimatePresence>

                        <div className="flex items-center gap-3 mb-8 relative z-10 border-b border-white/5 pb-6">
                            <div className="p-2.5 rounded-xl bg-white/5 text-white border border-white/10">
                                <CalendarCheck size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg leading-tight">Booking Info</h3>
                                <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mt-1">Live Extraction</p>
                            </div>
                        </div>

                        <div className="flex-1 space-y-6 relative z-10">
                            <InfoBlock
                                icon={<User size={16} />}
                                label="Patient Name"
                                value={currentStep > 7 ? "David Smith" : ""}
                                isTyping={currentStep === 7}
                            />

                            <InfoBlock
                                icon={<PhoneIcon size={16} />}
                                label="Phone Number"
                                value={currentStep > 7 ? "(512) 555-0198" : ""}
                                isTyping={currentStep === 7}
                            />

                            <InfoBlock
                                icon={<CalendarCheck size={16} />}
                                label="Date"
                                value={currentStep > 5 ? "Next Tuesday" : ""}
                                isTyping={currentStep === 5}
                            />

                            <InfoBlock
                                icon={<Clock size={16} />}
                                label="Time"
                                value={currentStep > 5 ? "10:00 AM" : ""}
                                isTyping={currentStep === 5}
                            />

                            <div className="mt-8 relative">
                                <div className="h-0.5 w-full bg-white/5 mb-6" />
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-white/50">Status</span>
                                    {bookingConfirmed ? (
                                        <span className="text-xs font-bold text-teal-400 bg-teal-400/10 px-2.5 py-1 rounded-md border border-teal-400/20 flex items-center gap-1.5 shadow-[0_0_10px_rgba(45,212,191,0.2)]">
                                            <CheckCircle2 size={12} /> Confirmed
                                        </span>
                                    ) : (
                                        <span className="text-xs font-bold text-orange-400 bg-orange-400/10 px-2.5 py-1 rounded-md border border-orange-400/20 animation-pulse">
                                            Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Success Notification pop */}
                        <AnimatePresence>
                            {bookingConfirmed && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-auto bg-teal-500/10 border border-teal-500/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative z-10 shadow-[0_0_20px_rgba(20,184,166,0.15)]"
                                >
                                    <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 mb-3">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <h4 className="text-white font-bold text-sm mb-1">Webhook Sent to FastApi!</h4>
                                    <p className="text-xs text-white/60">Lead injected into Supabase CRM successfully.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Subcomponent for right panel info blocks
function InfoBlock({ icon, label, value, isTyping }: { icon: React.ReactNode, label: string, value: string, isTyping: boolean }) {
    return (
        <div className="flex items-start gap-4 group">
            <div className="p-2 rounded-lg bg-white/5 text-white/50 group-hover:bg-white/10 group-hover:text-white transition-colors border border-white/5">
                {icon}
            </div>
            <div className="flex-1 border-b border-white/5 pb-4">
                <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1">{label}</p>
                <div className="min-h-[24px] flex items-center">
                    {isTyping ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-1 px-1"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '300ms' }} />
                        </motion.div>
                    ) : value ? (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="font-semibold text-white">
                            {value}
                        </motion.div>
                    ) : (
                        <span className="text-white/20 italic text-sm">Waiting...</span>
                    )}
                </div>
            </div>
        </div>
    );
}

// Decorative Icons
function BotIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8V4H8" /><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
        </svg>
    );
}

function MessageBubbleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}
