import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Container } from "./container";
import { Reveal } from "./reveal";

type Tone = "default" | "subtle" | "navy";

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title?: string;
  lead?: string;
  /** id of a heading rendered inside `children` (when not using `title`). */
  labelledBy?: string;
  children?: ReactNode;
  className?: string;
  /** Background rhythm: white (default), pale grey-blue, or the deep navy band. */
  tone?: Tone;
};

const tones: Record<Tone, string> = {
  default: "",
  subtle: "bg-subtle",
  // The band switches to the dark token set (data-theme), on the brand navy in both themes.
  navy: "bg-[var(--brand-navy)] text-fg",
};

/** Small uppercase label above a heading, with a short blue rule (the bridge's cable). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-accent-text", className)}>
      <span aria-hidden="true" className="h-px w-6 shrink-0 bg-accent" />
      {children}
    </p>
  );
}

/** Page section: optional eyebrow / title / lead header, then content. */
export function Section({ id, eyebrow, title, lead, labelledBy, children, className, tone = "default" }: SectionProps) {
  const headingId = id && title ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId ?? labelledBy}
      data-theme={tone === "navy" ? "dark" : undefined}
      className={cn("py-20 sm:py-28", tones[tone], className)}
    >
      <Container>
        {(eyebrow || title || lead) && (
          <Reveal className="max-w-3xl">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {title && (
              <h2
                id={headingId}
                className="font-display text-[2rem] leading-[1.1] font-bold tracking-[-0.03em] text-balance sm:text-5xl"
              >
                {title}
              </h2>
            )}
            {lead && <p className="mt-5 text-lg leading-relaxed text-muted text-pretty">{lead}</p>}
          </Reveal>
        )}
        {children && <div className={eyebrow || title || lead ? "mt-12 sm:mt-16" : undefined}>{children}</div>}
      </Container>
    </section>
  );
}
