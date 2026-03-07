"use client";

import { motion } from "framer-motion";
import {
    Search,
    Plus,
    MoreVertical,
    PhoneCall,
    MapPin,
    Activity,
    PauseCircle,
    Settings
} from "lucide-react";
import { useState } from "react";

const CLINICS_MOCK = [
    { id: "1", name: "SmileBright Dental", phone: "+1 (555) 123-4567", vapiNumber: "+1 (800) 999-8888", plan: "Pro", callsThisMonth: 1245, status: "Active" },
    { id: "2", name: "Oakridge Orthodontics", phone: "+1 (555) 987-6543", vapiNumber: "+1 (800) 777-6666", plan: "Enterprise", callsThisMonth: 3412, status: "Active" },
    { id: "3", name: "Downtown Dental Care", phone: "+1 (555) 456-7890", vapiNumber: "Not Assigned", plan: "Starter", callsThisMonth: 0, status: "Paused" },
    { id: "4", name: "Sunny Side Pediatric", phone: "+1 (555) 222-3333", vapiNumber: "+1 (800) 555-4444", plan: "Pro", callsThisMonth: 890, status: "Active" },
    { id: "5", name: "Lakeview Family Dental", phone: "+1 (555) 666-7777", vapiNumber: "+1 (800) 333-2222", plan: "Starter", callsThisMonth: 420, status: "Active" },
];

export default function ClinicsPage() {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredClinics = CLINICS_MOCK.filter(clinic =>
        clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.vapiNumber.includes(searchTerm)
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-[family-name:var(--font-outfit)] tracking-tight">Clinics</h1>
                    <p className="text-foreground/60 mt-1">Manage all onboarded clinics and AI routing numbers.</p>
                </div>
                <button className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 transition-colors text-white text-sm font-medium shadow-[0_0_15px_var(--primary-glow)] flex items-center justify-center gap-2">
                    <Plus size={18} />
                    Add Clinic
                </button>
            </div>

            {/* Controls */}
            <div className="glass-card p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
                    <input
                        type="text"
                        placeholder="Search clinics or phone numbers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 focus:border-primary/50 rounded-lg pl-10 pr-4 py-2 text-sm outline-none transition-colors"
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select className="flex-1 sm:flex-none bg-black/20 border border-white/5 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary/50 text-foreground cursor-pointer appearance-none">
                        <option value="all">All Plans</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                    </select>
                    <select className="flex-1 sm:flex-none bg-black/20 border border-white/5 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary/50 text-foreground cursor-pointer appearance-none">
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="glass-card overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-4 text-xs font-medium text-foreground/50 uppercase tracking-wider">Clinic Details</th>
                                <th className="px-6 py-4 text-xs font-medium text-foreground/50 uppercase tracking-wider">AI Phone Number</th>
                                <th className="px-6 py-4 text-xs font-medium text-foreground/50 uppercase tracking-wider">Plan & Usage</th>
                                <th className="px-6 py-4 text-xs font-medium text-foreground/50 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-medium text-foreground/50 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredClinics.map((clinic, i) => (
                                <tr key={clinic.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center font-bold text-lg">
                                                {clinic.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm">{clinic.name}</h4>
                                                <div className="flex items-center gap-1 text-xs text-foreground/50 mt-1">
                                                    <MapPin size={12} />
                                                    Main Office
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <PhoneCall size={14} className={clinic.vapiNumber !== "Not Assigned" ? "text-primary" : "text-foreground/30"} />
                                            <span className={`text-sm ${clinic.vapiNumber === "Not Assigned" ? "text-foreground/40 italic" : "font-mono"}`}>
                                                {clinic.vapiNumber}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium">{clinic.plan}</span>
                                            <span className="text-xs text-foreground/50">{clinic.callsThisMonth} calls this month</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${clinic.status === 'Active'
                                                ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                                                : 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                                            }`}>
                                            {clinic.status === 'Active' ? <Activity size={12} /> : <PauseCircle size={12} />}
                                            {clinic.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-foreground/60 hover:text-white" title="Manage AI Assistant">
                                                <Settings size={18} />
                                            </button>
                                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-foreground/60 hover:text-white" title="More Options">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredClinics.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-foreground/50">
                                        No clinics found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}
