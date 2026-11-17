import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetStorageState } from "@/lib/data/storage";
import { listStarted, markStarted, unmarkStarted } from "@/lib/experiments/progress";

describe("experiment progress", () => {
  beforeEach(() => resetStorageState());
  afterEach(() => resetStorageState());
  it("marks and unmarks started experiments without duplicates", () => {
    expect(listStarted()).toEqual([]);
    markStarted("a");
    markStarted("b");
    markStarted("a");
    expect(listStarted()).toEqual(["a", "b"]);
    unmarkStarted("a");
    expect(listStarted()).toEqual(["b"]);
  });
});
