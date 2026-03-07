import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Dental Receptionist | Never Miss a Patient",
  description: "Futuristic AI Voice Receptionist for Dental Clinics. 24/7 Booking, smart routing, and seamless integrations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${inter.variable} ${outfit.variable} antialiased bg-background text-foreground selection:bg-primary/30`}
      >
        <div className="relative min-h-screen overflow-hidden">
          {/* Global Background Glow effects */}
          <div className="pointer-events-none fixed inset-0 z-[-1]">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[120px]" />
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
