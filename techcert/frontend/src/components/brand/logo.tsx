import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZE_PX = {
  xs: 20,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 64,
} as const;

type LogoSize = keyof typeof SIZE_PX;

interface LogoMarkProps {
  size?: LogoSize | number;
  className?: string;
  priority?: boolean;
}

export function LogoMark({ size = "sm", className, priority }: LogoMarkProps) {
  const px = typeof size === "number" ? size : SIZE_PX[size];

  return (
    <Image
      src="/signalforge-logo.png"
      alt=""
      width={px}
      height={px}
      priority={priority}
      className={cn("shrink-0 rounded-lg", className)}
      aria-hidden
    />
  );
}

interface LogoProps {
  size?: LogoSize;
  showText?: boolean;
  className?: string;
  textClassName?: string;
  priority?: boolean;
}

export function Logo({
  size = "sm",
  showText = true,
  className,
  textClassName,
  priority,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} priority={priority} />
      {showText ? (
        <span className={cn("font-bold text-gray-900 dark:text-slate-100", textClassName)}>
          SignalForge AI
        </span>
      ) : null}
    </span>
  );
}
