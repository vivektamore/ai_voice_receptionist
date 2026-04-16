import Link from 'next/link';
import { 
  LayoutDashboard, Bot, Phone, Users, History, CreditCard, 
  Plus, Settings, HelpCircle 
} from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col p-4 gap-2 bg-[#1C1B1D]/80 backdrop-blur-md border-r border-white/10 shadow-2xl shadow-black/50 z-50 font-['Plus_Jakarta_Sans'] antialiased tracking-tight">
      <div className="px-2 py-4 mb-4">
        <h1 className="text-xl font-bold tracking-tighter text-indigo-500 uppercase">Command Center</h1>
        <p className="text-[10px] uppercase tracking-widest text-[#c7c4d7] opacity-50">Precision Lab v2.4</p>
      </div>
      
      <nav className="flex-1 space-y-1">
        {/* Active: Overview */}
        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-indigo-400 bg-indigo-500/10 font-semibold border-r-2 border-indigo-500 transition-all duration-200">
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-sm">Overview</span>
        </Link>
        <Link href="/dashboard/agent" className="flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200">
          <Bot className="w-5 h-5" />
          <span className="text-sm">Agent Setup</span>
        </Link>
        <Link href="/dashboard/numbers" className="flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200">
          <Phone className="w-5 h-5" />
          <span className="text-sm">Phone Numbers</span>
        </Link>
        <Link href="/dashboard/leads" className="flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200">
          <Users className="w-5 h-5" />
          <span className="text-sm">Leads</span>
        </Link>
        <Link href="/dashboard/logs" className="flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200">
          <History className="w-5 h-5" />
          <span className="text-sm">Call Logs</span>
        </Link>
        <Link href="/dashboard/billing" className="flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200">
          <CreditCard className="w-5 h-5" />
          <span className="text-sm">Billing</span>
        </Link>
      </nav>

      <div className="mt-auto pt-4 space-y-1 border-t border-white/5">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-4 bg-[#c0c1ff] text-[#07006c] font-bold rounded-lg text-xs tracking-tight hover:opacity-90 transition-all active:scale-95 duration-100">
          <Plus className="w-4 h-4" />
          New Agent
        </button>
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200">
          <Settings className="w-5 h-5" />
          <span className="text-sm">Settings</span>
        </Link>
        <Link href="/support" className="flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200">
          <HelpCircle className="w-5 h-5" />
          <span className="text-sm">Support</span>
        </Link>
      </div>
    </aside>
  );
}
