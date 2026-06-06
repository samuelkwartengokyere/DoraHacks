import Link from "next/link";
import { Mail, Code2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 text-center sm:grid-cols-2 sm:text-left md:grid-cols-4">
          <div className="sm:col-span-2">
            <div className="flex justify-center sm:justify-start">
              <Logo size="sm" />
            </div>
            <p className="mx-auto mt-4 max-w-md text-sm text-gray-600 dark:text-slate-400 sm:mx-0">
              Autonomous trading agents for BNB Hack — CoinMarketCap Agent Hub, Trust Wallet Agent Kit,
              and BNB Smart Chain.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-slate-100">Platform</h4>
            <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-slate-400">
              <li><Link href="/#features" className="hover:text-amber-600 dark:hover:text-amber-400">Hackathon Stack</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-amber-600 dark:hover:text-amber-400">How It Works</Link></li>
              <li><Link href="/#faq" className="hover:text-amber-600 dark:hover:text-amber-400">FAQ</Link></li>
              <li><Link href="/admin" target="_blank" rel="noopener noreferrer" className="hover:text-amber-600 dark:hover:text-amber-400">Agent Console</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-slate-100">Hackathon</h4>
            <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-slate-400">
              <li>
                <a
                  href="https://dorahacks.io/hackathon/bnbhack-twt-cmc/detail"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-600 dark:hover:text-amber-400"
                >
                  DoraHacks — BNB Hack
                </a>
              </li>
              <li className="flex items-center justify-center gap-2 sm:justify-start">
                <Mail className="h-4 w-4" />
                <a href="mailto:contact@signalforge.ai" className="hover:text-amber-600 dark:hover:text-amber-400">
                  contact@signalforge.ai
                </a>
              </li>
              <li className="flex items-center justify-center gap-2 sm:justify-start">
                <Code2 className="h-4 w-4" />
                <span>BNB Chain · Chain ID 97</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-500 dark:border-slate-800 dark:text-slate-500">
          &copy; {new Date().getFullYear()} SignalForge AI. Built for BNB Hack on BNB Chain.
        </div>
      </div>
    </footer>
  );
}
