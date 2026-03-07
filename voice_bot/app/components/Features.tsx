"use client";

import { motion } from "framer-motion";
import { Bot, CalendarCheck, FileText, Smartphone } from "lucide-react";

export default function Features() {
    const features = [
        {
            icon: <Bot size={24} className="text-primary" />,
            title: "AI Voice Receptionist",
            description: "Human-like conversations that sound natural. Replaces generic menus with a smart AI that understands context and emotion."
        },
        {
            icon: <CalendarCheck size={24} className="text-secondary" />,
            title: "24/7 Appointment Booking",
            description: "Allow patients to book, reschedule, or cancel anytime. Automatically syncs with your clinic's calendar instantly."
        },
        {
            icon: <FileText size={24} className="text-emerald-400" />,
            title: "Lead Dashboard",
            description: "Track every caller. View rich transcripts, summaries, and patient intents in a clean, comprehensive CRM dashboard."
        },
        {
            icon: <Smartphone size={24} className="text-pink-400" />,
            title: "Automated SMS",
            description: "Sends instant text message confirmations and reminders automatically right after the call ends."
        }
    ];

    return (
        <section className="py-24 relative z-10">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">

                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold font-[family-name:var(--font-outfit)] mb-4">
                        Everything your front desk needs
                    </h2>
                    <p className="text-foreground/60 text-lg max-w-2xl mx-auto">
                        Our platform perfectly merges artificial intelligence with your existing dental workflows seamlessly.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className="glass-card p-6 flex flex-col hover:border-primary/50 transition-colors group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/20 transition-all" />
                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                            <p className="text-foreground/60 text-sm leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

            </div>
        </section>
    );
}
