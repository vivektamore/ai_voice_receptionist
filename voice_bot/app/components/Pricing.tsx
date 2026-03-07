"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

export default function Pricing() {
    const plans = [
        {
            name: "Starter",
            description: "Perfect for single location clinics.",
            price: "$299",
            features: [
                "1 Local Phone Number",
                "Up to 500 Calls/mo",
                "CRM Dashboard Access",
                "Email Support",
            ]
        },
        {
            name: "Pro",
            description: "For growing multi-practitioner clinics.",
            price: "$599",
            popular: true,
            features: [
                "3 Local Phone Numbers",
                "Up to 2,000 Calls/mo",
                "Advanced Analytics",
                "SMS Reminders Included",
                "Priority 24/7 Support",
            ]
        },
        {
            name: "Enterprise",
            description: "Custom solutions for dental groups.",
            price: "Custom",
            features: [
                "Unlimited Numbers",
                "Unlimited Calls",
                "Custom EHR Integrations",
                "Dedicated Account Manager",
                "Custom Voice Cloning",
            ]
        }
    ];

    return (
        <section className="py-24 relative z-10 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold font-[family-name:var(--font-outfit)] mb-4">
                        Simple, transparent <span className="text-gradient">pricing</span>
                    </h2>
                    <p className="text-foreground/60 text-lg max-w-xl mx-auto">
                        Pay a fraction of what a human receptionist costs, for a system that never sleeps and never misses a call.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className={`glass-card p-8 flex flex-col relative overflow-hidden group hover:border-primary/30 transition-all ${plan.popular ? "scale-105 border-primary/50 bg-primary/5 shadow-2xl shadow-primary/10" : "border-white/5 opacity-80 hover:opacity-100"
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 right-0 px-4 py-1 bg-primary text-[10px] uppercase font-bold tracking-wider rounded-bl-xl text-white">
                                    Most Popular
                                </div>
                            )}

                            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                            <p className="text-sm text-foreground/50 mb-6">{plan.description}</p>

                            <div className="mb-6">
                                <span className="text-4xl font-extrabold font-[family-name:var(--font-outfit)]">{plan.price}</span>
                                {plan.price !== "Custom" && <span className="text-foreground/50 text-sm">/mo</span>}
                            </div>

                            <div className="flex-grow space-y-4 mb-8">
                                {plan.features.map((feat, f) => (
                                    <div key={f} className="flex items-center gap-3">
                                        <Check className="text-primary w-4 h-4 shrink-0" />
                                        <span className="text-sm text-foreground/80">{feat}</span>
                                    </div>
                                ))}
                            </div>

                            <button className={`w-full py-3 rounded-full font-medium transition-colors ${plan.popular
                                    ? "bg-primary text-white hover:bg-primary/90 hover:scale-[1.02]"
                                    : "bg-white/5 border border-white/10 hover:bg-white/10"
                                }`}>
                                {plan.price === "Custom" ? "Contact Sales" : "Start Free Trial"}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
