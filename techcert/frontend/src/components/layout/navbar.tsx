"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn, navigateToSection, sectionIdFromHashHref } from "@/lib/utils";

const navLinks = [
  { href: "/#features", label: "Stack" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (pathname !== "/") {
      setActiveSection(null);
      return;
    }

    const syncHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      setActiveSection(hash || null);
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  function handleSectionNav(href: string, closeMenu = false) {
    const sectionId = sectionIdFromHashHref(href);
    if (!sectionId) return;
    navigateToSection(sectionId);
    setActiveSection(sectionId);
    if (closeMenu) setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo size="sm" textClassName="text-lg sm:text-xl" priority />
        </Link>

        <div className="hidden items-center gap-4 md:flex lg:gap-6">
          {navLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => handleSectionNav(link.href)}
              className={cn(
                "cursor-pointer text-sm font-medium transition-colors hover:text-blue-600 dark:hover:text-blue-400",
                pathname === "/" && activeSection === sectionIdFromHashHref(link.href)
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-slate-400"
              )}
            >
              {link.label}
            </button>
          ))}
          <Link
            href="/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-600"
          >
            Agent Console
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
        <button
          className="cursor-pointer rounded-lg p-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        </div>
      </nav>

      <div
        className={cn(
          "overflow-hidden border-t transition-all duration-300 ease-out md:hidden",
          open ? "max-h-80 border-gray-200 opacity-100 dark:border-slate-800" : "max-h-0 border-transparent opacity-0"
        )}
      >
        <div className="space-y-1 bg-white px-4 py-3 dark:bg-slate-950">
          {navLinks.map((link, index) => (
            <button
              key={link.href}
              type="button"
              onClick={() => handleSectionNav(link.href, true)}
              className={cn(
                "block w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400",
                open && "motion-safe:animate-fade-in-down animate-fill-both",
                open && index === 0 && "animate-delay-100",
                open && index === 1 && "animate-delay-200",
                open && index === 2 && "animate-delay-300",
                open && index === 3 && "animate-delay-400"
              )}
            >
              {link.label}
            </button>
          ))}
          <Link
            href="/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg bg-amber-500 px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-amber-600"
            onClick={() => setOpen(false)}
          >
            Agent Console
          </Link>
        </div>
      </div>
    </header>
  );
}
