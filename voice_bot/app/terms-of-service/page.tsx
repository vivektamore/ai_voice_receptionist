import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | ClinicAssist AI",
  description: "Terms of Service for ClinicAssist AI — AI-powered voice receptionist for clinics. Read our terms, refund, and cancellation policies.",
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-xl font-bold text-white mb-4 pb-2 border-b border-white/10">{title}</h2>
    <div className="space-y-3 text-[#c0bdc2] leading-relaxed">{children}</div>
  </section>
);

export default function TermsOfServicePage() {
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
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/cancellation" className="hover:text-white transition-colors">Cancellation Policy</Link>
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
          <h1 className="text-4xl font-black text-white mb-4">Terms of Service</h1>
          <p className="text-[#adaaad] text-lg">Last updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">

        <Section title="1. Acceptance of Terms">
          <p>By accessing or using ClinicAssist AI ("Service", "Platform"), operated by <strong className="text-white">ClinicAssist AI</strong> ("Company", "we", "us", or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.</p>
          <p>These Terms apply to all users, including clinic administrators, staff members, and any third party who accesses the Service.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>ClinicAssist AI provides an AI-powered voice receptionist platform designed for healthcare clinics. The platform includes:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>AI voice agent for handling patient calls and appointment booking</li>
            <li>Automated SMS notifications and reminders</li>
            <li>Dashboard for clinic management, analytics, and billing</li>
            <li>Integration with LiveKit for real-time voice communication</li>
            <li>Dedicated virtual phone number provisioning</li>
          </ul>
          <p>The Service is provided on a subscription basis with monthly billing cycles.</p>
        </Section>

        <Section title="3. Account Registration">
          <p>To use the Service, you must register for an account and provide accurate, complete, and current information. You are responsible for:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized use of your account</li>
            <li>Ensuring your registration information remains accurate and up to date</li>
          </ul>
          <p>One account is permitted per clinic. You may not create multiple accounts for the same clinic entity.</p>
        </Section>

        <Section title="4. Subscription Plans & Pricing">
          <p>ClinicAssist AI offers a monthly subscription plan ("Growth Plan") with the following inclusions:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>500 AI voice minutes per month</li>
            <li>500 automated SMS messages per month</li>
            <li>1 dedicated virtual phone number</li>
            <li>Full dashboard access and analytics</li>
          </ul>
          <p>Pricing is displayed in the billing dashboard and is subject to change with 30 days' prior notice.</p>
          <p>Overage charges apply for usage beyond plan limits:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Additional minutes: Billed at the overage rate specified in your dashboard</li>
            <li>Additional SMS: Billed at the overage rate specified in your dashboard</li>
            <li>Additional phone numbers: Billed monthly per extra number</li>
          </ul>
          <p>Overage charges are deducted from your prepaid wallet balance. Auto-recharge applies when the balance falls below the threshold.</p>
        </Section>

        <Section title="5. Payment Terms">
          <p>Subscriptions are billed on a monthly recurring basis. Payment is processed through:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong className="text-white">Razorpay</strong> — for customers in India (INR billing)</li>
            <li><strong className="text-white">Dodo Payments</strong> — for international customers (USD billing)</li>
          </ul>
          <p>By subscribing, you authorize us to charge your payment method on a recurring monthly basis until you cancel. All payments are non-refundable except as explicitly stated in Section 7 (Refund Policy).</p>
          <p>If a payment fails, your subscription will enter a grace period. If payment is not received within 7 days, your account may be suspended.</p>
        </Section>

        <Section title="6. Cancellation Policy">
          <p>You may cancel your subscription at any time through the billing dashboard or by contacting our support team. Cancellations take effect at the end of the current billing period.</p>
          <p><strong className="text-white">How to cancel:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Log in to your dashboard → Billing → Cancel Subscription</li>
            <li>Or email us at <a href="mailto:support@clinicassistai.online" className="text-[#a3a6ff] hover:underline">support@clinicassistai.online</a></li>
          </ul>
          <p>Upon cancellation:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Your service remains active until the end of the paid billing period</li>
            <li>No further charges will be made after cancellation takes effect</li>
            <li>Your data will be retained for 30 days after cancellation, after which it will be permanently deleted</li>
            <li>Your virtual phone number will be released and may be assigned to another user</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms, with or without notice.</p>
        </Section>

        <Section title="7. Refund Policy">
          <p>All subscription fees are <strong className="text-white">non-refundable</strong>, except in the following circumstances:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong className="text-white">Technical inability to use the Service:</strong> If the Service is completely unavailable for more than 72 consecutive hours due to issues on our end, you may be eligible for a pro-rata credit or refund for the affected period.</li>
            <li><strong className="text-white">Duplicate billing:</strong> If you are charged more than once for the same billing period due to a billing system error, the duplicate charge will be refunded in full.</li>
            <li><strong className="text-white">Unauthorized charge:</strong> If you believe a charge was made without your authorization, contact us within 7 days of the charge for investigation.</li>
          </ul>
          <p><strong className="text-white">Wallet balance:</strong> Prepaid wallet top-up amounts are non-refundable and non-transferable. Unused wallet balance is forfeited upon account termination.</p>
          <p><strong className="text-white">Trial period:</strong> Accounts that have used a free trial are not eligible for refunds on their first paid subscription period.</p>
          <p>To request a refund, contact us at <a href="mailto:support@clinicassistai.online" className="text-[#a3a6ff] hover:underline">support@clinicassistai.online</a> with your account details and the reason for the refund request. Refund requests are reviewed within 5–7 business days.</p>
          <p>Approved refunds will be processed to the original payment method within 7–10 business days.</p>
        </Section>

        <Section title="8. Acceptable Use">
          <p>You agree not to use the Service to:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Violate any applicable laws or regulations</li>
            <li>Transmit spam, unsolicited messages, or harassing communications</li>
            <li>Impersonate any person or entity</li>
            <li>Collect personal data of patients without their consent</li>
            <li>Interfere with or disrupt the Service infrastructure</li>
            <li>Use the Service for any purpose other than legitimate clinical operations</li>
          </ul>
        </Section>

        <Section title="9. Healthcare Compliance">
          <p>ClinicAssist AI is a technology platform and is <strong className="text-white">not a healthcare provider</strong>. The Service assists with administrative functions (call handling, appointment booking) only. You are solely responsible for:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Compliance with applicable healthcare regulations in your jurisdiction</li>
            <li>Patient data privacy and confidentiality</li>
            <li>Clinical decisions and medical advice (the AI does not provide medical advice)</li>
            <li>Obtaining patient consent for AI-assisted call handling</li>
          </ul>
        </Section>

        <Section title="10. Intellectual Property">
          <p>The Service, including all software, content, branding, and technology, is owned by ClinicAssist AI and protected by applicable intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to use the Service for your internal clinic operations during the subscription period.</p>
        </Section>

        <Section title="11. Limitation of Liability">
          <p>To the maximum extent permitted by applicable law, ClinicAssist AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of the Service.</p>
          <p>Our total liability for any claim arising from the Service shall not exceed the amount you paid us in the 3 months preceding the claim.</p>
        </Section>

        <Section title="12. Governing Law & Dispute Resolution">
          <p>These Terms are governed by the laws of India. Any disputes arising from these Terms or the Service shall be subject to the exclusive jurisdiction of the courts located in India.</p>
          <p>Before initiating legal proceedings, you agree to attempt to resolve disputes informally by contacting us at <a href="mailto:support@clinicassistai.online" className="text-[#a3a6ff] hover:underline">support@clinicassistai.online</a>.</p>
        </Section>

        <Section title="13. Changes to Terms">
          <p>We reserve the right to modify these Terms at any time. We will notify you of significant changes via email or in-app notification. Your continued use of the Service after changes take effect constitutes acceptance of the revised Terms.</p>
        </Section>

        <Section title="14. Contact Us">
          <p>If you have questions about these Terms, please contact us:</p>
          <div className="bg-[#1C1B1D] border border-white/5 rounded-xl p-6 mt-4">
            <p className="text-white font-semibold mb-1">ClinicAssistAI</p>
            <p>1102, C4, Poonam Heights, Virar, Mumbai, Maharashtra - 401303</p>
            <p>India</p>
            <p className="mt-2">Email: <a href="mailto:support@clinicassistai.online" className="text-[#a3a6ff] hover:underline">support@clinicassistai.online</a></p>
            <p>Phone: +91 84217 83149</p>
            <p>Website: <a href="https://clinicassistai.online" className="text-[#a3a6ff] hover:underline">clinicassistai.online</a></p>
          </div>
        </Section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#0F0F10]">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#adaaad] text-sm">© 2025 ClinicAssist AI. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-[#adaaad]">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/cancellation" className="hover:text-white transition-colors">Cancellation Policy</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
