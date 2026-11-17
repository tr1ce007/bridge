import type { ReactNode } from "react";
import { Container } from "./container";

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
    <header className="pt-12 pb-8 sm:pt-20 sm:pb-10">
      <Container>
        <div className="max-w-3xl">
          {eyebrow && <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">{eyebrow}</p>}
          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-6xl">{title}</h1>
          {lead && <p className="mt-5 text-lg leading-relaxed text-muted text-pretty">{lead}</p>}
          {children}
        </div>
      </Container>
    </header>
  );
}
