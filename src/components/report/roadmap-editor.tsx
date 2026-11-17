"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Roadmap, RoadmapItem } from "@/lib/data";
import { cn } from "@/lib/cn";

type Horizon = keyof Roadmap;
const HORIZONS: Horizon[] = ["d7", "d30", "d90"];

let seq = 0;
const newItemId = () => `rm-${Date.now().toString(36)}-${(seq += 1).toString(36)}`;

function ItemRow({ item, onChange, onRemove }: { item: RoadmapItem; onChange: (i: RoadmapItem) => void; onRemove: () => void }) {
  const t = useTranslations("report");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);

  if (editing) {
    return (
      <li className="rounded-2xl border border-border p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const text = draft.trim();
            if (text) onChange({ ...item, text });
            setEditing(false);
          }}
        >
          <label className="sr-only" htmlFor={`edit-${item.id}`}>
            {t("editLabel")}
          </label>
          <textarea
            id={`edit-${item.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            maxLength={300}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-y rounded-xl border border-border bg-bg p-2 text-sm focus:outline-2 focus:outline-[var(--ring)]"
          />
          <div className="mt-2 flex gap-2">
            <button type="submit" className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-fg">
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(item.text);
                setEditing(false);
              }}
              className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="group flex items-start gap-3 rounded-2xl px-1 py-1.5">
      <input
        type="checkbox"
        checked={item.done}
        onChange={(e) => onChange({ ...item, done: e.target.checked })}
        aria-label={t("markDone", { text: item.text })}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-relaxed break-words", item.done && "text-muted line-through")}>{item.text}</p>
        <div className="-ml-2 flex gap-1 print:hidden">
          <button type="button" onClick={() => setEditing(true)} className="min-h-9 rounded-full px-2 text-xs font-semibold text-muted hover:text-fg">
            {t("edit")}
          </button>
          <button type="button" onClick={onRemove} className="min-h-9 rounded-full px-2 text-xs font-semibold text-muted hover:text-red-600">
            {t("remove")}
          </button>
        </div>
      </div>
    </li>
  );
}

function AddItem({ horizon, onAdd }: { horizon: Horizon; onAdd: (text: string) => void }) {
  const t = useTranslations("report");
  const [text, setText] = useState("");
  return (
    <form
      className="mt-3 flex gap-2 print:hidden"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAdd(text.trim());
        setText("");
      }}
    >
      <label className="sr-only" htmlFor={`add-${horizon}`}>
        {t("addItem")}
      </label>
      <input
        id={`add-${horizon}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={300}
        placeholder={t("addPlaceholder")}
        className="min-h-11 min-w-0 flex-1 rounded-full border border-border bg-bg px-4 text-sm focus:outline-2 focus:outline-[var(--ring)]"
      />
      <button type="submit" disabled={!text.trim()} className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-50">
        {t("add")}
      </button>
    </form>
  );
}

/** Editable 7 / 30 / 90-day plan: toggle done, edit, remove, add. Every change calls `onChange`. */
export function RoadmapEditor({ roadmap, onChange }: { roadmap: Roadmap; onChange: (r: Roadmap) => void }) {
  const t = useTranslations("report");
  const update = (h: Horizon, items: RoadmapItem[]) => onChange({ ...roadmap, [h]: items });
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {HORIZONS.map((h) => (
        <div key={h} className="rounded-3xl border border-border bg-card p-5 print:break-inside-avoid">
          <h3 className="font-display text-lg font-semibold">
            <span className="text-accent-text">{t(h)}</span>
          </h3>
          {roadmap[h].length ? (
            <ul className="mt-3 space-y-1">
              {roadmap[h].map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onChange={(next) => update(h, roadmap[h].map((x) => (x.id === item.id ? next : x)))}
                  onRemove={() => update(h, roadmap[h].filter((x) => x.id !== item.id))}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">{t("planEmpty")}</p>
          )}
          <AddItem horizon={h} onAdd={(text) => update(h, [...roadmap[h], { id: newItemId(), text, done: false }])} />
        </div>
      ))}
    </div>
  );
}
