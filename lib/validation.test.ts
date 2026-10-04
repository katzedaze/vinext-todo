import { describe, expect, test } from "vitest";
import { MAX_TITLE_LENGTH, parseId, validateTitle } from "./validation";

describe("validateTitle", () => {
  test("trims surrounding whitespace", () => {
    expect(validateTitle("  牛乳を買う  ")).toEqual({ ok: true, title: "牛乳を買う" });
  });

  test("rejects empty and whitespace-only input", () => {
    expect(validateTitle("").ok).toBe(false);
    expect(validateTitle("   ").ok).toBe(false);
  });

  test("rejects non-string input", () => {
    expect(validateTitle(null).ok).toBe(false);
  });

  test("enforces the maximum length", () => {
    expect(validateTitle("a".repeat(MAX_TITLE_LENGTH)).ok).toBe(true);
    expect(validateTitle("a".repeat(MAX_TITLE_LENGTH + 1)).ok).toBe(false);
  });
});

describe("parseId", () => {
  test("accepts positive integer strings", () => {
    expect(parseId("42")).toBe(42);
  });

  test("rejects invalid ids", () => {
    for (const input of ["0", "-1", "1.5", "abc", "", null, "99999999999999999999"]) {
      expect(parseId(input)).toBeNull();
    }
  });
});
