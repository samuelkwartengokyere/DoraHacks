import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "destructive" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
        variant === "success" && "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
        variant === "destructive" && "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
        variant === "outline" && "border border-gray-300 text-gray-700 dark:border-slate-600 dark:text-slate-300",
        className
      )}
      {...props}
    />
  );
}
