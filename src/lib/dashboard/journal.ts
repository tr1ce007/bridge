import { JOURNAL_FIELDS, type JournalEntry, type JournalField } from "@/lib/data/types";

/** Filled prompts of an entry in a fixed order (empty and whitespace-only ones are dropped). */
export function journalFilledFields(entry: JournalEntry): { field: JournalField; value: string }[] {
  return JOURNAL_FIELDS.flatMap((field) => {
    const value = entry[field]?.trim();
    return value ? [{ field, value }] : [];
  });
}

/** True when the entry has no text at all (nothing worth saving). */
export function journalIsEmpty(entry: Pick<JournalEntry, "text" | JournalField>): boolean {
  return !entry.text.trim() && JOURNAL_FIELDS.every((f) => !entry[f]?.trim());
}

/** First line of an entry for lists and the timeline, cut at `max` characters. */
export function journalPreview(entry: JournalEntry, max = 140): string {
  const first = journalFilledFields(entry)[0]?.value ?? entry.text.trim();
  return first.length > max ? `${first.slice(0, max).trimEnd()}…` : first;
}
