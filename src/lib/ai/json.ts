import type { z } from "zod";
import { AIError } from "./types";

/** Parse model text as JSON and validate it; throws AIError("invalid_json" | "schema"). */
export function parseJSON<T>(schema: z.ZodType<T>, text: string): T {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new AIError("invalid_json", "model output is not valid JSON");
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AIError("schema", `model output does not match the schema: ${parsed.error.issues.slice(0, 3).map((i) => i.path.join(".")).join(", ")}`);
  return parsed.data;
}
