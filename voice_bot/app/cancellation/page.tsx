import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy | ClinicAssist AI",
  description: "Cancellation and Refund Policy for ClinicAssist AI. Understand your rights and our process for cancellations and refunds.",
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-xl font-bold text-white mb-4 pb-2 border-b border-white/10">{title}</h2>
    <div className="space-y-3 text-[#c0bdc2] leading-relaxed">{children}</div>
  </section>
);

const InfoBox = ({ icon, title, children, color = "purple" }: {
  icon: string; title: string; children: React.ReactNode; color?: "purple" | "green" | "red" | "orange"
}) => {
  const colors = {
    purple: "bg-[#a3a6ff]/5 border-[#a3a6ff]/20 text-[#a3a6ff]",
    green: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
    red: "bg-red-500/5 border-red-500/20 text-red-400",
    orange: "bg-orange-500/5 border-orange-500/20 text-orange-400",
  };
  return (
    <div className={`border rounded-xl p-5 ${colors[color]}`}>
      <p className="font-bold mb-2">{icon} {title}</p>
      <div className="text-[#c0bdc2]">{children}</div>
    </div>
  );
};

export default function CancellationPage() {
  const lastUpdated = "May 19, 2025";

  return (
    <div className="min-h-screen bg-[#0F0F10] font-['Inter']">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0F0F10]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#a3a6ff] flex items-center justify-center">
              <span className="text-black font-black text-sm">C</span>
            </div>
            <span className="font-bold text-white text-lg">ClinicAssist AI</span>
          </Link>
          <nav className="flex gap-6 text-sm text-[#adaaad]">
            <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-b from-[#1C1B1D] to-[#0F0F10] border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="inline-flex items-center gap-2 bg-[#a3a6ff]/10 border border-[#a3a6ff]/20 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#a3a6ff]" />
            <span className="text-[#a3a6ff] text-xs font-semibold uppercase tracking-wider">Legal</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-4">Cancellation & Refund Policy</h1>
          <p className="text-[#adaaad] text-lg">Last updated: {lastUpdated}</p>
          <p className="text-[#adaaad] mt-4 max-w-2xl">
            This policy is compliant with Indian consumer protection laws and Stripe's requirements for Indian businesses. Please read it carefully before subscribing.
          </p>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="bg-[#1C1B1D] border border-white/5 rounded-2xl p-5 text-center">
            <p className="text-3xl mb-2">🗓️</p>
            <p className="text-white font-bold mb-1">Cancel Anytime</p>
            <p className="text-[#adaaad] text-sm">No long-term contracts. Cancel through your dashboard at any time.</p>
          </div>
          <div className="bg-[#1C1B1D] border border-white/5 rounded-2xl p-5 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-white font-bold mb-1">Service Until Period Ends</p>
            <p className="text-[#adaaad] text-sm">Your service remains fully active until the end of the billing period.</p>
          </div>
          <div className="bg-[#1C1B1D] border border-white/5 rounded-2xl p-5 text-center">
            <p className="text-3xl mb-2">⚡</p>
            <p className="text-white font-bold mb-1">Refunds in 7–10 Days</p>
            <p className="text-[#adaaad] text-sm">Eligible refunds are processed to the original payment method.</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pb-16">

        <Section title="1. Subscription Overview">
          <p>ClinicAssist AI operates on a monthly subscription model. Your subscription automatically renews each month until you cancel. By subscribing, you acknowledge and agree to the billing and cancellation terms outlined in this policy.</p>
          <p>Subscriptions are available through:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong className="text-white">Razorpay</strong> — for customers in India (INR billing)</li>
            <li><strong className="text-white">Stripe</strong> — for international customers (USD billing)</li>
          </ul>
        </Section>

        <Section title="2. How to Cancel Your Subscription">
          <p>You may cancel your subscription at any time using any of the following methods:</p>

          <div className="space-y-3 mt-4">
            <div className="bg-[#1C1B1D] border border-white/5 rounded-xl p-5">
              <p className="text-white font-semibold mb-2">Method 1 — Dashboard (Recommended)</p>
              <ol className="list-decimal list-inside space-y-1 text-[#c0bdc2] ml-2">
                <li>Log in to your ClinicAssist AI dashboard</li>
                <li>Navigate to <strong className="text-white">Billing</strong></li>
                <li>Click <strong className="text-white">"Cancel Subscription"</strong></li>
                <li>Confirm the cancellation</li>
              </ol>
            </div>
            <div className="bg-[#1C1B1D] border border-white/5 rounded-xl p-5">
              <p className="text-white font-semibold mb-2">Method 2 — Email</p>
              <p>Send a cancellation request to <a href="mailto:support@clinicassistai.online" className="text-[#a3a6ff] hover:underline">support@clinicassistai.online</a> from your registered email address. Include your clinic name and the reason for cancellation (optional).</p>
            </div>
            <div className="bg-[#1C1B1D] border border-white/5 rounded-xl p-5">
              <p className="text-white font-semibold mb-2">Method 3 — Stripe Customer Portal (International customers)</p>
              <p>International customers can manage their subscription directly through the Stripe Customer Portal, accessible from the Billing dashboard → "Manage Plan".</p>
            </div>
          </div>
        </Section>

        <Section title="3. What Happens After Cancellation">
          <InfoBox icon="✅" title="Your service remains active" color="green">
            <p>Once you cancel, your subscription will NOT immediately terminate. You retain full access to all features until the end of your current billing period.</p>
          </InfoBox>
          <div className="mt-4 space-y-3">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-[#a3a6ff]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#a3a6ff] text-xs font-bold">1</span>
              </div>
              <div>
                <p className="text-white font-medium">No further charges</p>
                <p className="text-[#adaaad] text-sm">Your payment method will not be charged again after cancellation.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-[#a3a6ff]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#a3a6ff] text-xs font-bold">2</span>
              </div>
              <div>
                <p className="text-white font-medium">Data retention — 30 days</p>
                <p className="text-[#adaaad] text-sm">Your clinic data is retained for 30 days after the subscription ends, after which it is permanently deleted.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-[#a3a6ff]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#a3a6ff] text-xs font-bold">3</span>
              </div>
              <div>
                <p className="text-white font-medium">Phone number released</p>
                <p className="text-[#adaaad] text-sm">Your dedicated virtual phone number will be released and may be reassigned to another user.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-[#a3a6ff]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#a3a6ff] text-xs font-bold">4</span>
              </div>
              <div>
                <p className="text-white font-medium">Re-subscription</p>
                <p className="text-[#adaaad] text-sm">You may re-subscribe at any time. A new billing cycle will begin from the re-subscription date.</p>
              </div>
            </div>
          </div>
        </Section>

        <Section title="4. Refund Policy">
          <InfoBox icon="⚠️" title="General Policy — Non-Refundable" color="orange">
            <p>Subscription fees are generally <strong>non-refundable</strong>. When you subscribe, you immediately gain access to the Service, and as such, we do not provide refunds for the current or past billing periods.</p>
          </InfoBox>

          <p className="mt-6 text-white font-semibold">Exceptions — Refunds ARE available in these situations:</p>
          <div className="space-y-4 mt-3">
            <div className="bg-[#1C1B1D] border border-emerald-500/20 rounded-xl p-5">
              <p className="text-emerald-400 font-semibold mb-2">✅ Extended Service Outage</p>
              <p>If the Service is completely unavailable for more than <strong className="text-white">72 consecutive hours</strong> due to an issue on our end (not due to planned maintenance or third-party infrastructure), you are eligible for a pro-rata credit or refund for the affected period.</p>
            </div>
            <div className="bg-[#1C1B1D] border border-emerald-500/20 rounded-xl p-5">
              <p className="text-emerald-400 font-semibold mb-2">✅ Duplicate or Erroneous Billing</p>
              <p>If you are charged more than once for the same billing period, or charged an incorrect amount due to a billing system error, the excess amount will be refunded in full within 7–10 business days.</p>
            </div>
            <div className="bg-[#1C1B1D] border border-emerald-500/20 rounded-xl p-5">
              <p className="text-emerald-400 font-semibold mb-2">✅ Unauthorized Charge</p>
              <p>If a charge is made without your authorization, contact us within <strong className="text-white">7 days</strong> of the charge. We will investigate and, if confirmed unauthorized, process a full refund.</p>
            </div>
            <div className="bg-[#1C1B1D] border border-emerald-500/20 rounded-xl p-5">
              <p className="text-emerald-400 font-semibold mb-2">✅ Service Not as Described</p>
              <p>If you are a new subscriber and the Service does not function as described at the time of purchase, contact us within <strong className="text-white">72 hours</strong> of first subscribing. We will review your case and may offer a full or partial refund at our discretion.</p>
            </div>
          </div>

          <p className="mt-6 text-white font-semibold">Refunds are NOT available for:</p>
          <div className="space-y-2 mt-3">
            {[
              "Change of mind after subscribing",
              "Partial use of the subscription period",
              "Forgetting to cancel before renewal",
              "Accounts that have used the 7-day free trial",
              "Prepaid wallet top-up amounts",
              "Overage charges that have already been consumed",
              "Accounts suspended for Terms of Service violations",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 bg-[#1C1B1D] border border-red-500/10 rounded-lg px-4 py-3">
                <span className="text-red-400 flex-shrink-0">✗</span>
                <p className="text-[#c0bdc2] text-sm">{item}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="5. Wallet Balance Policy">
          <p>The prepaid wallet is used for overage charges (extra minutes, SMS, phone numbers beyond plan limits).</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Wallet top-up amounts are <strong className="text-white">non-refundable</strong></li>
            <li>Wallet balance is <strong className="text-white">non-transferable</strong> between accounts</li>
            <li>Unused wallet balance is <strong className="text-white">forfeited</strong> upon account termination</li>
            <li>Auto-recharge transactions follow the same non-refundable policy</li>
          </ul>
        </Section>

        <Section title="6. How to Request a Refund">
          <p>To request a refund, send an email to <a href="mailto:support@clinicassistai.online" className="text-[#a3a6ff] hover:underline">support@clinicassistai.online</a> with the following information:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Your registered email address</li>
            <li>Your clinic name</li>
            <li>The transaction ID or invoice number</li>
            <li>The reason for your refund request</li>
            <li>Any supporting evidence (e.g., screenshots of the issue)</li>
          </ul>
          <p>We will acknowledge your request within <strong className="text-white">2 business days</strong> and complete our review within <strong className="text-white">5–7 business days</strong>.</p>
          <p>Approved refunds will be processed to the <strong className="text-white">original payment method</strong> within <strong className="text-white">7–10 business days</strong>. Processing times may vary depending on your bank or payment provider.</p>
        </Section>

        <Section title="7. Chargebacks">
          <p>We encourage you to contact us before initiating a chargeback with your bank or payment provider. Chargebacks can result in account suspension while the dispute is investigated.</p>
          <p>If you initiate a chargeback for a charge that was legitimate under this policy, we reserve the right to dispute the chargeback and provide evidence of service delivery.</p>
        </Section>

        <Section title="8. Contact Us">
          <p>For any questions about this Cancellation & Refund Policy, or to initiate a refund request, please contact us:</p>
          <div className="bg-[#1C1B1D] border border-white/5 rounded-xl p-6 mt-4">
            <p className="text-white font-semibold mb-1">ClinicAssistAI — Support Team</p>
            <p>1102, C4, Poonam Heights, Virar, Mumbai, Maharashtra - 401303</p>
            <p>India</p>
            <p className="mt-2">Email: <a href="mailto:support@clinicassistai.online" className="text-[#a3a6ff] hover:underline">support@clinicassistai.online</a></p>
            <p>Phone: +91 84217 83149</p>
            <p>Support hours: Monday – Friday, 9:00 AM – 6:00 PM IST</p>
          </div>
        </Section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#0F0F10]">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#adaaad] text-sm">© 2025 ClinicAssist AI. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-[#adaaad]">
            <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
