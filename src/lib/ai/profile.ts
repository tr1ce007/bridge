import type { Answer, Locale } from "@/lib/data/types";
import { OTHER_PREFIX, getQuestion } from "@/lib/questionnaire/bank";
import { followUpSource, isFollowUpId } from "@/lib/questionnaire/engine";
import { answersToTags } from "@/lib/matching/answer-tags";
import { AXES } from "@/lib/data/types";
import { isKnownValue, optionLabel, questionTitle, scaleEnds } from "@/lib/report/answer-labels";
import { wrapAsData } from "./sanitize";

/**
 * Plain-text profile of the questionnaire for the model. Option labels come from our own
 * messages; everything the person typed (text answers, "other:" entries, follow-ups) is wrapped
 * with `wrapAsData`, so it is always content, never instructions.
 */
export function buildProfileSummary(answers: Answer[], locale: Locale): string {
  const lines: string[] = ["Questionnaire answers (question id, question, answer):"];
  for (const a of answers) {
    if (a.skipped) continue;
    if (isFollowUpId(a.questionId)) {
      const [question = "", reply = ""] = Array.isArray(a.value) ? a.value : [a.value];
      const src = followUpSource(a.questionId);
      // Only `fu:<known bank id>`; the id itself is printed raw, so it must be one of ours.
      if (!reply.trim() || !getQuestion(src)) continue;
      lines.push(
        `- [${a.questionId}] follow-up to ${src}: ${wrapAsData(`followup-question:${src}`, question)} → ${wrapAsData(`answer:${a.questionId}`, reply)}`,
      );
      continue;
    }
    const q = getQuestion(a.questionId);
    if (!q) continue;
    const title = questionTitle(locale, q.id);
    if (q.type === "text") {
      const text = typeof a.value === "string" ? a.value.trim() : "";
      if (text) lines.push(`- [${q.id}] ${title}: ${wrapAsData(`answer:${q.id}`, text)}`);
      continue;
    }
    // Unknown option keys / out-of-range scale values are dropped: only bank-defined labels are
    // printed raw; free text ("other:") is wrapped as data below.
    const values = (Array.isArray(a.value) ? a.value : [a.value]).filter((v) => v !== "" && isKnownValue(q.id, v));
    if (!values.length) continue;
    const shown = values.map((v) =>
      v.startsWith(OTHER_PREFIX) ? wrapAsData(`answer:${q.id}:other`, v.slice(OTHER_PREFIX.length).trim()) : optionLabel(locale, q.id, v),
    );
    const ends = q.type === "scale" ? scaleEnds(locale, q.id) : null;
    lines.push(`- [${q.id}] ${title}: ${shown.join(", ")}${ends ? ` (${ends})` : ""}`);
  }
  const tags = answersToTags(answers);
  const tagLines = AXES.filter((axis) => tags[axis].length).map((axis) => `${axis}: ${tags[axis].join(", ")}`);
  lines.push("", `Tags (derived from the answers by rules): ${tagLines.length ? tagLines.join("; ") : "none"}`);
  return lines.join("\n");
}
