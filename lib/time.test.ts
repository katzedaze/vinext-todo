import { describe, expect, test } from "vitest";
import { formatTokyo, toIsoUtc } from "./time";

describe("toIsoUtc", () => {
  test("converts D1 datetime to ISO 8601 UTC", () => {
    expect(toIsoUtc("2026-10-04 09:15:30")).toBe("2026-10-04T09:15:30Z");
  });
});

describe("formatTokyo", () => {
  test("shifts UTC to Asia/Tokyo (UTC+9)", () => {
    expect(formatTokyo("2026-10-04 09:15:30")).toBe("2026-10-04 18:15");
  });

  test("rolls over the date across midnight", () => {
    expect(formatTokyo("2026-12-31 15:30:00")).toBe("2027-01-01 00:30");
  });

  test("returns the input unchanged when it cannot be parsed", () => {
    expect(formatTokyo("not a date")).toBe("not a date");
  });
});
