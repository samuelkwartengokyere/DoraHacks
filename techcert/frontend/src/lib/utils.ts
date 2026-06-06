import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function truncateHash(hash: string, start = 8, end = 6) {
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

/** Smooth-scroll to a section id on the home page (Next.js Link hash URLs often don't scroll). */
export function scrollToSection(sectionId: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(sectionId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `#${sectionId}`);
}

export function navigateToSection(sectionId: string) {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/") {
    scrollToSection(sectionId);
  } else {
    window.location.assign(`/#${sectionId}`);
  }
}

export function sectionIdFromHashHref(href: string) {
  const hash = href.includes("#") ? href.split("#")[1] : href.replace(/^\//, "");
  return hash || "";
}
