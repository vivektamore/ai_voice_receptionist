import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Customer Support | ClinicAssist AI",
  description: "Get help with ClinicAssist AI. Contact our support team, find answers to common questions, and access our documentation.",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#0F0F10] font-['Inter']">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0F0F10]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#a3a6ff] flex items-center justify-center">
              <span className="text-black font-black text-sm">C</span>
            </div>
            <span className="font-bold text-white text-lg">ClinicAssist AI</span>
          </Link>
          <nav className="flex gap-6 text-sm text-[#adaaad]">
            <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/cancellation" className="hover:text-white transition-colors">Refunds</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-b from-[#1C1B1D] to-[#0F0F10] border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Support Available</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">How can we help?</h1>
          <p className="text-[#adaaad] text-lg max-w-2xl mx-auto">
            Our support team is here to help you get the most out of ClinicAssist AI. Reach out via email, phone, or browse our FAQs below.
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-16">

        {/* Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">

          {/* Email */}
          <div className="bg-[#1C1B1D] border border-white/5 rounded-2xl p-6 hover:border-[#a3a6ff]/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#a3a6ff]/10 flex items-center justify-center mb-4 group-hover:bg-[#a3a6ff]/20 transition-all">
              <span className="text-2xl">📧</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Email Support</h3>
            <p className="text-[#adaaad] text-sm mb-4">We typically respond within 24 hours on business days.</p>
            <a
              href="mailto:support@clinicassistai.online"
              className="text-[#a3a6ff] font-semibold text-sm hover:underline"
            >
              support@clinicassistai.online
            </a>
          </div>

          {/* Phone */}
          <div className="bg-[#1C1B1D] border border-white/5 rounded-2xl p-6 hover:border-[#a3a6ff]/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#a3a6ff]/10 flex items-center justify-center mb-4 group-hover:bg-[#a3a6ff]/20 transition-all">
              <span className="text-2xl">📞</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Phone Support</h3>
            <p className="text-[#adaaad] text-sm mb-4">Available Monday – Friday, 9:00 AM – 6:00 PM IST.</p>
            <a
              href="tel:+918421783149"
              className="text-[#a3a6ff] font-semibold text-sm hover:underline"
            >
              +91 84217 83149
            </a>
          </div>

          {/* Billing */}
          <div className="bg-[#1C1B1D] border border-white/5 rounded-2xl p-6 hover:border-[#a3a6ff]/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#a3a6ff]/10 flex items-center justify-center mb-4 group-hover:bg-[#a3a6ff]/20 transition-all">
              <span className="text-2xl">💳</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Billing Support</h3>
            <p className="text-[#adaaad] text-sm mb-4">For subscription, invoice, and refund queries.</p>
            <a
              href="mailto:support@clinicassistai.online?subject=Billing%20Support"
              className="text-[#a3a6ff] font-semibold text-sm hover:underline"
            >
              billing@clinicassistai.online
            </a>
          </div>
        </div>

        {/* Registered Office — REQUIRED by Stripe India */}
        <div className="bg-gradient-to-br from-[#1C1B1D] to-[#262528] border border-white/5 rounded-2xl p-8 mb-16">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span>🏢</span> Registered Company Address
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <p className="text-[#adaaad] text-xs uppercase tracking-wider font-semibold mb-3">Business Details</p>
              <div className="space-y-2 text-[#c0bdc2]">
                <p className="text-white font-bold text-lg">ClinicAssistAI</p>
                <p>1102, C4, Poonam Heights</p>
                <p>Virar, Mumbai, Maharashtra</p>
                <p>401303</p>
                <p>India</p>
              </div>
            </div>
            <div>
              <p className="text-[#adaaad] text-xs uppercase tracking-wider font-semibold mb-3">Contact Information</p>
              <div className="space-y-3 text-[#c0bdc2]">
                <div>
                  <p className="text-[#adaaad] text-xs mb-1">Email</p>
                  <a href="mailto:support@clinicassistai.online" className="text-[#a3a6ff] hover:underline">
                    support@clinicassistai.online
                  </a>
                </div>
                <div>
                  <p className="text-[#adaaad] text-xs mb-1">Phone (India)</p>
                  <a href="tel:+918421783149" className="text-[#a3a6ff] hover:underline">
                    +91 84217 83149
                  </a>
                </div>
                <div>
                  <p className="text-[#adaaad] text-xs mb-1">Support Hours</p>
                  <p>Mon – Fri, 9:00 AM – 6:00 PM IST</p>
                </div>
                <div>
                  <p className="text-[#adaaad] text-xs mb-1">Website</p>
                  <a href="https://clinicassistai.online" className="text-[#a3a6ff] hover:underline">
                    clinicassistai.online
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-white mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "How do I cancel my subscription?",
                a: "You can cancel anytime from your dashboard → Billing → Cancel Subscription. Your service will remain active until the end of the current billing period. No charges will be made after that.",
              },
              {
                q: "Can I get a refund after cancelling?",
                a: "Subscription fees are generally non-refundable. However, refunds are available for duplicate billing errors, extended service outages (72+ hours), or unauthorized charges. See our Cancellation & Refund Policy for full details.",
              },
              {
                q: "What happens to my data after I cancel?",
                a: "Your data is retained for 30 days after your subscription ends, giving you time to export any information you need. After 30 days, all data is permanently deleted from our servers.",
              },
              {
                q: "How do I update my billing information?",
                a: "Go to Dashboard → Billing → Manage Plan. This opens the Stripe Customer Portal (for international users) where you can update your card, view invoices, and manage your subscription.",
              },
              {
                q: "Why was my payment declined?",
                a: "Payments may fail due to insufficient funds, expired card, or bank restrictions. Update your payment method in the Billing dashboard and contact your bank if the issue persists. We offer a 7-day grace period before suspension.",
              },
              {
                q: "What is the wallet balance used for?",
                a: "The prepaid wallet covers overage charges — usage beyond your plan's included minutes, SMS, or phone numbers. You can add funds manually or enable auto-recharge to keep it topped up automatically.",
              },
              {
                q: "Can I change my subscription plan?",
                a: "Currently we offer one Growth Plan. Additional features and plans are in development. Contact us at support@clinicassistai.online to discuss custom requirements.",
              },
              {
                q: "Is my patient data secure?",
                a: "Yes. All data is encrypted in transit (TLS) and at rest. We use row-level security to ensure complete data isolation between clinics. We do not share patient data with third parties except the infrastructure providers listed in our Privacy Policy.",
              },
            ].map((item, i) => (
              <details
                key={i}
                className="bg-[#1C1B1D] border border-white/5 rounded-xl p-6 group open:border-[#a3a6ff]/20 transition-all cursor-pointer"
              >
                <summary className="text-white font-semibold flex items-center justify-between list-none">
                  {item.q}
                  <span className="text-[#adaaad] text-xl font-light ml-4 flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-[#c0bdc2] mt-4 leading-relaxed text-sm">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Contact Form CTA */}
        <div className="bg-gradient-to-br from-[#a3a6ff]/10 to-[#6063ee]/5 border border-[#a3a6ff]/20 rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-black text-white mb-3">Still need help?</h2>
          <p className="text-[#adaaad] mb-6 max-w-xl mx-auto">
            Our support team is ready to assist you. Send us an email and we'll get back to you within one business day.
          </p>
          <a
            href="mailto:support@clinicassistai.online"
            className="inline-flex items-center gap-2 bg-[#a3a6ff] hover:bg-[#8d90fa] text-black font-bold px-8 py-4 rounded-xl transition-all active:scale-95"
          >
            📧 Email Our Support Team
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#0F0F10]">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#adaaad] text-sm">© 2025 ClinicAssist AI. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-[#adaaad]">
            <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/cancellation" className="hover:text-white transition-colors">Cancellation Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
