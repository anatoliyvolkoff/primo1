import { describe, it, expect } from "vitest";
import { resolveBadge, BUILTIN_BADGES, type BadgeDef } from "./badges";

// Guards LB178-1: a malformed operator-managed `badges` store-setting must fall
// back gracefully instead of throwing inside resolveBadge.
describe("resolveBadge — malformed defs hardening", () => {
  it("does not throw when defs is not an array, resolving via built-in fallback", () => {
    // A known code should still resolve via BUILTIN_BADGES when defs is bogus.
    const notArrays = [null, undefined, {}, "NEW", 42] as unknown as BadgeDef[][];
    for (const bad of notArrays) {
      expect(() => resolveBadge("NEW", false, bad as unknown as BadgeDef[], "en")).not.toThrow();
      const r = resolveBadge("NEW", false, bad as unknown as BadgeDef[], "en");
      expect(r?.label).toBe("NEW");
    }
  });

  it("skips entries missing a code / with a non-string code without throwing", () => {
    const bad = [
      {} as BadgeDef,
      { code: 123 } as unknown as BadgeDef,
      { code: null } as unknown as BadgeDef,
      { label_it: "x", label_en: "x", bg: "#000", fg: "#fff" } as unknown as BadgeDef,
    ];
    expect(() => resolveBadge("NEW", false, bad, "en")).not.toThrow();
    // No valid entry matched -> neutral chip fallback for the raw text.
    const r = resolveBadge("NEW", false, bad, "en");
    expect(r?.label).toBe("NEW");
    expect(r?.style.background).toBe("#222222");
  });

  it("still resolves a valid entry mixed in with malformed ones", () => {
    const mixed = [
      { code: 123 } as unknown as BadgeDef,
      { code: "SALDI", label_it: "SALDI", label_en: "SALE", bg: "#FF453A", fg: "#FFFFFF" },
    ];
    const r = resolveBadge("saldi", false, mixed, "en");
    expect(r?.label).toBe("SALE");
    expect(r?.style.background).toBe("#FF453A");
  });

  it("keeps the happy path identical for well-formed defs", () => {
    const r = resolveBadge("NEW", false, BUILTIN_BADGES, "it");
    expect(r?.label).toBe("NOVITÀ");
  });
});
