"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Bot, Phone, Users, History, CreditCard, 
  Settings, HelpCircle, Zap, Lock, LogOut, Server, Database, Radio, CheckCircle2, Loader2, X
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

interface SidebarProps {
  hasNumber: boolean;
  hasSubscription: boolean; // true for both 'active' AND 'cancelling'
  isCancelling?: boolean;   // true only when status = 'cancelling' (grace period)
  isAgentSetup?: boolean;
  serverHasDeployed?: boolean;
}

export default function Sidebar({ hasNumber, hasSubscription, isCancelling, isAgentSetup, serverHasDeployed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployStep, setDeployStep] = useState(0);

  const [hasDeployed, setHasDeployed] = useState(serverHasDeployed || false);

  useEffect(() => {
    // If the server tells us it's deployed, prefer that heavily!
    if (serverHasDeployed) setHasDeployed(true);
  }, [serverHasDeployed]);

  const canGoLive = hasNumber && hasSubscription;

  const routes = [
    { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Agent Setup", icon: Bot, href: "/dashboard/agent" },
    { label: "Phone Numbers", icon: Phone, href: "/dashboard/numbers" },
    { label: "Leads", icon: Users, href: "/dashboard/leads" },
    { label: "Call Logs", icon: History, href: "/dashboard/logs" },
    { label: "Billing", icon: CreditCard, href: "/dashboard/billing" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleDeployClick = () => {
    if (!isAgentSetup) {
      router.push("/dashboard/agent?setup_required=true");
      return;
    }

    setShowDeployModal(true);
    setDeployStep(0);
    // Fake deployment sequence timings
    setTimeout(() => setDeployStep(1), 1200); // Provisioning memory
    setTimeout(() => setDeployStep(2), 2500); // Syncing Webhooks
    setTimeout(() => setDeployStep(3), 4000); // Final verification
    setTimeout(async () => {
      setDeployStep(4);
      setHasDeployed(true);

      // Save the deployed state to the database persistently!
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("clinics")
          .update({ onboarding_step: "completed_deployed" })
          .eq("user_id", user.id);
        
        router.refresh();
      }
    }, 5000); // Success!
  };

  const goLiveLockedMessage = () => {
    if (!hasSubscription && !hasNumber) {
      return { msg: "Subscribe + get a number to go live", cta: "/dashboard/billing", ctaLabel: "View Plans" };
    }
    if (hasSubscription && !hasNumber) {
      return { msg: "Get your FREE included number", cta: "/dashboard/numbers", ctaLabel: "Get Number" };
    }
    if (!hasSubscription && hasNumber) {
      return { msg: "Subscribe to activate your agent", cta: "/dashboard/billing", ctaLabel: "Subscribe Now" };
    }
    return null;
  };

  const locked = goLiveLockedMessage();

  return (
    <>
      <aside className="fixed left-0 top-0 h-screen w-64 hidden flex-col p-4 gap-2 bg-[#1C1B1D]/80 backdrop-blur-xl border-r border-white/10 shadow-2xl shadow-black/50 z-40 font-['Plus_Jakarta_Sans'] antialiased tracking-tight lg:flex">
        <div className="px-2 py-4 mb-4">
          <h1 className="text-xl font-bold tracking-tighter text-[#c0c1ff] uppercase">Command Center</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#c7c4d7] opacity-50">Precision Lab v2.4</p>
        </div>
        
        <nav className="flex-1 space-y-1">
          {routes.map((route) => {
            const isActive = pathname === route.href;
            return (
              <Link 
                key={route.href}
                href={route.href} 
                className={cn(
                  "flex items-center gap-3 px-3 py-2 transition-all duration-200 border-r-2 font-semibold group rounded-lg",
                  isActive 
                    ? "text-[#c0c1ff] bg-[#c0c1ff]/10 border-[#c0c1ff]" 
                    : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5"
                )}
              >
                <route.icon className={cn("w-5 h-5", isActive ? "text-[#c0c1ff]" : "text-zinc-500 group-hover:text-zinc-300")} />
                <span className="text-sm">{route.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 space-y-2 border-t border-white/5">
          {/* ── GO LIVE BUTTON ── */}
          {canGoLive ? (
            <button
              onClick={handleDeployClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-[#051a10] font-bold rounded-xl text-xs tracking-widest uppercase hover:opacity-90 transition-all active:scale-95 duration-100 shadow-[0_0_20px_rgba(52,211,153,0.25)]"
            >
              <Zap className="w-4 h-4" />
              {hasDeployed ? "Sync Updates" : "Go Live / Deploy"}
            </button>
          ) : (
            <div className="group relative mb-2">
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white/30 font-bold rounded-xl text-xs tracking-widest uppercase cursor-not-allowed"
              >
                <Lock className="w-3.5 h-3.5" />
                Go Live / Deploy
              </button>
              {locked && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#111113] border border-amber-500/20 rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{locked.msg}</p>
                  </div>
                  <Link
                    href={locked.cta}
                    className="pointer-events-auto mt-1 w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg text-amber-300 text-[10px] font-bold uppercase tracking-widest transition-colors"
                  >
                    <Zap className="w-3 h-3" />
                    {locked.ctaLabel}
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Status Pill */}
          <div className={cn(
            "mx-1 flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest mb-1",
            canGoLive && !isCancelling
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : isCancelling
              ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
              : "bg-white/5 text-white/30 border border-white/10"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              canGoLive && !isCancelling ? "bg-emerald-400 animate-pulse" 
              : isCancelling ? "bg-orange-400 animate-pulse"
              : "bg-white/20"
            )} />
            {canGoLive && !isCancelling ? "Agent Live" 
              : isCancelling ? "Plan Cancelling" 
              : hasSubscription ? "No Number" 
              : "No Plan"}
          </div>

          <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200 rounded-lg">
            <Settings className="w-5 h-5" />
            <span className="text-sm">Settings</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 rounded-lg"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── FAKE DEPLOY ANIMATION MODAL ── */}
      <AnimatePresence>
        {showDeployModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => { if (deployStep === 4) setShowDeployModal(false); }}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-gradient-to-b from-[#1C1B1D] to-[#111113] border border-white/10 shadow-2xl rounded-3xl overflow-hidden font-['Plus_Jakarta_Sans']"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {hasDeployed ? "Syncing Config" : "Deploying AI Agent"}
                </h2>
                <p className="text-xs text-[#adaaad] mt-1 tracking-wide">Pushing changes to LiveKit Edge Nodes</p>
              </div>

              {/* Steps Body */}
              <div className="p-6 space-y-6">
                
                {/* Step 1 */}
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-lg flex-shrink-0 transition-colors", deployStep >= 1 ? "bg-[#a3a6ff]/20 text-[#a3a6ff]" : "bg-white/5 text-white/30")}>
                    {deployStep === 0 ? <Loader2 className="w-5 h-5 animate-spin text-[#a3a6ff]" /> : <Database className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className={cn("text-sm font-semibold transition-colors", deployStep >= 1 ? "text-white" : "text-white/50")}>Updating Memory Context</h3>
                    <p className="text-xs text-[#adaaad]/70 mt-1">Applying updated clinic configuration.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-lg flex-shrink-0 transition-colors", deployStep >= 2 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/30")}>
                    {deployStep === 1 ? <Loader2 className="w-5 h-5 animate-spin text-emerald-400" /> : <Server className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className={cn("text-sm font-semibold transition-colors", deployStep >= 2 ? "text-white" : "text-white/50")}>Synchronizing Prompt Logic</h3>
                    <p className="text-xs text-[#adaaad]/70 mt-1">Modifying identity and conversational flows.</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-lg flex-shrink-0 transition-colors", deployStep >= 3 ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-white/30")}>
                    {deployStep === 2 ? <Loader2 className="w-5 h-5 animate-spin text-amber-400" /> : <Radio className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className={cn("text-sm font-semibold transition-colors", deployStep >= 3 ? "text-white" : "text-white/50")}>Restarting Edge Handlers</h3>
                    <p className="text-xs text-[#adaaad]/70 mt-1">Applying real-time voice synthesis updates.</p>
                  </div>
                </div>
              </div>

              {/* Success State / Footer */}
              <div className={cn(
                "p-6 transition-all duration-500 text-center flex flex-col items-center justify-center",
                deployStep === 4 ? "bg-emerald-500/10" : "bg-transparent h-0 opacity-0 overflow-hidden py-0"
              )}>
                {deployStep === 4 && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-3 p-3 bg-emerald-500/20 rounded-full">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </motion.div>
                )}
                <h3 className="text-lg font-bold text-emerald-400">Sync Complete!</h3>
                <p className="text-xs text-emerald-400/70 mt-1 max-w-[200px] mx-auto leading-relaxed">
                  Your AI Receptionist has successfully learned your new settings.
                </p>
                <button 
                  onClick={() => setShowDeployModal(false)}
                  className="mt-5 w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-widest text-xs justify-center items-center rounded-xl shadow-lg transition-all active:scale-95"
                >
                  Close & Continue
                </button>
              </div>
              
              {deployStep < 4 && (
                <div className="absolute top-4 right-4">
                  <button onClick={() => setShowDeployModal(false)} className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
