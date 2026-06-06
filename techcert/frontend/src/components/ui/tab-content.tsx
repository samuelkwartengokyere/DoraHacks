"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TabContentProps {
  children: ReactNode;
  className?: string;
  tabKey: string;
}

export function TabContent({ children, className, tabKey }: TabContentProps) {
  return (
    <div
      key={tabKey}
      className={cn("motion-safe:animate-fade-in-up animate-fill-both", className)}
    >
      {children}
    </div>
  );
}
