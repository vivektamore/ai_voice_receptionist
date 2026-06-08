"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, HardDrive, CreditCard, Bot, Phone, Save, Loader2, ArrowLeft } from "lucide-react";
import { saveGlobalSettings } from "./actions";

interface SettingsClientProps {
  initialSettings: Record<string, string>;
}

const SETTING_GROUPS = [
  {
    title: "AI Voice & Telephony",
    icon: <Bot className="w-4 h-4 text-emerald-400" />,
    color: "emerald",
    fields: [
      { key: "livekit_url", label: "LiveKit URL", type: "text", placeholder: "wss://my-project.livekit.cloud" },
      { key: "livekit_api_key", label: "LiveKit API Key", type: "password" },
      { key: "livekit_api_secret", label: "LiveKit API Secret", type: "password" },
      { key: "livekit_outbound_trunk_id", label: "LiveKit Outbound Trunk ID", type: "text" },
      { key: "livekit_inbound_trunk_vobiz", label: "LiveKit Inbound Trunk ID (VoBiz)", type: "text" },
      { key: "livekit_inbound_trunk_telnyx", label: "LiveKit Inbound Trunk ID (Telnyx)", type: "text" },
      { key: "livekit_inbound_trunk_custom", label: "LiveKit Inbound Trunk ID (Custom)", type: "text" },
      { key: "livekit_sip_host", label: "LiveKit SIP Host", type: "text" },
      { key: "webhook_url", label: "API Webhook URL", type: "text" },
      { key: "groq_api_key", label: "Groq API Key", type: "password" },
      { key: "sarvam_api_key", label: "Sarvam API Key", type: "password" }
    ]
  },
  {
    title: "SMS & Messaging",
    icon: <Phone className="w-4 h-4 text-blue-400" />,
    color: "blue",
    fields: [
      { key: "sms_provider", label: "Default SMS Provider", type: "text", placeholder: "telnyx or twilio" },
      { key: "telnyx_api_key", label: "Telnyx API Key", type: "password" },
      { key: "telnyx_connection_id", label: "Telnyx Connection ID", type: "text" },
      { key: "twilio_account_sid", label: "Twilio Account SID", type: "password" },
      { key: "twilio_auth_token", label: "Twilio Auth Token", type: "password" },
      { key: "default_country_code", label: "Default Country Code", type: "text", placeholder: "US" }
    ]
  },
  {
    title: "Billing & Payments (Razorpay)",
    icon: <CreditCard className="w-4 h-4 text-purple-400" />,
    color: "purple",
    fields: [
      { key: "razorpay_key_id", label: "Razorpay Key ID", type: "password" },
      { key: "razorpay_key_secret", label: "Razorpay Key Secret", type: "password" },
      { key: "razorpay_plan_id_inr", label: "Phone Rental Plan ID (INR)", type: "text" },
      { key: "razorpay_plan_id_usd", label: "Phone Rental Plan ID (USD)", type: "text" },
      { key: "razorpay_webhook_secret", label: "Razorpay Webhook Secret", type: "password" }
    ]
  }
];

export default function SettingsClient({ initialSettings }: SettingsClientProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, string>>(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveGlobalSettings(formData);
      if (res.status === "ok") {
        showToast("Settings saved & backend reloaded!", "ok");
      } else if (res.status === "warn") {
        showToast("Saved, but backend reload failed.", "err");
      } else {
        showToast("Failed to save settings.", "err");
      }
    });
  };

  return (
    <div className="min-h-screen text-[#e5e1e4] font-['Inter'] pb-20">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 ${toast.type === "ok" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"} border backdrop-blur-md font-medium text-sm`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#09090B]/90 backdrop-blur-xl border-b border-white/8 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/admin")} className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-[#c0c1ff]/10 border border-[#c0c1ff]/20 flex items-center justify-center">
            <HardDrive className="w-4 h-4 text-[#c0c1ff]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">Global Keys & Config</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">SaaS Owner Settings</p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-[#c0c1ff] hover:bg-[#c0c1ff]/90 text-black font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isPending ? "Saving & Reloading..." : "Save & Apply Changes"}
        </button>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto mt-8 px-6 space-y-8">
        
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3 text-yellow-500">
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <div className="text-xs leading-relaxed">
            <p className="font-bold mb-1">Global Configuration Center</p>
            Keys saved here will override your server's `.env` files dynamically. 
            Do not share these keys. Be careful when updating Razorpay or LiveKit settings as live calls and billing depend on them.
          </div>
        </div>

        {SETTING_GROUPS.map((group) => (
          <div key={group.title} className="bg-[#111114] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
              <div className={`p-1.5 rounded-lg bg-${group.color}-500/10 border border-${group.color}-500/20`}>
                {group.icon}
              </div>
              <h2 className="text-sm font-bold text-white">{group.title}</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {group.fields.map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={formData[f.key] || ""}
                    placeholder={f.placeholder || "********"}
                    onChange={(e) => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#c0c1ff]/50 focus:bg-white/5 transition-all font-mono"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
