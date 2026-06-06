import { CheckCircle2 } from "lucide-react";
import { AnimatedSection } from "@/components/ui/animated-section";

const benefits = [
  "CoinMarketCap signals without parsing raw API JSON",
  "Trust Wallet Agent Kit for rule-based BSC execution",
  "Paper trading for demos before testnet goes live",
  "Track 1 autonomous agent loop out of the box",
  "Track 2 backtestable CMC strategy skills",
  "Full trade log with signal reasoning",
  "Built for BNB Hack: AI Trading Agent Edition",
  "BNB Smart Chain testnet ready",
];

export function BenefitsSection() {
  return (
    <section className="bg-amber-600 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <AnimatedSection animation="fade-in">
            <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
              Why SignalForge AI
            </h2>
            <p className="mt-3 text-base text-amber-100 sm:mt-4 sm:text-lg">
              A focused hackathon stack — read the market with CMC, decide with confidence scoring,
              and execute on BNB Chain through TWAK.
            </p>
          </AnimatedSection>
          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {benefits.map((benefit, index) => (
              <AnimatedSection key={benefit} delay={(index % 2) * 100 as 0 | 100} animation="fade-in-up">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-200" />
                  <span className="text-sm text-white">{benefit}</span>
                </li>
              </AnimatedSection>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
