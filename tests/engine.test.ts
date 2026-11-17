import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ru from "../messages/ru.json";
import kk from "../messages/kk.json";
import en from "../messages/en.json";
import { BLOCKS, QUESTION_BANK, REQUIRED_BLOCKS, type Question } from "@/lib/questionnaire/bank";
import {
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  applyAnswer,
  canGenerateReport,
  followUpId,
  isFollowUpId,
  nextQuestion,
  normalizeAnswers,
  previousQuestion,
  progress,
  skipAnswer,
  visibleQuestions,
} from "@/lib/questionnaire/engine";
import { createSession, restoreSession, resumeQuestionId, withAnswers } from "@/lib/questionnaire/session";
import { createLocalUserStore } from "@/lib/data/local-store";
import { resetStorageState } from "@/lib/data/storage";
import type { Answer } from "@/lib/data/types";

/** A deterministic, valid answer for a question; `pick` chooses between option indexes. */
function answerFor(q: Question, pick = 0): Answer {
  switch (q.type) {
    case "single":
      return { questionId: q.id, value: q.options![pick % q.options!.length] };
    case "multi": {
      const opts = q.options!.filter((o) => !q.exclusive?.includes(o));
      const n = Math.min(q.maxSelect ?? 2, opts.length, 2);
      return { questionId: q.id, value: Array.from({ length: n }, (_, i) => opts[(pick + i) % opts.length]) };
    }
    case "scale":
      return { questionId: q.id, value: String((pick % 5) + 1) };
    case "text":
      return { questionId: q.id, value: "something" };
  }
}

/** Walks the whole questionnaire using `choose` to pick an answer, returns the path. */
function walk(choose: (q: Question, step: number) => Answer | "skip"): Answer[] {
  let answers: Answer[] = [];
  for (let step = 0; step < 100; step++) {
    const q = nextQuestion(answers);
    if (!q) return answers;
    const c = choose(q, step);
    answers = applyAnswer(answers, c === "skip" ? skipAnswer(q) : c);
  }
  throw new Error("questionnaire did not terminate");
}

describe("question bank", () => {
  it("has about 34 questions with unique ids across blocks A-G", () => {
    expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(32);
    expect(QUESTION_BANK.length).toBeLessThanOrEqual(38);
    expect(new Set(QUESTION_BANK.map((q) => q.id)).size).toBe(QUESTION_BANK.length);
    for (const block of BLOCKS) expect(QUESTION_BANK.some((q) => q.block === block)).toBe(true);
  });

  it("keeps blocks contiguous and in A-G order", () => {
    const order = QUESTION_BANK.map((q) => q.block);
    expect([...order].sort()).toEqual(order);
  });

  it("choice questions have options, other types do not", () => {
    for (const q of QUESTION_BANK) {
      if (q.type === "single" || q.type === "multi") expect(q.options?.length).toBeGreaterThan(1);
      else expect(q.options).toBeUndefined();
    }
  });

  it("sensitive questions are never required", () => {
    for (const q of QUESTION_BANK.filter((q) => q.sensitive)) expect(q.required).toBe(false);
  });

  it("every question has copy in ru, kk and en (title, whyWeAsk if sensitive, every option)", () => {
    for (const [name, dict] of [["ru", ru], ["kk", kk], ["en", en]] as const) {
      const q = (dict as unknown as { q: Record<string, Record<string, unknown>> }).q;
      for (const question of QUESTION_BANK) {
        const copy = q[question.optionsKey ?? question.id] as {
          title?: string;
          whyWeAsk?: string;
          options?: Record<string, string>;
          scaleMin?: string;
          scaleMax?: string;
        };
        expect(copy?.title, `${name} q.${question.id}.title`).toBeTruthy();
        if (question.sensitive || question.required) expect(copy.whyWeAsk, `${name} q.${question.id}.whyWeAsk`).toBeTruthy();
        for (const o of question.options ?? []) expect(copy.options?.[o], `${name} q.${question.id}.options.${o}`).toBeTruthy();
        if (question.type === "scale") {
          expect(copy.scaleMin, `${name} q.${question.id}.scaleMin`).toBeTruthy();
          expect(copy.scaleMax, `${name} q.${question.id}.scaleMax`).toBeTruthy();
        }
      }
    }
  });
});

describe("nextQuestion", () => {
  it("starts with A1", () => {
    expect(nextQuestion([])?.id).toBe("A1");
  });

  it("skips showIf-false questions", () => {
    let a = applyAnswer([], { questionId: "A1", value: "a15_17" });
    a = applyAnswer(a, { questionId: "A2", value: "school" });
    a = applyAnswer(a, skipAnswer(QUESTION_BANK.find((q) => q.id === "A3")!));
    // a school student gets the school-plans question, not study/work questions
    expect(nextQuestion(a)?.id).toBe("A6");
    const ids = visibleQuestions(a).map((q) => q.id);
    expect(ids).not.toContain("A4");
    expect(ids).not.toContain("A5");
    expect(ids).toContain("A6");

    // an employed person gets the work question
    let b = applyAnswer([], { questionId: "A1", value: "a23_29" });
    b = applyAnswer(b, { questionId: "A2", value: "work" });
    b = applyAnswer(b, skipAnswer(QUESTION_BANK.find((q) => q.id === "A3")!));
    expect(nextQuestion(b)?.id).toBe("A5");
  });

  it("adds follow-ups when the earlier answer triggers them", () => {
    const base = walkUntil("E2");
    const withYes = applyAnswer(base, { questionId: "E2", value: "yes" });
    expect(nextQuestion(withYes)?.id).toBe("E2b");
    const withNo = applyAnswer(base, { questionId: "E2", value: "no" });
    expect(nextQuestion(withNo)?.id).toBe("E3");

    const chose = applyAnswer(withNo, { questionId: "E3", value: "yes" });
    expect(nextQuestion(chose)?.id).toBe("E3b");
    const notChose = applyAnswer(withNo, { questionId: "E3", value: "no" });
    expect(visibleQuestions(notChose).map((q) => q.id)).not.toContain("E3b");
  });

  it("asks limit follow-ups only for the limits the person selected", () => {
    const base = walkUntil("G1");
    const a = applyAnswer(base, { questionId: "G1", value: ["finance", "language"] });
    expect(nextQuestion(a)?.id).toBe("G2");
    const b = applyAnswer(a, skipAnswer(QUESTION_BANK.find((q) => q.id === "G2")!));
    expect(nextQuestion(b)?.id).toBe("G4");
    const none = applyAnswer(base, { questionId: "G1", value: ["none"] });
    expect(nextQuestion(none)).toBeNull();
  });

  it("never exceeds 30 questions on any path", () => {
    expect(MAX_QUESTIONS).toBe(30);
    // the "longest" paths: always pick the option that opens follow-ups
    for (const pick of [0, 1, 2, 3, 4, 5]) {
      const path = walk((q) => answerFor(q, pick));
      expect(path.length).toBeLessThanOrEqual(30);
      expect(path.length).toBeGreaterThanOrEqual(MIN_QUESTIONS);
    }
    // plus 300 pseudo-random paths (seeded, deterministic)
    let seed = 12345;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let i = 0; i < 300; i++) {
      const path = walk((q) => {
        if (!q.required && rnd() < 0.3) return "skip";
        if (q.type === "multi") {
          const opts = q.options!.filter((o) => !q.exclusive?.includes(o));
          const n = 1 + Math.floor(rnd() * Math.min(q.maxSelect ?? opts.length, opts.length));
          const chosen = [...opts].sort(() => rnd() - 0.5).slice(0, n);
          return { questionId: q.id, value: chosen };
        }
        return answerFor(q, Math.floor(rnd() * 7));
      });
      expect(path.length).toBeLessThanOrEqual(30);
      expect(path.length).toBeGreaterThanOrEqual(15);
      expect(canGenerateReport(path).ok).toBe(true);
    }
  });

  it("enforces the cap itself: optional questions stop, required ones are still asked", () => {
    const full = walk((q) => answerFor(q));
    const fu = [1, 2, 3].map((n) => ({ questionId: `fu:B${n}`, value: ["why?", "because"] }));
    // last optional question unanswered, but AI follow-ups already used up the budget
    const withoutLast = full.slice(0, -1);
    expect(withoutLast.length + fu.length).toBeGreaterThanOrEqual(MAX_QUESTIONS);
    expect(nextQuestion([...withoutLast, ...fu])).toBeNull();
    // a required question is asked even over the cap
    const withoutF1 = full.filter((x) => x.questionId !== "F1");
    expect(nextQuestion([...withoutF1, ...fu])?.id).toBe("F1");
  });

  it("returns null when everything visible is answered", () => {
    expect(nextQuestion(walk((q) => answerFor(q)))).toBeNull();
  });
});

function walkUntil(id: string): Answer[] {
  let answers: Answer[] = [];
  for (let i = 0; i < 100; i++) {
    const q = nextQuestion(answers);
    if (!q) throw new Error(`reached the end before ${id}`);
    if (q.id === id) return answers;
    answers = applyAnswer(answers, answerFor(q, 1));
  }
  throw new Error("loop");
}

describe("canGenerateReport", () => {
  it("blocks report until A, B, C, E, F answered", () => {
    expect(REQUIRED_BLOCKS).toEqual(["A", "B", "C", "E", "F"]);
    expect(canGenerateReport([])).toEqual({ ok: false, missing: ["A", "B", "C", "E", "F"] });

    // answering only A and B
    const partial = walkUntil("C1");
    const r1 = canGenerateReport(partial);
    expect(r1.ok).toBe(false);
    expect(r1.missing).toEqual(["C", "E", "F"]);

    // everything answered
    const all = walk((q) => answerFor(q));
    expect(canGenerateReport(all)).toEqual({ ok: true, missing: [] });
  });

  it("does not need the optional blocks D and G", () => {
    const answers = walk((q) => (q.required ? answerFor(q) : "skip"));
    expect(canGenerateReport(answers).ok).toBe(true);
    expect(answers.some((a) => a.skipped)).toBe(true);
  });

  it("a skipped or empty required answer does not count", () => {
    const all = walk((q) => answerFor(q));
    const broken = all.map((a) => (a.questionId === "F1" ? { questionId: "F1", value: [] as string[] } : a));
    expect(canGenerateReport(broken)).toEqual({ ok: false, missing: ["F"] });
    const skipped = all.map((a) => (a.questionId === "C3" ? { ...a, skipped: true } : a));
    expect(canGenerateReport(skipped)).toEqual({ ok: false, missing: ["C"] });
  });

  it("required questions are never skippable in the bank", () => {
    for (const block of REQUIRED_BLOCKS) {
      expect(QUESTION_BANK.some((q) => q.block === block && q.required)).toBe(true);
    }
  });
});

describe("progress", () => {
  it("goes from 0 to 1 and never leaves 0..1", () => {
    expect(progress([])).toBe(0);
    let answers: Answer[] = [];
    let last = 0;
    for (let i = 0; i < 100; i++) {
      const q = nextQuestion(answers);
      if (!q) break;
      answers = applyAnswer(answers, answerFor(q));
      const p = progress(answers);
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThanOrEqual(1);
      expect(p).toBeGreaterThanOrEqual(last - 0.2); // soft: may dip when a branch opens
      last = p;
    }
    expect(progress(answers)).toBe(1);
  });
});

describe("applyAnswer", () => {
  it("replaces an existing answer in place and keeps bank order", () => {
    let a = applyAnswer([], { questionId: "A1", value: "a18_22" });
    a = applyAnswer(a, { questionId: "A2", value: "university" });
    a = applyAnswer(a, { questionId: "A1", value: "a23_29" });
    expect(a.map((x) => x.questionId)).toEqual(["A1", "A2"]);
    expect(a[0].value).toBe("a23_29");
  });

  it("drops answers of questions that became hidden after an edit", () => {
    let a = applyAnswer([], { questionId: "A1", value: "a18_22" });
    a = applyAnswer(a, { questionId: "A2", value: "university" });
    a = applyAnswer(a, { questionId: "A4", value: "Computer science" });
    expect(a.map((x) => x.questionId)).toContain("A4");
    a = applyAnswer(a, { questionId: "A2", value: "school" });
    expect(a.map((x) => x.questionId)).not.toContain("A4");
  });

  it("drops a chain of dependent answers (E2 -> E2b)", () => {
    let a = walkUntil("E2");
    a = applyAnswer(a, { questionId: "E2", value: "yes" });
    a = applyAnswer(a, { questionId: "E2b", value: "profession" });
    a = applyAnswer(a, { questionId: "E2", value: "no" });
    expect(a.map((x) => x.questionId)).not.toContain("E2b");
  });

  it("drops the AI follow-up of a question when that question is re-answered", () => {
    let a = applyAnswer([], { questionId: "A1", value: "a15_17" });
    a = applyAnswer(a, { questionId: followUpId("A1"), value: ["Why?", "Because"] });
    expect(a.map((x) => x.questionId)).toContain("fu:A1");
    a = applyAnswer(a, { questionId: "A1", value: "a18_22" });
    expect(a.map((x) => x.questionId)).not.toContain("fu:A1");
  });

  it("keeps AI follow-up answers and ignores them for branching, but counts them for the cap", () => {
    expect(isFollowUpId("fu:B2")).toBe(true);
    expect(isFollowUpId("B2")).toBe(false);
    let a = applyAnswer([], { questionId: "A1", value: "a15_17" });
    a = applyAnswer(a, { questionId: "fu:A1", value: ["Why?", "Because"] });
    expect(a).toHaveLength(2);
    expect(nextQuestion(a)?.id).toBe("A2");
  });

  it("skipAnswer encodes by type", () => {
    const find = (id: string) => QUESTION_BANK.find((q) => q.id === id)!;
    expect(skipAnswer(find("A3"))).toEqual({ questionId: "A3", value: "", skipped: true });
    expect(skipAnswer(find("D1"))).toEqual({ questionId: "D1", value: [], skipped: true });
  });
});

describe("previousQuestion", () => {
  it("goes back to the last answered visible question before the current one", () => {
    const a = walkUntil("B2");
    expect(previousQuestion(a, "B2")?.id).toBe("B1");
    expect(previousQuestion([], "A1")).toBeNull();
    // from the end of the questionnaire (current = null) go back to the last answered question
    const all = walk((q) => answerFor(q));
    expect(previousQuestion(all, null)?.id).toBe(all[all.length - 1].questionId);
  });
});

describe("session", () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        get length() {
          return data.size;
        },
        key: (i: number) => [...data.keys()][i] ?? null,
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => void data.set(k, v),
        removeItem: (k: string) => void data.delete(k),
      },
    });
    resetStorageState();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("resumes session: saved answers -> nextQuestion returns the first unanswered", async () => {
    const store = createLocalUserStore();
    let answers = walkUntil("C1");
    const session = withAnswers(createSession(new Date("2026-11-17T10:00:00Z")), answers, new Date("2026-11-17T10:05:00Z"));
    expect(session.currentId).toBe("C1");
    await store.saveSession(session);

    const loaded = await store.loadSession();
    expect(loaded).not.toBeNull();
    expect(nextQuestion(loaded!.answers)?.id).toBe("C1");
    expect(resumeQuestionId(loaded!)).toBe("C1");

    // answer, save again, reload: moves on
    answers = applyAnswer(loaded!.answers, { questionId: "C1", value: "4" });
    await store.saveSession(withAnswers(loaded!, answers, new Date()));
    const again = await store.loadSession();
    expect(nextQuestion(again!.answers)?.id).toBe("C2");
  });

  it("resume ignores a stale currentId and a finished session resumes at null", () => {
    const s = withAnswers(createSession(), walkUntil("C1"), new Date());
    expect(resumeQuestionId({ ...s, currentId: "ZZ" })).toBe("C1");
    const done = withAnswers(createSession(), walk((q) => answerFor(q)), new Date());
    expect(done.currentId).toBeNull();
    expect(resumeQuestionId(done)).toBeNull();
  });

  it("a fresh session is empty and starts at A1", () => {
    const s = createSession();
    expect(s.answers).toEqual([]);
    expect(resumeQuestionId(s)).toBe("A1");
    expect(s.id.length).toBeGreaterThan(5);
  });

  it("restore cleans the saved answers: unknown ids, hidden branches, orphan AI follow-ups, duplicates", async () => {
    const dirty: Answer[] = [
      { questionId: "A2", value: "school" },
      { questionId: "A1", value: "a15_17" },
      { questionId: "ZZ9", value: "who knows" }, // unknown id
      { questionId: "A4", value: "Physics" }, // hidden: A4 is for college/university
      { questionId: "fu:B2", value: ["Why?", "Because"] }, // orphan: B2 is not answered
      { questionId: "fu:A1", value: ["Tell more", "ok"] }, // valid: A1 is answered
      { questionId: "A1", value: "a18_22" }, // duplicate, last one wins
    ];
    expect(normalizeAnswers(dirty)).toEqual([
      { questionId: "A1", value: "a18_22" },
      { questionId: "fu:A1", value: ["Tell more", "ok"] },
      { questionId: "A2", value: "school" },
    ]);

    // through the real store: saved dirty session comes back clean, resuming at the right question
    const store = createLocalUserStore();
    await store.saveSession({ ...createSession(), answers: dirty, currentId: "ZZ9" });
    const restored = restoreSession((await store.loadSession())!);
    expect(restored.answers.map((a) => a.questionId)).toEqual(["A1", "fu:A1", "A2"]);
    expect(restored.currentId).toBe("A3");
    expect(resumeQuestionId(restored)).toBe("A3");
  });
});
