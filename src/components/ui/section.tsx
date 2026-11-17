import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Container } from "./container";
import { Reveal } from "./reveal";

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title?: string;
  lead?: string;
  /** id of a heading rendered inside `children` (when not using `title`). */
  labelledBy?: string;
  children?: ReactNode;
  className?: string;
};

/** Page section: optional eyebrow / title / lead header, then content. */
export function Section({ id, eyebrow, title, lead, labelledBy, children, className }: SectionProps) {
  const headingId = id && title ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId ?? labelledBy} className={cn("py-20 sm:py-28", className)}>
      <Container>
        {(eyebrow || title || lead) && (
          <Reveal className="max-w-3xl">
            {eyebrow && (
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">{eyebrow}</p>
            )}
            {title && (
              <h2
                id={headingId}
                className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-5xl"
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
