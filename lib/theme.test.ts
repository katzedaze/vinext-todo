import { describe, expect, test } from "vitest";
import { isDarkTheme, nextPreference, parsePreference } from "./theme";

describe("parsePreference", () => {
  test("keeps known values and falls back to system", () => {
    expect(parsePreference("light")).toBe("light");
    expect(parsePreference("dark")).toBe("dark");
    expect(parsePreference(null)).toBe("system");
    expect(parsePreference("purple")).toBe("system");
  });
});

describe("nextPreference", () => {
  test("cycles system → light → dark → system", () => {
    expect(nextPreference("system")).toBe("light");
    expect(nextPreference("light")).toBe("dark");
    expect(nextPreference("dark")).toBe("system");
  });
});

describe("isDarkTheme", () => {
  test("explicit preferences win over the OS setting", () => {
    expect(isDarkTheme("dark", false)).toBe(true);
    expect(isDarkTheme("light", true)).toBe(false);
  });

  test("system follows the OS setting", () => {
    expect(isDarkTheme("system", true)).toBe(true);
    expect(isDarkTheme("system", false)).toBe(false);
  });
});
