import { ShieldCheck, Mail, MapPin, Phone } from "lucide-react";

export default function Footer() {
    return (
        <footer className="border-t border-white/5 bg-background relative z-10">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">

                    <div className="col-span-1 md:col-span-2">
                        <h3 className="text-2xl font-bold font-[family-name:var(--font-outfit)] mb-4">
                            AI Dental <span className="text-primary">Voice</span>
                        </h3>
                        <p className="text-foreground/60 text-sm max-w-sm mb-6 leading-relaxed">
                            We empower modern dental operations with AI. Scalable, seamless, and emotionally intelligent appointment scheduling systems.
                        </p>
                        <div className="flex gap-4">
                            <span className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-foreground hover:text-primary transition-colors cursor-pointer">
                                X
                            </span>
                            <span className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-foreground hover:text-primary transition-colors cursor-pointer">
                                in
                            </span>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-white mb-4">Product</h4>
                        <ul className="space-y-3 text-sm text-foreground/60">
                            <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Integrations</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Changelog</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-white mb-4">Contact Us</h4>
                        <ul className="space-y-3 text-sm text-foreground/60">
                            <li className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-primary" />
                                hello@aidentalvoice.com
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-primary" />
                                +1 (800) 555-0192
                            </li>
                            <li className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary" />
                                Austin, Texas
                            </li>
                        </ul>
                    </div>

                </div>

                <div className="border-t border-white/5 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-foreground/40">
                    <p>© {new Date().getFullYear()} AI Dental Voice Inc. All rights reserved.</p>
                    <div className="flex items-center gap-4 mt-4 md:mt-0">
                        <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> HIPAA Compliant Architecture
                        </span>
                        <a href="#" className="hover:text-white">Privacy</a>
                        <a href="#" className="hover:text-white">Terms</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
