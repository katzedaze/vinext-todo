import { describe, expect, test } from "vitest";
import { buildCsp, createNonce } from "./csp";

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp.split("; ").map((directive) => {
      const [name, ...sources] = directive.split(" ");
      return [name, sources];
    }),
  );
}

describe("createNonce", () => {
  test("returns a fresh base64 value each time", () => {
    const nonce = createNonce();

    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(nonce);
  });
});

describe("buildCsp", () => {
  test("allows only nonce-bearing scripts in production", () => {
    const csp = directives(buildCsp("abc123", false));

    expect(csp.get("script-src")).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
    expect(csp.get("object-src")).toEqual(["'none'"]);
    expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
    expect(csp.has("upgrade-insecure-requests")).toBe(true);
  });

  test("never allows inline scripts or eval in production", () => {
    const csp = buildCsp("abc123", false);

    expect(directives(csp).get("script-src")).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain("ws:");
  });

  test("relaxes only what Vite and React need in development", () => {
    const csp = directives(buildCsp("abc123", true));

    expect(csp.get("script-src")).toContain("'unsafe-eval'");
    expect(csp.get("connect-src")).toEqual(["'self'", "ws:", "wss:"]);
    expect(csp.has("upgrade-insecure-requests")).toBe(false);
  });
});
