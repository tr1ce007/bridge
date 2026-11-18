import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/reveal";

/** Editorial section: big index numeral in a side rail (desktop), title and lead, then content. */
export function ReportSection({ id, index, title, lead, children }: { id: string; index: number; title: string; lead?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-border py-12 sm:py-16 print:break-inside-avoid-page print:py-6">
      <div className="grid gap-6 lg:grid-cols-[7rem_1fr] lg:gap-10">
        <Reveal>
          <p aria-hidden="true" className="font-display text-5xl leading-none font-bold tracking-[-0.04em] text-primary/25 sm:text-6xl dark:text-[var(--ring)]/40">
            {String(index).padStart(2, "0")}
          </p>
        </Reveal>
        <div className="min-w-0">
          <Reveal>
            <h2 id={`${id}-title`} className="font-display text-2xl leading-tight font-bold tracking-[-0.03em] text-balance sm:text-4xl">
              {title}
            </h2>
            {lead && <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted text-pretty sm:text-lg">{lead}</p>}
          </Reveal>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </section>
  );
}
