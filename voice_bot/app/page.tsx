import Hero from "./components/Hero";
import Features from "./components/Features";
import Demo from "./components/Demo";
import Testimonials from "./components/Testimonials";
import FAQ from "./components/FAQ";
import Pricing from "./components/Pricing";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <Demo />
      <Pricing />
      <Testimonials />
      <FAQ />
      <Footer />
    </main>
  );
}
