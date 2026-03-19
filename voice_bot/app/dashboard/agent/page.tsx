"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Mic, Volume2, Globe, Brain, Save, Check,
    ChevronRight, PlayCircle, User, Users
} from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ── Config options ─────────────────────────────────────────────────────────────
const voices = [
    { id: "priya", label: "Priya", gender: "female", desc: "Warm & professional (Female)", preview: "English + Hindi" },
    { id: "tarun", label: "Tarun", gender: "male", desc: "Clear & confident (Male)", preview: "English + Hindi" },
    { id: "meera", label: "Meera", gender: "female", desc: "Friendly & calm (Female)", preview: "Hinglish" },
    { id: "arjun", label: "Arjun", gender: "male", desc: "Authoritative (Male)", preview: "English" },
];

const languages = [
    { id: "en", label: "English", flag: "🇺🇸" },
    { id: "hi", label: "Hindi", flag: "🇮🇳" },
    { id: "auto", label: "Auto-detect (English + Hindi + Hinglish)", flag: "🔁" },
];

const personalities = [
    { id: "receptionist", label: "Receptionist", desc: "Professional & appointment-focused", icon: "🏥" },
    { id: "friendly", label: "Friendly Helper", desc: "Warm, casual & conversational", icon: "😊" },
    { id: "concise", label: "Concise", desc: "Short, fast, no-fluff responses", icon: "⚡" },
    { id: "multilingual", label: "Multilingual Expert", desc: "Natural switching between languages", icon: "🌐" },
];

// Use a static clinic_id for now — you'll get this from auth context in production
const CLINIC_ID = "8a3bf5ea-57e9-482b-adb8-e340181ef86e";

export default function AgentSettingsPage() {
    const [selectedVoice, setSelectedVoice] = useState("priya");
    const [selectedLang, setSelectedLang] = useState("auto");
    const [selectedPersonality, setSelectedPersonality] = useState("receptionist");
    const [customPrompt, setCustomPrompt] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load existing settings from backend
        fetch(`${BACKEND_URL}/api/v1/agent/settings/${CLINIC_ID}`)
            .then(r => r.json())
            .then(data => {
                if (data.voice) setSelectedVoice(data.voice);
                if (data.language) setSelectedLang(data.language);
                if (data.prompt) setCustomPrompt(data.prompt);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch(`${BACKEND_URL}/api/v1/agent/settings/${CLINIC_ID}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    voice: selectedVoice,
                    language: selectedLang,
                    prompt: customPrompt || undefined,
                }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            alert("Failed to save settings. Make sure backend is running.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-[family-name:var(--font-outfit)] tracking-tight">
                        Agent Setup
                    </h1>
                    <p className="text-foreground/60 mt-1">
                        Configure your AI voice receptionist in 3 minutes.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-foreground/40">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Agent Live
                    </div>
                    <motion.button
                        onClick={handleSave}
                        disabled={saving}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 transition-colors text-white text-sm font-semibold shadow-[0_0_20px_var(--primary-glow)] disabled:opacity-60"
                    >
                        {saved ? <Check size={16} /> : saving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : <Save size={16} />}
                        {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
                    </motion.button>
                </div>
            </div>

            {/* Step 1: Voice */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass-card p-6"
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><Mic size={18} /></div>
                    <div>
                        <h2 className="font-semibold text-lg">Step 1 — Choose Voice</h2>
                        <p className="text-sm text-foreground/50">Select how your AI agent sounds</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {voices.map(v => (
                        <button
                            key={v.id}
                            onClick={() => setSelectedVoice(v.id)}
                            className={`relative flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${selectedVoice === v.id
                                ? "border-primary/70 bg-primary/10 shadow-[0_0_18px_rgba(14,165,233,0.15)]"
                                : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"}`}
                        >
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 ${v.gender === "female" ? "bg-pink-500/20 text-pink-300" : "bg-blue-500/20 text-blue-300"}`}>
                                {v.gender === "female" ? <User size={20} /> : <Users size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold">{v.label}</div>
                                <div className="text-xs text-foreground/50 mt-0.5">{v.desc}</div>
                                <div className="text-xs text-primary mt-1">{v.preview}</div>
                            </div>
                            {selectedVoice === v.id && (
                                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <Check size={11} className="text-white" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Step 2: Language */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-6"
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-lg bg-secondary/10 text-secondary"><Globe size={18} /></div>
                    <div>
                        <h2 className="font-semibold text-lg">Step 2 — Language</h2>
                        <p className="text-sm text-foreground/50">Your agent auto-detects language if set to Auto</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    {languages.map(l => (
                        <button
                            key={l.id}
                            onClick={() => setSelectedLang(l.id)}
                            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border text-sm font-medium transition-all ${selectedLang === l.id
                                ? "border-secondary/70 bg-secondary/10 text-secondary"
                                : "border-white/10 bg-white/3 hover:border-white/20 text-foreground/70"}`}
                        >
                            <span className="text-lg">{l.flag}</span>
                            {l.label}
                        </button>
                    ))}
                </div>

                <div className="mt-4 p-3 rounded-lg bg-white/3 border border-white/5 text-xs text-foreground/40 flex items-start gap-2">
                    <span>💡</span>
                    <span>Auto-detect is recommended. The agent switches seamlessly between English, Hindi, and Hinglish based on what the user speaks.</span>
                </div>
            </motion.div>

            {/* Step 3: Personality */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass-card p-6"
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-lg bg-emerald-400/10 text-emerald-400"><Brain size={18} /></div>
                    <div>
                        <h2 className="font-semibold text-lg">Step 3 — Personality</h2>
                        <p className="text-sm text-foreground/50">How should the agent behave?</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {personalities.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedPersonality(p.id)}
                            className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${selectedPersonality === p.id
                                ? "border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_18px_rgba(52,211,153,0.1)]"
                                : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"}`}
                        >
                            <div className="text-2xl">{p.icon}</div>
                            <div>
                                <div className="font-semibold text-sm">{p.label}</div>
                                <div className="text-xs text-foreground/50 mt-0.5">{p.desc}</div>
                            </div>
                            {selectedPersonality === p.id && (
                                <Check size={14} className="ml-auto text-emerald-400 flex-shrink-0" />
                            )}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Custom Prompt (Advanced) */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-6"
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400"><Volume2 size={18} /></div>
                    <div>
                        <h2 className="font-semibold text-lg">Custom Instructions <span className="text-xs text-foreground/40 font-normal ml-2">(Optional)</span></h2>
                        <p className="text-sm text-foreground/50">Override the default agent prompt for this clinic</p>
                    </div>
                </div>
                <textarea
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    placeholder="e.g. Always mention our free consultation offer. Never discuss pricing over the phone. Ask about insurance..."
                    rows={5}
                    className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 outline-none focus:border-primary/50 resize-none transition-colors"
                />
                <p className="text-xs text-foreground/30 mt-2">Leave blank to use the default personality prompt above.</p>
            </motion.div>
        </div>
    );
}
