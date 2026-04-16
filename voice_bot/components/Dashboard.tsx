import React from 'react';
import Link from 'next/link';
import { 
  Search, Bell, Shield, UserCircle, PhoneMissed, 
  TrendingUp, Timer, DollarSign, PhoneIncoming, 
  CalendarCheck, Clock, Hash 
} from 'lucide-react';

export default function Dashboard() {
  return (
    <main className="ml-64 min-h-screen bg-[#131315] text-[#e5e1e4] font-['Inter'] selection:bg-[#c0c1ff] selection:text-[#1000a9]">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-8 h-14 bg-[#131315]/50 backdrop-blur-xl border-b border-white/10 font-['Inter'] text-sm font-medium">
        <div className="flex items-center gap-6">
          <span className="text-[#e5e1e4] uppercase tracking-[0.2em] text-[10px] font-bold">System Status: Nominal</span>
          <nav className="flex gap-4">
            <Link href="#" className="text-indigo-400 border-b-2 border-indigo-500 pb-1">Live Feed</Link>
            <Link href="#" className="text-zinc-400 hover:text-white transition-colors pb-1">Analytics</Link>
            <Link href="#" className="text-zinc-400 hover:text-white transition-colors pb-1">History</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              className="bg-[#1c1b1d] border-none rounded-lg pl-9 pr-4 py-1.5 text-xs w-64 focus:ring-1 focus:ring-indigo-500 transition-all outline-none text-[#e5e1e4]" 
              placeholder="Search Command..." 
              type="text"
            />
          </div>
          <div className="flex gap-3 text-zinc-400">
            <button className="hover:text-white transition-colors"><Bell className="w-5 h-5" /></button>
            <button className="hover:text-white transition-colors"><Shield className="w-5 h-5" /></button>
            <button className="hover:text-white transition-colors"><UserCircle className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <div className="p-8 space-y-8">
        {/* Page Header */}
        <section>
          <h2 className="font-['Plus_Jakarta_Sans'] text-[2.75rem] font-semibold tracking-tight text-[#e5e1e4] leading-none">Command Overview</h2>
          <p className="mt-2 text-[#c7c4d7] opacity-60">Real-time clinical throughput and agent performance metrics.</p>
        </section>

        {/* KPI Header (Actionable Signals) */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Missed Calls */}
          <div className="bg-[#18181B]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl hover:translate-y-[-2px] transition-transform">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#c7c4d7]">Missed Calls</span>
              <PhoneMissed className="text-[#ff516a] w-5 h-5" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-['Plus_Jakarta_Sans'] font-bold text-[#ff516a]">12</span>
              <span className="text-[10px] text-[#ff516a] opacity-80 uppercase font-semibold">Critical</span>
            </div>
            <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#ff516a] w-[15%]"></div>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="bg-[#18181B]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl hover:translate-y-[-2px] transition-transform">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#c7c4d7]">Conv. Rate</span>
              <TrendingUp className="text-[#4edea3] w-5 h-5" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-['Plus_Jakarta_Sans'] font-bold text-[#4edea3]">68.4%</span>
              <span className="text-[10px] text-[#4edea3] opacity-80 uppercase font-semibold">+4.2%</span>
            </div>
            <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#4edea3] w-[68%]"></div>
            </div>
          </div>

          {/* Avg Response Time */}
          <div className="bg-[#18181B]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl hover:translate-y-[-2px] transition-transform">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#c7c4d7]">Avg Response</span>
              <Timer className="text-[#c0c1ff] w-5 h-5" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-['Plus_Jakarta_Sans'] font-bold text-[#e5e1e4]">14s</span>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Sub-Target</span>
            </div>
            <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#c0c1ff] w-[45%]"></div>
            </div>
          </div>

          {/* Revenue Impact */}
          <div className="bg-[#18181B]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl hover:translate-y-[-2px] transition-transform">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#c7c4d7]">Rev. Impact</span>
              <DollarSign className="text-[#c0c1ff] w-5 h-5" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-['Plus_Jakarta_Sans'] font-bold text-[#e5e1e4]">$12.8k</span>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Daily</span>
            </div>
            <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#c0c1ff] w-[72%]"></div>
            </div>
          </div>
        </section>

        {/* Main Bento Grid */}
        <section className="grid grid-cols-12 gap-6">
          {/* Performance Graph */}
          <div className="col-span-12 lg:col-span-8 bg-[#18181B]/80 backdrop-blur-md border border-white/10 rounded-xl p-8 h-[400px] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none">
              <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
            </div>
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] text-lg font-semibold">Throughput Volatility</h3>
                <p className="text-[10px] text-[#c7c4d7] uppercase tracking-widest">Call volume vs Agent Availability</p>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-semibold border border-white/10">WEEK</span>
                <span className="px-2 py-1 bg-[#c0c1ff]/10 text-[#c0c1ff] rounded text-[10px] font-semibold border border-[#c0c1ff]/20">MONTH</span>
              </div>
            </div>
            <div className="relative flex-1 flex items-end gap-1 mt-8">
              {/* Abstract Data Viz */}
              <div className="flex-1 bg-white/5 h-[30%] hover:bg-[#c0c1ff]/20 transition-colors"></div>
              <div className="flex-1 bg-white/5 h-[45%] hover:bg-[#c0c1ff]/20 transition-colors"></div>
              <div className="flex-1 bg-white/5 h-[65%] hover:bg-[#c0c1ff]/20 transition-colors"></div>
              <div className="flex-1 bg-white/5 h-[50%] hover:bg-[#c0c1ff]/20 transition-colors"></div>
              <div className="flex-1 bg-white/5 h-[85%] hover:bg-[#c0c1ff]/20 transition-colors"></div>
              <div className="flex-1 bg-white/10 h-[95%] hover:bg-[#c0c1ff]/20 transition-colors"></div>
              <div className="flex-1 bg-[#c0c1ff]/40 h-[100%]"></div>
              <div className="flex-1 bg-white/5 h-[60%] hover:bg-[#c0c1ff]/20 transition-colors"></div>
              <div className="flex-1 bg-white/5 h-[40%] hover:bg-[#c0c1ff]/20 transition-colors"></div>
              <div className="flex-1 bg-white/5 h-[30%] hover:bg-[#c0c1ff]/20 transition-colors"></div>
              <div className="flex-1 bg-white/5 h-[55%] hover:bg-[#c0c1ff]/20 transition-colors"></div>
              <div className="flex-1 bg-white/5 h-[20%] hover:bg-[#c0c1ff]/20 transition-colors"></div>
            </div>
          </div>

          {/* Secondary Stats Stack */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-[#18181B]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#353437] flex items-center justify-center">
                  <PhoneIncoming className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#c7c4d7] font-semibold">Total Calls</p>
                  <p className="text-xl font-['Plus_Jakarta_Sans'] font-bold">1,242</p>
                </div>
              </div>
              <span className="text-[10px] text-[#4edea3] font-bold">+12%</span>
            </div>

            <div className="bg-[#18181B]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#353437] flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#c7c4d7] font-semibold">Appointments</p>
                  <p className="text-xl font-['Plus_Jakarta_Sans'] font-bold">48</p>
                </div>
              </div>
              <span className="text-[10px] text-[#4edea3] font-bold">+5%</span>
            </div>

            <div className="bg-[#18181B]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#353437] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#c7c4d7] font-semibold">Minutes Used</p>
                  <p className="text-xl font-['Plus_Jakarta_Sans'] font-bold">14.2k</p>
                </div>
              </div>
              <span className="text-[10px] text-zinc-500 font-bold">Stable</span>
            </div>

            <div className="bg-[#18181B]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#353437] flex items-center justify-center">
                  <Hash className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#c7c4d7] font-semibold">Active Numbers</p>
                  <p className="text-xl font-['Plus_Jakarta_Sans'] font-bold">12</p>
                </div>
              </div>
              <span className="text-[10px] text-[#c0c1ff] font-bold">Manage</span>
            </div>
          </div>
        </section>

        {/* Bottom Section: Active Logs */}
        <section className="bg-[#18181B]/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-['Plus_Jakarta_Sans'] text-lg font-semibold">Recent Clinical Interactions</h3>
            <button className="text-[10px] uppercase font-bold tracking-widest text-[#c0c1ff]">View All Logs</button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#1c1b1d] text-[10px] uppercase tracking-[0.2em] font-bold text-[#c7c4d7]/70">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Patient/Lead</th>
                <th className="px-6 py-4">Agent Assigned</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-white/5">
              <tr className="hover:bg-white/5 transition-colors cursor-pointer group">
                <td className="px-6 py-4"><span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span> Completed</span></td>
                <td className="px-6 py-4 font-semibold text-[#e5e1e4]">Jameson, Robert</td>
                <td className="px-6 py-4 text-zinc-400">Precision_Bot_A1</td>
                <td className="px-6 py-4 text-zinc-400">04:12</td>
                <td className="px-6 py-4 text-right text-zinc-500 opacity-50 group-hover:opacity-100 transition-opacity">12:44:02 PM</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors cursor-pointer group">
                <td className="px-6 py-4"><span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-pulse"></span> In-Progress</span></td>
                <td className="px-6 py-4 font-semibold text-[#e5e1e4]">Sarah Mitchell</td>
                <td className="px-6 py-4 text-zinc-400">Clinician_Human_X</td>
                <td className="px-6 py-4 text-zinc-400">12:05</td>
                <td className="px-6 py-4 text-right text-zinc-500 opacity-50 group-hover:opacity-100 transition-opacity">12:38:15 PM</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors cursor-pointer group">
                <td className="px-6 py-4"><span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#ff516a]"></span> Dropped</span></td>
                <td className="px-6 py-4 font-semibold text-[#e5e1e4]">Anonymous (Inbound)</td>
                <td className="px-6 py-4 text-zinc-400">Routing...</td>
                <td className="px-6 py-4 text-zinc-400">00:14</td>
                <td className="px-6 py-4 text-right text-zinc-500 opacity-50 group-hover:opacity-100 transition-opacity">12:35:44 PM</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors cursor-pointer group">
                <td className="px-6 py-4"><span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span> Completed</span></td>
                <td className="px-6 py-4 font-semibold text-[#e5e1e4]">Elena Rodriguez</td>
                <td className="px-6 py-4 text-zinc-400">Precision_Bot_A2</td>
                <td className="px-6 py-4 text-zinc-400">03:45</td>
                <td className="px-6 py-4 text-right text-zinc-500 opacity-50 group-hover:opacity-100 transition-opacity">12:30:12 PM</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
