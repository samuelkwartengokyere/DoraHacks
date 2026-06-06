import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/landing/hero";
import { FeaturesSection } from "@/components/landing/features";
import { BenefitsSection } from "@/components/landing/benefits";
import { HowItWorksSection } from "@/components/landing/how-it-works";
import { FAQSection } from "@/components/landing/faq";
import { ContactSection } from "@/components/landing/contact";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <BenefitsSection />
        <HowItWorksSection />
        <FAQSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
