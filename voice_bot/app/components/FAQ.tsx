"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function FAQ() {
    const [open, setOpen] = useState<number | null>(0);

    const faqs = [
        {
            q: "Will patients know they are talking to an AI?",
            a: "The AI is designed to sound extremely natural and conversational. While some may realize it's a digital assistant, most patients find the experience faster and more efficient than waiting on hold for a human."
        },
        {
            q: "How does it integrate with our calendar?",
            a: "Our backend connects directly via secure API to standard dental calendar systems (like Eaglesoft, Dentrix, or standard Google/Outlook variants). It checks real-time availability before proposing times."
        },
        {
            q: "What if it's a dental emergency?",
            a: "We program the AI with strict safety protocols. If a patient mentions severe pain, bleeding, or keywords like 'emergency', the AI immediately instructs them to seek urgent care or routes the call to an emergency bypass line."
        },
        {
            q: "How long does setup take?",
            a: "Once you sign up, we can port your number or provide a call-forwarding number in less than 24 hours. The AI is fully ready out-of-the-box."
        }
    ];

    return (
        <section className="py-24 relative z-10">
            <div className="max-w-3xl mx-auto px-6 lg:px-8">
                <h2 className="text-3xl md:text-5xl font-bold font-[family-name:var(--font-outfit)] mb-12 text-center">
                    Frequently asked <span className="text-gradient">questions</span>
                </h2>

                <div className="space-y-4">
                    {faqs.map((faq, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="glass-card overflow-hidden"
                        >
                            <button
                                className="w-full px-6 py-5 flex items-center justify-between text-left font-semibold group"
                                onClick={() => setOpen(open === i ? null : i)}
                            >
                                <span>{faq.q}</span>
                                <ChevronDown
                                    className={`w-5 h-5 text-foreground/50 transition-transform ${open === i ? 'rotate-180' : ''}`}
                                />
                            </button>

                            <div
                                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${open === i ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                <p className="text-foreground/70 text-sm leading-relaxed">{faq.a}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
