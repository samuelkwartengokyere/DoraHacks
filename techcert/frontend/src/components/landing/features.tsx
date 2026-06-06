import { Bot, LineChart, Wallet, Zap, Globe, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedSection } from "@/components/ui/animated-section";

const features = [
  {
    icon: Globe,
    title: "CoinMarketCap Agent Hub",
    description: "Structured market signals, regime detection, and LLM-friendly insights — not raw JSON dumps.",
  },
  {
    icon: Wallet,
    title: "Trust Wallet Agent Kit",
    description: "Self-custody execution layer for swaps on BNB Smart Chain with configurable agent rules.",
  },
  {
    icon: Zap,
    title: "BNB Chain Testnet",
    description: "Low-fee EVM venue for paper and live agent trades during the hackathon build window.",
  },
  {
    icon: Bot,
    title: "Autonomous Agents (Track 1)",
    description: "End-to-end loop: CMC data → confidence-scored decision → TWAK execution.",
  },
  {
    icon: LineChart,
    title: "Strategy Skills (Track 2)",
    description: "Backtestable CMC skill pipelines with MA crossover validation on BNB hourly data.",
  },
  {
    icon: TrendingUp,
    title: "Agent Console",
    description: "Run agents, backtests, and trade logs from a private operator dashboard (direct URL only).",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-24 bg-white py-16 dark:bg-slate-950 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 sm:text-3xl lg:text-4xl">
            Hackathon Stack
          </h2>
          <p className="mt-3 text-base text-gray-600 dark:text-slate-400 sm:mt-4 sm:text-lg">
            Built for BNB Hack: AI Trading Agent Edition — CMC × Trust Wallet × BNB Chain
          </p>
        </AnimatedSection>
        <div className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {features.map((feature, index) => (
            <AnimatedSection key={feature.title} delay={(index % 3) * 100 as 0 | 100 | 200}>
              <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
                    <feature.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-slate-400">{feature.description}</p>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
