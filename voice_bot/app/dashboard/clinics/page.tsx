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
    Settings,
    ChevronDown
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const CLINICS_MOCK = [
    { id: "1", name: "SmileBright Dental", phone: "+1 (555) 123-4567", vapiNumber: "+1 (800) 999-8888", plan: "Pro", callsThisMonth: 1245, status: "Active" },
    { id: "2", name: "Oakridge Orthodontics", phone: "+1 (555) 987-6543", vapiNumber: "+1 (800) 777-6666", plan: "Enterprise", callsThisMonth: 3412, status: "Active" },
    { id: "3", name: "Downtown Dental Care", phone: "+1 (555) 456-7890", vapiNumber: "Not Assigned", plan: "Starter", callsThisMonth: 0, status: "Paused" },
    { id: "4", name: "Sunny Side Pediatric", phone: "+1 (555) 222-3333", vapiNumber: "+1 (800) 555-4444", plan: "Pro", callsThisMonth: 890, status: "Active" },
    { id: "5", name: "Lakeview Family Dental", phone: "+1 (555) 666-7777", vapiNumber: "+1 (800) 333-2222", plan: "Starter", callsThisMonth: 420, status: "Active" },
];

export default function ClinicsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [planFilter, setPlanFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const filteredClinics = CLINICS_MOCK.filter(clinic => {
        const matchesSearch = clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              clinic.vapiNumber.includes(searchTerm);
        const matchesPlan = planFilter === "all" || clinic.plan.toLowerCase() === planFilter.toLowerCase();
        const matchesStatus = statusFilter === "all" || clinic.status.toLowerCase() === statusFilter.toLowerCase();
        
        return matchesSearch && matchesPlan && matchesStatus;
    });

    return (
        <div className="space-y-8 bg-[#0e0e10] text-[#f9f5f8] min-h-screen p-6 md:p-10 font-sans selection:bg-[#a3a6ff] selection:text-black">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-[2.75rem] leading-none font-medium tracking-tight text-[#f9f5f8]">Clinics</h1>
                    <p className="text-[#adaaad] mt-3 tracking-wide">Manage all onboarded clinics and AI routing numbers.</p>
                </div>
                <button className={cn(
                    "px-5 py-3 rounded-xl bg-[#a3a6ff] hover:bg-[#a3a6ff]/90 transition-colors",
                    "text-black text-sm font-semibold flex items-center justify-center gap-2"
                )}>
                    <Plus size={18} strokeWidth={2.5} />
                    Add Clinic
                </button>
            </div>

            {/* Controls */}
            <div className="bg-[#131315] rounded-2xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center relative z-10">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#48474a] group-focus-within:text-[#a3a6ff] transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search clinics or phone numbers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={cn(
                            "w-full bg-[#262528] rounded-xl pl-12 pr-4 py-3 text-sm outline-none transition-all placeholder:text-[#48474a]",
                            "focus:ring-1 focus:ring-[#a3a6ff]/40 focus:bg-[#2c2c2f]"
                        )}
                    />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full sm:w-auto min-w-[140px]">
                        <select 
                            value={planFilter}
                            onChange={(e) => setPlanFilter(e.target.value)}
                            className={cn(
                                "w-full bg-[#262528] rounded-xl px-4 py-3 text-sm outline-none transition-all cursor-pointer appearance-none",
                                "focus:ring-1 focus:ring-[#a3a6ff]/40 hover:bg-[#2c2c2f]"
                            )}
                        >
                            <option value="all">All Plans</option>
                            <option value="starter">Starter</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#48474a] pointer-events-none" size={16} />
                    </div>
                    
                    <div className="relative w-full sm:w-auto min-w-[140px]">
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={cn(
                                "w-full bg-[#262528] rounded-xl px-4 py-3 text-sm outline-none transition-all cursor-pointer appearance-none",
                                "focus:ring-1 focus:ring-[#a3a6ff]/40 hover:bg-[#2c2c2f]"
                            )}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#48474a] pointer-events-none" size={16} />
                    </div>
                </div>
            </div>

            {/* Table */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-[#131315] rounded-[20px] p-2"
            >
                {/* Custom Table Header */}
                <div className="hidden md:flex items-center px-6 py-4 text-[#adaaad] text-xs font-semibold uppercase tracking-widest border-b border-white/5 mx-2 mb-2">
                    <div className="w-[35%]">Clinic Details</div>
                    <div className="w-[25%]">AI Phone Number</div>
                    <div className="w-[20%]">Plan & Usage</div>
                    <div className="w-[10%] text-center">Status</div>
                    <div className="w-[10%] text-right">Actions</div>
                </div>

                {/* Table Body */}
                <div className="flex flex-col gap-2">
                    {filteredClinics.map((clinic, i) => (
                        <div key={clinic.id} className="group relative flex flex-col md:flex-row md:items-center px-6 py-5 rounded-2xl transition-all hover:bg-[#2c2c2f]">
                            {/* Hover Accent Bar */}
                            <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-[#a3a6ff] opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            {/* Mobile View Layout Container */}
                            <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4 md:gap-0">
                                
                                <div className="w-full md:w-[35%] flex items-center gap-4">
                                    <div className="w-12 h-12 shrink-0 rounded-[14px] bg-gradient-to-br from-[#262528] to-[#131315] flex items-center justify-center font-bold text-lg text-[#f9f5f8] shadow-inner border border-[#48474a]/20">
                                        {clinic.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-[1.05rem] font-medium text-[#f9f5f8]">{clinic.name}</h4>
                                        <div className="flex items-center gap-1.5 text-xs text-[#adaaad] mt-1">
                                            <MapPin size={13} strokeWidth={2.5} />
                                            Main Office
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="w-full md:w-[25%] flex items-center gap-2">
                                    <PhoneCall size={15} className={clinic.vapiNumber !== "Not Assigned" ? "text-[#a3a6ff]" : "text-[#48474a]"} />
                                    <span className={cn(
                                        "text-[0.95rem]",
                                        clinic.vapiNumber === "Not Assigned" ? "text-[#48474a] italic" : "font-mono font-medium tracking-wide text-[#f9f5f8]"
                                        )}>
                                        {clinic.vapiNumber}
                                    </span>
                                </div>
                                
                                <div className="w-full md:w-[20%] flex flex-col gap-1">
                                    <span className="text-sm font-medium text-[#f9f5f8]">{clinic.plan}</span>
                                    <span className="text-xs text-[#adaaad]">{clinic.callsThisMonth} calls this month</span>
                                </div>
                                
                                <div className="w-full md:w-[10%] flex md:justify-center items-center">
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.7rem] font-bold uppercase tracking-wider",
                                        clinic.status === 'Active'
                                            ? 'bg-[#9396ff]/15 text-[#a3a6ff]'
                                            : 'bg-[#48474a]/20 text-[#adaaad]'
                                    )}>
                                        {clinic.status === 'Active' ? <Activity size={12} strokeWidth={3} /> : <PauseCircle size={12} strokeWidth={3} />}
                                        {clinic.status}
                                    </span>
                                </div>

                                <div className="absolute top-4 right-4 md:relative md:top-auto md:right-auto md:w-[10%] flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 hover:bg-[#48474a]/30 rounded-lg transition-colors text-[#adaaad] hover:text-[#f9f5f8]" title="Manage AI Assistant">
                                        <Settings size={18} />
                                    </button>
                                    <button className="p-2 hover:bg-[#48474a]/30 rounded-lg transition-colors text-[#adaaad] hover:text-[#f9f5f8]" title="More Options">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredClinics.length === 0 && (
                        <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-[#262528] flex items-center justify-center text-[#adaaad]">
                                <Search size={24} />
                            </div>
                            <p className="text-[#adaaad] font-medium">No clinics found matching your search.</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

