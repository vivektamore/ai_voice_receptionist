import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | ClinicAssist AI",
  description: "Privacy Policy for ClinicAssist AI. Learn how we collect, use, disclose, and protect your personal information.",
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-xl font-bold text-white mb-4 pb-2 border-b border-white/10">{title}</h2>
    <div className="space-y-3 text-[#c0bdc2] leading-relaxed">{children}</div>
  </section>
);

export default function PrivacyPolicyPage() {
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
          <h1 className="text-4xl font-black text-white mb-4">Privacy Policy</h1>
          <p className="text-[#adaaad] text-lg">Last updated: {lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">

        <Section title="1. Introduction">
          <p>ClinicAssist AI ("Company", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered voice receptionist platform at <a href="https://clinicassistai.online" className="text-[#a3a6ff] hover:underline">clinicassistai.online</a>.</p>
          <p>By using the Service, you consent to the data practices described in this Policy. If you do not agree, please do not use the Service.</p>
          <p>This Policy complies with the Information Technology Act, 2000, the Information Technology (Amendment) Act, 2008, and applicable data protection regulations of India.</p>
        </Section>

        <Section title="2. Information We Collect">
          <p><strong className="text-white">A. Information you provide directly:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Account registration details (name, email address, clinic name)</li>
            <li>Billing information (processed securely by Razorpay or Dodo Payments — we do not store card details)</li>
            <li>Clinic configuration data (working hours, greeting messages, agent settings)</li>
            <li>Support requests and communications</li>
          </ul>
          <p className="mt-3"><strong className="text-white">B. Information collected automatically:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Log data (IP address, browser type, pages visited, timestamps)</li>
            <li>Device information (device type, operating system)</li>
            <li>Usage analytics (features used, dashboard interactions)</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
          <p className="mt-3"><strong className="text-white">C. Information from your clinic operations:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Voice call recordings and transcripts (for AI processing and quality assurance)</li>
            <li>Appointment booking data (patient name, phone number, appointment details)</li>
            <li>SMS communication logs</li>
            <li>Phone number usage and call metadata</li>
          </ul>
          <p className="mt-3"><strong className="text-white">D. Information from third parties:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Google OAuth authentication data (name, email) if you sign in with Google</li>
            <li>Payment transaction data from Razorpay or Dodo Payments</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use the collected information to:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Provide, operate, and maintain the Service</li>
            <li>Process subscriptions and payments</li>
            <li>Configure and operate your AI voice agent</li>
            <li>Send automated SMS notifications on your behalf to your patients</li>
            <li>Provide customer support and respond to inquiries</li>
            <li>Monitor and improve Service performance and reliability</li>
            <li>Send transactional emails (billing receipts, account alerts)</li>
            <li>Detect, investigate, and prevent fraudulent or unauthorized activity</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>We do <strong className="text-white">not</strong> sell, rent, or trade your personal information or your patients' information to third parties for marketing purposes.</p>
        </Section>

        <Section title="4. How We Share Your Information">
          <p>We may share your information with the following categories of parties:</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white py-2 pr-4 font-semibold">Party</th>
                  <th className="text-left text-white py-2 pr-4 font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Supabase", "Database hosting and authentication"],
                  ["LiveKit", "Real-time voice communication infrastructure"],
                  ["Groq / Sarvam AI", "AI speech recognition and language processing"],
                  ["Telnyx / Vobiz", "Phone number provisioning and SMS delivery"],
                  ["Razorpay", "Payment processing (India)"],
                  ["Dodo Payments", "Payment processing (International)"],
                  ["Google", "Authentication (if using Google Sign-In)"],
                ].map(([party, purpose]) => (
                  <tr key={party} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-[#a3a6ff] font-medium">{party}</td>
                    <td className="py-3 text-[#c0bdc2]">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4">We may also disclose your information when required by law, court order, or government authority, or to protect the rights, property, or safety of ClinicAssist AI, our users, or the public.</p>
        </Section>

        <Section title="5. Data Storage & Security">
          <p>Your data is stored on secure servers provided by Supabase (PostgreSQL database). We implement the following security measures:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Encryption in transit (TLS/SSL for all data transfers)</li>
            <li>Encryption at rest for sensitive data fields</li>
            <li>Row-level security (RLS) policies ensuring clinic data isolation</li>
            <li>Regular security audits and access controls</li>
            <li>Multi-factor authentication support for admin access</li>
          </ul>
          <p>While we implement strong security measures, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.</p>
        </Section>

        <Section title="6. Data Retention">
          <p>We retain your data for the following periods:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong className="text-white">Active accounts:</strong> Data is retained for the duration of your subscription</li>
            <li><strong className="text-white">After cancellation:</strong> Data is retained for 30 days, then permanently deleted</li>
            <li><strong className="text-white">Call recordings/transcripts:</strong> Retained for 90 days unless you request earlier deletion</li>
            <li><strong className="text-white">Billing records:</strong> Retained for 7 years as required by Indian tax regulations</li>
          </ul>
          <p>You may request early deletion of your data by contacting us at <a href="mailto:support@clinicassistai.online" className="text-[#a3a6ff] hover:underline">support@clinicassistai.online</a>.</p>
        </Section>

        <Section title="7. Cookies">
          <p>We use cookies and similar technologies to:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Maintain your authenticated session</li>
            <li>Remember your preferences</li>
            <li>Analyze Service usage patterns</li>
          </ul>
          <p>You can control cookie settings through your browser. Disabling essential cookies may affect Service functionality.</p>
        </Section>

        <Section title="8. Your Rights">
          <p>You have the following rights regarding your personal data:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong className="text-white">Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong className="text-white">Correction:</strong> Request correction of inaccurate or incomplete data</li>
            <li><strong className="text-white">Deletion:</strong> Request deletion of your personal data (subject to legal obligations)</li>
            <li><strong className="text-white">Portability:</strong> Request your data in a portable format</li>
            <li><strong className="text-white">Withdrawal of consent:</strong> Withdraw your consent to data processing at any time</li>
          </ul>
          <p>To exercise these rights, contact us at <a href="mailto:support@clinicassistai.online" className="text-[#a3a6ff] hover:underline">support@clinicassistai.online</a>. We will respond within 30 days.</p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>The Service is not directed at individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, contact us immediately and we will delete it.</p>
        </Section>

        <Section title="10. International Data Transfers">
          <p>Your data may be processed on servers located outside India (including US-based infrastructure providers). We ensure appropriate safeguards are in place for such transfers, including standard contractual clauses and data processing agreements with our service providers.</p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. The "Last updated" date at the top of this page reflects the most recent revision.</p>
          <p>Continued use of the Service after updates constitutes acceptance of the revised Policy.</p>
        </Section>

        <Section title="12. Contact Us">
          <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact our Privacy Officer:</p>
          <div className="bg-[#1C1B1D] border border-white/5 rounded-xl p-6 mt-4">
            <p className="text-white font-semibold mb-1">ClinicAssistAI — Privacy Officer</p>
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
            <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/cancellation" className="hover:text-white transition-colors">Cancellation Policy</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
