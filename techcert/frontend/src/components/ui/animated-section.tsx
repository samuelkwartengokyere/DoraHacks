"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type AnimationType = "fade-in" | "fade-in-up" | "fade-in-down" | "scale-in" | "slide-in-right";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: AnimationType;
  delay?: 0 | 100 | 200 | 300 | 400 | 500 | 600;
  as?: ElementType;
}

const animationClass: Record<AnimationType, string> = {
  "fade-in": "motion-safe:animate-fade-in",
  "fade-in-up": "motion-safe:animate-fade-in-up",
  "fade-in-down": "motion-safe:animate-fade-in-down",
  "scale-in": "motion-safe:animate-scale-in",
  "slide-in-right": "motion-safe:animate-slide-in-right",
};

const delayClass: Record<NonNullable<AnimatedSectionProps["delay"]>, string> = {
  0: "",
  100: "animate-delay-100",
  200: "animate-delay-200",
  300: "animate-delay-300",
  400: "animate-delay-400",
  500: "animate-delay-500",
  600: "animate-delay-600",
};

export function AnimatedSection({
  children,
  className,
  animation = "fade-in-up",
  delay = 0,
  as: Tag = "div",
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn(
        !visible && "motion-safe:opacity-0",
        visible && animationClass[animation],
        visible && delayClass[delay],
        visible && "animate-fill-both",
        visible && "opacity-100",
        className
      )}
    >
      {children}
    </Tag>
  );
}
