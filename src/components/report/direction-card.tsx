"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import type { DiscoveryReport } from "@/lib/data";

type Direction = DiscoveryReport["directions"][number];

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{title}</h4>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One direction: name and why up front; the rest (answers, difficulties, skills, tests, reality check) expands. */
export function DirectionCard({ direction, index }: { direction: Direction; index: number }) {
  const t = useTranslations("report");
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <article className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)] sm:p-7 print:break-inside-avoid">
      <div className="flex items-baseline gap-3">
        <span aria-hidden="true" className="font-display text-sm font-semibold text-accent-text">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="font-display text-xl font-semibold leading-snug tracking-tight text-balance">{direction.name}</h3>
      </div>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-pretty">{direction.why}</p>
      {direction.howToTest[0] && (
        <p className="mt-4 rounded-2xl bg-subtle px-4 py-3 text-sm leading-relaxed">
          <span className="font-semibold">{t("howToTest")}: </span>
          {direction.howToTest[0]}
        </p>
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <List title={t("supportingAnswers")} items={direction.supportingAnswers} />
              <List title={t("difficulties")} items={direction.difficulties} />
              <List title={t("skills")} items={direction.skills} />
              <List title={t("howToTest")} items={direction.howToTest.slice(1)} />
            </div>
            <div className="mt-6 rounded-2xl border border-border p-4 sm:p-5">
              <h4 className="font-display text-base font-semibold">{t("realityCheck")}</h4>
              <div className="mt-4 grid gap-5 sm:grid-cols-3">
                <List title={t("activities")} items={direction.realityCheck.activities} />
                <List title={t("misconceptions")} items={direction.realityCheck.misconceptions} />
                <List title={t("entryRoutes")} items={direction.realityCheck.entryRoutes} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-auto pt-5 print:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline dark:text-[var(--ring)]"
        >
          {open ? t("showLess") : t("showMore")}
          <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
            ↓
          </span>
        </button>
      </div>
    </article>
  );
}
