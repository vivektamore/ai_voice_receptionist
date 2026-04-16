"use client";

import dynamic from 'next/dynamic';
import LandingNavbar from "./components/LandingNavbar";
import Hero from "./components/Hero";

// Lazy loading heavy interaction components below the fold
const LiveDemo = dynamic(() => import('./components/LiveDemo'), {
  loading: () => <div className="h-[400px] w-full flex items-center justify-center text-[#adaaad] animate-pulse">Loading Simulator...</div>,
  ssr: false // Client-side hydration for simulations
});

const Features = dynamic(() => import('./components/Features'));
const HowItWorks = dynamic(() => import('./components/HowItWorks'));
const DashboardPreview = dynamic(() => import('./components/DashboardPreview'));
const Pricing = dynamic(() => import('./components/Pricing'));
const Testimonials = dynamic(() => import('./components/Testimonials'));
const LandingFooter = dynamic(() => import('./components/LandingFooter'));

export default function Home() {
  return (
    <main className="min-h-screen bg-[#09090B] font-['Inter'] selection:bg-[#a3a6ff]/30 selection:text-[#f9f5f8] overflow-hidden">
      <LandingNavbar />
      <Hero />
      <Features />
      <LiveDemo />
      <HowItWorks />
      <DashboardPreview />
      <Testimonials />
      <Pricing />
      <LandingFooter />
    </main>
  );
}
