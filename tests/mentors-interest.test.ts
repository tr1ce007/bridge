import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetStorageState } from "@/lib/data/storage";
import { clearMentorInterest, loadMentorInterest, saveMentorInterest, validateMentorInterest } from "@/lib/mentors/interest";

function fakeLocalStorage() {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    _data: data,
  };
}

describe("mentor interest (kept in this browser)", () => {
  let ls: ReturnType<typeof fakeLocalStorage>;
  beforeEach(() => {
    ls = fakeLocalStorage();
    vi.stubGlobal("window", { localStorage: ls });
    resetStorageState();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("requires at least one topic for a mentee", () => {
    expect(validateMentorInterest({ role: "mentee", topics: [], field: "", experience: "", note: "", contact: "" })).toEqual({ topics: "required" });
    expect(validateMentorInterest({ role: "mentee", topics: ["study-abroad"], field: "", experience: "", note: "", contact: "" })).toEqual({});
  });

  it("requires a field and experience for a mentor", () => {
    const errors = validateMentorInterest({ role: "mentor", topics: [], field: " ", experience: "", note: "", contact: "" });
    expect(errors).toEqual({ field: "required", experience: "required" });
    expect(validateMentorInterest({ role: "mentor", topics: [], field: "Право", experience: "5 лет", note: "", contact: "" })).toEqual({});
  });

  it("saves, loads and removes the interest, only under the bridge: prefix", () => {
    expect(loadMentorInterest()).toBeNull();
    const saved = saveMentorInterest({ role: "mentee", topics: ["scholarships"], field: "", experience: "", note: "Хочу в Европу", contact: "" }, new Date("2026-11-18T10:00:00Z"));
    expect(saved.createdAt).toBe("2026-11-18T10:00:00.000Z");
    expect(loadMentorInterest()).toEqual(saved);
    expect([...ls._data.keys()].every((k) => k.startsWith("bridge:"))).toBe(true);
    clearMentorInterest();
    expect(loadMentorInterest()).toBeNull();
  });

  it("drops stored data that does not match the schema", () => {
    ls.setItem("bridge:mentor-interest", JSON.stringify({ role: "hacker" }));
    expect(loadMentorInterest()).toBeNull();
  });
});
