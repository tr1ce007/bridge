import type { ReactNode } from "react";
import { Container } from "./container";
import { Eyebrow } from "./section";

/** Page title block: eyebrow, h1, optional lead and extra content. Server-component friendly. */
export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <header className="relative isolate overflow-hidden pt-12 pb-10 sm:pt-20 sm:pb-14">
      {/* The same drawing board as the landing, quieter; a thin span closes the header. */}
      <div aria-hidden="true" className="blueprint absolute inset-0 -z-10 opacity-70" />
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
        fill="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-8 w-full text-primary"
      >
        <path d="M0 39 Q600 -12 1200 39" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <Container>
        <div className="max-w-3xl">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="font-display text-[2.25rem] leading-[1.06] font-bold tracking-[-0.035em] text-balance sm:text-6xl">{title}</h1>
          {lead && <p className="mt-5 text-lg leading-relaxed text-muted text-pretty">{lead}</p>}
          {children}
        </div>
      </Container>
    </header>
  );
}
