import type { CSSProperties } from "react";

/**
 * Badge definitions — operator-managed via the admin "Badges" page, stored as
 * the `badges` store-setting (a JSON array) and served in the /store/content
 * bundle. The storefront resolves a product's badge string (from tags[0], or
 * metadata.badge) to one of these defs for its colour + localized label.
 *
 * `BUILTIN_BADGES` is the fallback used when the setting hasn't been seeded, and
 * is seeded verbatim by the admin page on first load — so the look is identical
 * whether or not the setting exists yet.
 */
export type BadgeDef = {
  /** Matches the product tag value / metadata.badge (case-insensitive). */
  code: string;
  label_it: string;
  label_en: string;
  /** Background colour (hex). */
  bg: string;
  /** Text colour (hex). */
  fg: string;
  /** Optional second colour — renders a left-to-right gradient bg → bg2. */
  bg2?: string;
  /** Soft outer glow in the badge colour. */
  glow?: boolean;
};

export const BUILTIN_BADGES: BadgeDef[] = [
  { code: "NEW", label_it: "NOVITÀ", label_en: "NEW", bg: "#34C759", fg: "#FFFFFF" },
  { code: "SALDI", label_it: "SALDI", label_en: "SALE", bg: "#FF453A", fg: "#FFFFFF", glow: true },
  { code: "HIT", label_it: "🔥 HOT", label_en: "🔥 HOT", bg: "#FF9500", fg: "#FFFFFF", bg2: "#FF453A", glow: true },
  { code: "LIMITED", label_it: "LIMITATO", label_en: "LIMITED", bg: "#8B4513", fg: "#FFFFFF", glow: true },
];

// Back-compat aliases so legacy badge strings still resolve to a def.
const ALIASES: Record<string, string> = {
  SALE: "SALDI",
  HOT: "HIT",
  NUOVO: "NEW",
  "NOVITÀ": "NEW",
  LIMITATO: "LIMITED",
};

export type ResolvedBadge = { label: string; style: CSSProperties };

/** Inline style for a badge def (solid or gradient bg, optional glow). */
export function badgeStyle(def: BadgeDef): CSSProperties {
  const style: CSSProperties = {
    background: def.bg2 ? `linear-gradient(to right, ${def.bg}, ${def.bg2})` : def.bg,
    color: def.fg,
  };
  // 8-digit hex appends ~35% alpha for the glow.
  if (def.glow) style.boxShadow = `0 0 12px ${def.bg}59`;
  return style;
}

/**
 * Resolve a product's badge string to a label + style, or null if none.
 * Falls back to a neutral chip for an unknown custom badge, and to a
 * "featured" look when only `isPromoted` is set.
 */
export function resolveBadge(
  badge: string | undefined,
  isPromoted: boolean | undefined,
  defs: BadgeDef[],
  locale: string
): ResolvedBadge | null {
  const raw = badge?.trim();
  if (raw) {
    const code = raw.toUpperCase();
    const canonical = ALIASES[code] ?? code;
    // Guard against a malformed operator-managed `badges` setting: fall back to
    // the built-ins if it isn't an array, and skip entries without a string code.
    const list = Array.isArray(defs) ? defs : BUILTIN_BADGES;
    const def = list.find((d) => typeof d?.code === "string" && d.code.toUpperCase() === canonical);
    if (def) {
      return {
        label: (locale === "it" ? def.label_it : def.label_en) || def.code,
        style: badgeStyle(def),
      };
    }
    // Unknown custom badge — render the raw text in a neutral chip.
    return { label: raw, style: { background: "#222222", color: "#FFFFFF" } };
  }
  if (isPromoted) {
    return {
      label: locale === "it" ? "★ IN EVIDENZA" : "★ FEATURED",
      style: {
        background: "linear-gradient(to right, #fbbf24, #eab308)",
        color: "#000000",
        boxShadow: "0 0 14px rgba(245,158,11,0.4)",
      },
    };
  }
  return null;
}
