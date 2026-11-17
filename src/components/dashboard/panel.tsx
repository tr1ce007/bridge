import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/** A titled card of the dashboard, with an optional "see all" link. */
export function Panel({
  id,
  title,
  lead,
  linkHref,
  linkLabel,
  className,
  children,
}: {
  id?: string;
  title: string;
  lead?: string;
  linkHref?: string;
  linkLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const titleId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={titleId} className={cn("scroll-mt-24 rounded-3xl border border-border bg-card p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={titleId} className="font-display text-lg font-semibold tracking-tight sm:text-xl">
          {title}
        </h2>
        {linkHref && linkLabel && (
          <Link href={linkHref} className="inline-flex min-h-9 items-center text-sm font-semibold text-primary hover:underline dark:text-[var(--ring)]">
            {linkLabel}
          </Link>
        )}
      </div>
      {lead && <p className="mt-1 text-sm leading-relaxed text-muted">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Calm empty state: one sentence and, if useful, one link. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-border p-4 text-sm leading-relaxed text-muted">{children}</p>;
}
