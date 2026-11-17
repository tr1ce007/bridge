import { describe, expect, it } from "vitest";
import { journalDraft } from "@/lib/dashboard/journal";
import type { JournalEntry } from "@/lib/data/types";

const base: JournalEntry = { id: "j", text: "", createdAt: "2026-11-01T00:00:00.000Z" };

describe("journalDraft", () => {
  it("puts the text of an old entry (only `text`) into the first field", () => {
    const d = journalDraft({ ...base, text: "Старая запись" });
    expect(d.draft).toEqual({ tried: "Старая запись", learned: "", surprised: "", disliked: "", next: "" });
    expect(d.movedText).toBe(true);
  });

  it("leaves new entries as they are", () => {
    const d = journalDraft({ ...base, learned: "Узнал", next: "Дальше" });
    expect(d.draft).toEqual({ tried: "", learned: "Узнал", surprised: "", disliked: "", next: "Дальше" });
    expect(d.movedText).toBe(false);
  });

  it("does not move the text when a field is already filled, or when there is no text", () => {
    expect(journalDraft({ ...base, text: "x", tried: "y" }).movedText).toBe(false);
    expect(journalDraft({ ...base, text: "  " }).movedText).toBe(false);
    expect(journalDraft(base).draft.tried).toBe("");
  });
});
