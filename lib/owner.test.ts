import { beforeEach, describe, expect, test, vi } from "vitest";

const cookieJar = new Map<string, string>();
const setCookie = vi.fn((name: string, value: string) => cookieJar.set(name, value));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined),
    set: setCookie,
  }),
}));

const { OWNER_COOKIE, ensureOwnerHash, hashOwnerId, isValidOwnerId, readOwnerHash } = await import("./owner");

const VALID_ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

beforeEach(() => {
  cookieJar.clear();
  setCookie.mockClear();
});

describe("hashOwnerId", () => {
  test("returns a stable SHA-256 hex digest", async () => {
    const hash = await hashOwnerId(VALID_ID);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashOwnerId(VALID_ID)).toBe(hash);
    expect(await hashOwnerId("other")).not.toBe(hash);
  });
});

describe("isValidOwnerId", () => {
  test("accepts only UUID v4 values", () => {
    expect(isValidOwnerId(VALID_ID)).toBe(true);
    expect(isValidOwnerId(undefined)).toBe(false);
    expect(isValidOwnerId("not-a-uuid")).toBe(false);
    expect(isValidOwnerId(`${VALID_ID}x`)).toBe(false);
  });
});

describe("readOwnerHash", () => {
  test("returns null without a cookie", async () => {
    expect(await readOwnerHash()).toBeNull();
  });

  test("ignores a tampered cookie", async () => {
    cookieJar.set(OWNER_COOKIE, "'; DROP TABLE todos; --");

    expect(await readOwnerHash()).toBeNull();
  });

  test("returns the hash of a valid cookie", async () => {
    cookieJar.set(OWNER_COOKIE, VALID_ID);

    expect(await readOwnerHash()).toBe(await hashOwnerId(VALID_ID));
  });
});

describe("ensureOwnerHash", () => {
  test("reuses an existing cookie without rewriting it", async () => {
    cookieJar.set(OWNER_COOKIE, VALID_ID);

    expect(await ensureOwnerHash()).toBe(await hashOwnerId(VALID_ID));
    expect(setCookie).not.toHaveBeenCalled();
  });

  test("issues a secure httpOnly cookie when missing", async () => {
    const hash = await ensureOwnerHash();

    const [name, value, options] = setCookie.mock.calls[0] as unknown as [string, string, object];
    expect(name).toBe(OWNER_COOKIE);
    expect(isValidOwnerId(value)).toBe(true);
    expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax" });
    expect(hash).toBe(await hashOwnerId(value));
  });
});
