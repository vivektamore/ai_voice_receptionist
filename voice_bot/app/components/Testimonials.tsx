"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

export default function Testimonials() {
    const reviews = [
        {
            name: "Dr. Sarah Jenkins",
            clinic: "SmileBright Dental",
            text: "We used to miss 3-4 new patient calls every day during lunchtime. Since installing the AI Assistant, our booking rate has literally skyrocketed. It pays for itself."
        },
        {
            name: "Mark Thompson",
            clinic: "Oakridge Orthodontics",
            text: "The integration with our CRM is flawless. Patients don't even realize they're talking to an AI half the time. It handles 80% of routine rescheduling entirely on its own."
        },
        {
            name: "Dr. Emily Chen",
            clinic: "Chen Family Dentistry",
            text: "I was skeptical at first, but the voice sounds so natural and empathetic. It perfectly captures emergencies and routes them correctly while handling standard bookings."
        }
    ];

    return (
        <section className="py-24 relative overflow-hidden bg-white/[0.01]">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">

                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold font-[family-name:var(--font-outfit)] mb-4">
                        Trusted by modern <span className="text-gradient">dentists</span>
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {reviews.map((review, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className="glass-card p-6 md:p-8 flex flex-col"
                        >
                            <div className="flex gap-1 text-yellow-400 mb-6">
                                {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-4 h-4 fill-current" />)}
                            </div>
                            <p className="text-foreground/80 leading-relaxed italic mb-8 flex-grow">
                                "{review.text}"
                            </p>
                            <div>
                                <h4 className="font-semibold text-white">{review.name}</h4>
                                <p className="text-sm text-foreground/50">{review.clinic}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

            </div>
        </section>
    );
}
