import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "primary" | "accent" | "warning";

const tones: Record<Tone, string> = {
  neutral: "border-border text-muted",
  primary: "border-primary/30 text-primary dark:text-[var(--ring)]",
  accent: "border-accent/40 text-accent",
  warning: "border-amber-600/40 text-amber-700 dark:text-amber-400",
};

/** Small outlined label, e.g. story kind or "source being verified". */
export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
