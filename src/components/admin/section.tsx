import type { ReactNode } from "react";

/** Heading + lead of one admin section. */
export function SectionHead({ title, lead, children }: { title: string; lead?: string; children?: ReactNode }) {
  return (
    <header className="mb-6 max-w-3xl">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      {lead && <p className="mt-2 leading-relaxed text-muted">{lead}</p>}
      {children}
    </header>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-border p-6 text-muted">{children}</p>;
}
