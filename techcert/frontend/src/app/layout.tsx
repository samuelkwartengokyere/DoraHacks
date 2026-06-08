import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaInstallProvider } from "@/components/pwa/pwa-install-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeScript } from "@/components/theme/theme-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SignalForge AI — BNB Hack Trading Agent",
  description:
    "Autonomous AI trading agent for BNB Hack: AI Trading Agent Edition. CMC Agent Hub + Trust Wallet Agent Kit + BNB Chain.",
  icons: {
    icon: "/signalforge-logo.png",
    apple: "/signalforge-logo.png",
  },
  appleWebApp: {
    capable: true,
    title: "SignalForge AI",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-white text-gray-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>
          <PwaInstallProvider>{children}</PwaInstallProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
