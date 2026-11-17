export type ActionErrorCode = "invalid" | "forbidden" | "unauthenticated" | "unconfigured" | "not_found" | "duplicate" | "failed";

/** Result of an admin server action, shown by the form that called it. */
export type ActionState =
  | { status: "idle" }
  | { status: "ok"; message: string }
  | { status: "error"; code: ActionErrorCode; fields?: string[] };

export const IDLE: ActionState = { status: "idle" };
