import { z } from "zod";
import { readJson, removeRaw, writeJson } from "@/lib/data/storage";

/**
 * "Register interest" in a future mentor programme. Until the database is connected this is kept
 * only in this browser (same storage layer as the rest of local data, so "Delete my data" wipes it).
 */
const KEY = "mentor-interest";

export const MENTEE_TOPICS = ["choosing-path", "study-abroad", "scholarships", "career-change", "language", "first-steps"] as const;
export type MenteeTopic = (typeof MENTEE_TOPICS)[number];

export const mentorInterestSchema = z.object({
  role: z.enum(["mentee", "mentor"]),
  /** Mentee: what they want to talk about. */
  topics: z.array(z.enum(MENTEE_TOPICS)).max(MENTEE_TOPICS.length),
  /** Mentor: the field they work in. */
  field: z.string().max(200),
  /** Mentor: a few words about their experience. */
  experience: z.string().max(600),
  note: z.string().max(600),
  /** Optional way to reach the person later (stays in this browser for now). */
  contact: z.string().max(200),
  createdAt: z.string(),
});
export type MentorInterest = z.infer<typeof mentorInterestSchema>;
export type MentorInterestForm = Omit<MentorInterest, "createdAt">;

export type MentorInterestErrors = Partial<Record<"topics" | "field" | "experience", "required">>;

export function validateMentorInterest(form: MentorInterestForm): MentorInterestErrors {
  const errors: MentorInterestErrors = {};
  if (form.role === "mentee") {
    if (form.topics.length === 0) errors.topics = "required";
  } else {
    if (!form.field.trim()) errors.field = "required";
    if (!form.experience.trim()) errors.experience = "required";
  }
  return errors;
}

export function loadMentorInterest(): MentorInterest | null {
  const parsed = mentorInterestSchema.safeParse(readJson(KEY));
  return parsed.success ? parsed.data : null;
}

export function saveMentorInterest(form: MentorInterestForm, now: Date = new Date()): MentorInterest {
  const value = mentorInterestSchema.parse({
    ...form,
    // only what belongs to the chosen role is kept
    topics: form.role === "mentee" ? form.topics : [],
    field: form.role === "mentor" ? form.field.trim() : "",
    experience: form.role === "mentor" ? form.experience.trim() : "",
    note: form.note.trim(),
    contact: form.contact.trim(),
    createdAt: now.toISOString(),
  });
  writeJson(KEY, value);
  return value;
}

export function clearMentorInterest(): void {
  removeRaw(KEY);
}
