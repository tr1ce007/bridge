import { z } from "zod";
import {
  AGE_RANGES,
  STORY_CATEGORIES,
  SUBMISSION_LIMITS,
  localeSchema,
  type Locale,
} from "@/lib/data/types";

/** Form values as typed (all strings, so empty selects are ""). */
export interface SubmissionForm {
  lang: Locale;
  title: string;
  intro: string;
  before: string;
  challenges: string;
  actions: string;
  turningPoint: string;
  now: string;
  advice: string;
  category: string;
  ageRange: string;
  anonymous: boolean;
  displayName: string;
  consent: boolean;
}

export const EMPTY_SUBMISSION: SubmissionForm = {
  lang: "ru",
  title: "",
  intro: "",
  before: "",
  challenges: "",
  actions: "",
  turningPoint: "",
  now: "",
  advice: "",
  category: "",
  ageRange: "",
  anonymous: true,
  displayName: "",
  consent: false,
};

export type SubmissionField = keyof SubmissionForm;
export type FieldProblem = "required" | "tooShort" | "tooLong" | "invalid";
export type SubmissionErrors = Partial<Record<SubmissionField, FieldProblem>>;

const T = SUBMISSION_LIMITS;
const text = (min: number, max: number) => z.string().trim().min(min).max(max);

/**
 * The form's rules. It is the same shape the server checks (`storySubmissionSchema`), with the
 * fields the form requires (intro, category) and the consent switch made mandatory.
 */
const formSchema = z.object({
  lang: localeSchema,
  title: text(3, T.title),
  intro: text(1, T.intro),
  before: text(1, T.section),
  challenges: text(1, T.section),
  actions: text(1, T.section),
  turningPoint: text(1, T.section),
  now: text(1, T.section),
  advice: z.string().trim().max(T.advice),
  category: z.enum(STORY_CATEGORIES),
  ageRange: z.union([z.enum(AGE_RANGES), z.literal("")]),
  anonymous: z.boolean(),
  displayName: z.string().trim().max(T.displayName),
  consent: z.literal(true),
});

/** One problem code per field (the first), which the form turns into a localized message. */
export function validateSubmission(values: SubmissionForm): SubmissionErrors {
  const errors: SubmissionErrors = {};
  const result = formSchema.safeParse(values);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as SubmissionField | undefined;
      if (!field || errors[field]) continue;
      const empty = typeof values[field] === "string" ? (values[field] as string).trim() === "" : false;
      if (issue.code === "too_big") errors[field] = "tooLong";
      else if (issue.code === "too_small") errors[field] = empty || issue.minimum === 1 ? "required" : "tooShort";
      else errors[field] = field === "consent" || field === "category" || empty ? "required" : "invalid";
    }
  }
  if (!values.anonymous && !values.displayName.trim() && !errors.displayName) errors.displayName = "required";
  return errors;
}
