/**
 * Framework-free product search matcher shared by the header SearchOverlay and
 * (Batch 3) the `/tutti-prodotti?q=` results page. No React / no fetch — it
 * operates purely over an already-loaded in-memory catalogue.
 *
 * Ported from the client prototype (`primo-redesign/js/search.js` find()/correct()):
 * diacritic + punctuation folding, token scoring/ranking, and lightweight
 * Levenshtein typo-correction over a vocabulary built from the catalogue.
 */

import { NAIL_SWATCHES } from '../data/swatches';
import { translations as i18nTranslations } from '../i18n';

// ── text helpers ──────────────────────────────────────────────────────────

/**
 * Diacritic-insensitive fold so "rosa" matches "Rosà" (and vice-versa) and
 * apostrophes/punctuation are ignored — important for the IT-primary catalogue.
 * Mirrors the prototype's `norm`.
 */
export const fold = (s: string): string =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, '')
    .toLowerCase();

/** Fold + split into alphanumeric word tokens. */
export const tokens = (s: string): string[] =>
  fold(s)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean);

// ── colour alias map (EN ↔ IT ↔ catalogue values) ──────────────────────────

/**
 * Crosswalk a search token to the catalog colour values it should match. Built
 * from NAIL_SWATCHES so "red", "rosso", "burgundy", "bordo", "grey", "grigio", …
 * all surface products tagged with the corresponding `productColors`
 * (BORDEAUX, ROSSO, …). Without this, EN-mode searches for "red" miss
 * Italian-named products whose `colorName` is ROSSO.
 */
export const COLOR_ALIAS_MAP: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  const add = (term: string | undefined, productColors: string[]) => {
    if (!term) return;
    const key = fold(term).trim();
    if (!key) return;
    map[key] = Array.from(new Set([...(map[key] ?? []), ...productColors]));
  };
  for (const sw of NAIL_SWATCHES) {
    add(sw.name, sw.productColors);
    add(sw.slug, sw.productColors);
    add(i18nTranslations.it[sw.i18nKey as 'swatch.bw'], sw.productColors);
    add(i18nTranslations.en[sw.i18nKey as 'swatch.bw'], sw.productColors);
  }
  return map;
})();

// ── product shape the matcher needs (structurally compatible with Product) ──

export interface Matchable {
  id: string;
  name: string;
  description?: string;
  category?: string;
  subCategory?: string;
  colorName?: string;
  effect?: string;
  /** Locale-independent concatenation of EN+IT name/description/… */
  searchText?: string;
}

/**
 * The folded "haystack" for a product: prefer the locale-independent
 * `searchText` index, else concatenate the locale-mapped fields.
 */
const haystackOf = (p: Matchable): string => {
  const raw =
    p.searchText ??
    [p.name, p.description, p.category, p.subCategory, p.colorName, p.effect]
      .filter(Boolean)
      .join(' ');
  return fold(raw);
};

// ── scoring ─────────────────────────────────────────────────────────────────

/**
 * Score a single query token against a product's folded haystack:
 *   3 — whole-word exact match
 *   2 — a word starts with the token (prefix)
 *   1 — substring (token longer than 3 chars) anywhere
 *   0 — no match
 * Mirrors the prototype's `tokenScore`, adapted to score against the haystack
 * string (word-boundary aware) rather than a pre-split word list.
 */
const tokenScore = (token: string, haystack: string): number => {
  if (!token) return 0;
  // word-boundary: start-of-string or non-alphanumeric before the token
  const whole = new RegExp(`(?:^|[^a-z0-9])${escapeRe(token)}(?:$|[^a-z0-9])`);
  if (whole.test(haystack)) return 3;
  const prefix = new RegExp(`(?:^|[^a-z0-9])${escapeRe(token)}`);
  if (prefix.test(haystack)) return 2;
  if (token.length > 3 && haystack.includes(token)) return 1;
  return 0;
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Total score for a query over a haystack. ALL tokens must contribute (AND
 * semantics, like the prototype's `scoreWords`), else 0. A folded whole-query
 * substring hit adds a bonus so tighter matches rank first.
 */
const scoreHaystack = (toks: string[], haystack: string, foldedQuery: string): number => {
  let s = 0;
  for (const t of toks) {
    const v = tokenScore(t, haystack);
    if (!v) return 0;
    s += v;
  }
  if (foldedQuery && haystack.includes(foldedQuery)) s += 2;
  return s;
};

// ── typo correction ──────────────────────────────────────────────────────────

/** Bounded Levenshtein; bails early past distance 2 on length alone. */
export const levenshtein = (a: string, b: string): number => {
  if (Math.abs(a.length - b.length) > 2) return 9;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
};

/**
 * Build a de-duplicated vocabulary from the catalogue (every word across every
 * product haystack) plus the colour aliases. Used by `correct()` to swap an
 * unknown (mistyped) token for the closest known word.
 *
 * `extraWords` lets callers widen the vocabulary beyond products so that real,
 * non-product search terms (course / page / collection / category words like
 * "corso") are recognised as known words and therefore NOT "corrected" into a
 * nearest product word. This mirrors the client prototype's `VOCAB`, which is
 * built from every INDEX entry's words, not just products. Each extra string is
 * folded + tokenised, so callers can pass raw labels/aliases.
 */
export const buildVocab = (
  products: Matchable[],
  extraWords: Iterable<string> = [],
): string[] => {
  const set = new Set<string>();
  const addWords = (raw: string) => {
    for (const w of fold(raw).split(/[^a-z0-9]+/)) if (w) set.add(w);
  };
  for (const p of products) addWords(haystackOf(p));
  for (const key of Object.keys(COLOR_ALIAS_MAP)) addWords(key);
  for (const extra of extraWords) addWords(extra);
  return Array.from(set);
};

/**
 * Typo-correct a query against a vocabulary: for each token not already a known
 * prefix, swap in the closest vocabulary word within edit distance (1 for short
 * tokens, 2 for longer). Returns the corrected query, or null if nothing
 * changed. Mirrors the prototype's `correct`.
 */
export const correct = (query: string, vocab: string[]): string | null => {
  let changed = false;
  const out = tokens(query).map((t) => {
    if (vocab.some((w) => w.startsWith(t))) return t;
    const max = t.length <= 4 ? 1 : 2;
    let best: string | null = null;
    let bd = max + 1;
    for (const w of vocab) {
      const d = Math.min(
        levenshtein(t, w),
        w.length > t.length ? levenshtein(t, w.slice(0, t.length)) : 9,
      );
      if (d < bd || (d === bd && best && w.length < best.length)) {
        bd = d;
        best = w;
      }
    }
    if (best && bd <= max) {
      changed = true;
      return best;
    }
    return t;
  });
  return changed ? out.join(' ') : null;
};

// ── public matcher ───────────────────────────────────────────────────────────

export interface MatchOptions<T extends Matchable = Matchable> {
  /**
   * Restrict to products whose `categoryHandle` or `subCategoryHandle` equals
   * this handle (overlay's category chip). The predicate is supplied by the
   * caller to avoid coupling the matcher to the full Product type.
   */
  filter?: (p: T) => boolean;
}

/**
 * Match + rank products for a raw query. Returns products ordered by relevance
 * (best first). Behaviour is at least as good as the old substring filter:
 * colour-alias crosswalk is preserved, and results are now scored/ranked.
 *
 * Typo tolerance is applied by the caller via `correct()` (see
 * `matchProductsWithFallback`) so the overlay can show a "did you mean" note;
 * `matchProducts` itself matches the query as given.
 */
export const matchProducts = <T extends Matchable>(
  products: T[],
  query: string,
  options: MatchOptions<T> = {},
): T[] => {
  const foldedQuery = fold(query.trim());
  const toks = tokens(query);
  if (toks.length === 0) return [];
  const aliasedColors = COLOR_ALIAS_MAP[foldedQuery] ?? [];
  const scored: { p: T; score: number }[] = [];
  for (const p of products) {
    if (options.filter && !options.filter(p)) continue;
    const haystack = haystackOf(p);
    let score = scoreHaystack(toks, haystack, foldedQuery);
    if (
      score === 0 &&
      aliasedColors.length > 0 &&
      p.colorName &&
      aliasedColors.some((c) => p.colorName!.toUpperCase().includes(c))
    ) {
      // colour-alias fallback: give it a small positive score so it still ranks
      score = 2;
    }
    if (score > 0) scored.push({ p, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.p);
};

export interface MatchResult<T extends Matchable> {
  /** Ranked matches (possibly for the corrected query). */
  results: T[];
  /** The query that actually produced the results (original or corrected). */
  usedQuery: string;
  /** The corrected query when a typo-fallback kicked in, else null. */
  correctedQuery: string | null;
}

/**
 * Match with typo-fallback: try the query as typed; if it yields nothing, try a
 * typo-corrected variant and, if that yields hits, return those plus the
 * corrected query so the UI can show "did you mean". `vocab` should be built
 * once per catalogue via `buildVocab`.
 */
export const matchProductsWithFallback = <T extends Matchable>(
  products: T[],
  query: string,
  vocab: string[],
  options: MatchOptions<T> = {},
): MatchResult<T> => {
  const direct = matchProducts(products, query, options);
  if (direct.length > 0 || tokens(query).length === 0) {
    return { results: direct, usedQuery: query, correctedQuery: null };
  }
  const fixed = correct(query, vocab);
  if (fixed && fold(fixed) !== fold(query)) {
    const fixedResults = matchProducts(products, fixed, options);
    if (fixedResults.length > 0) {
      return { results: fixedResults, usedQuery: fixed, correctedQuery: fixed };
    }
  }
  return { results: direct, usedQuery: query, correctedQuery: null };
};

/**
 * Generic scored matcher for non-product suggestion entries (categories,
 * colours, collections). Each entry carries pre-folded searchable `words`; the
 * returned list is ranked best-first. Mirrors the prototype's `find()` scoring
 * for INDEX rows.
 */
export interface SuggestionEntry {
  /** Folded, space-joined searchable text (label + aliases). */
  haystack: string;
  /** Folded label, used for the whole-query prefix bonus. */
  labelFold: string;
}

export const scoreSuggestion = (entry: SuggestionEntry, query: string): number => {
  const toks = tokens(query);
  if (toks.length === 0) return 0;
  const foldedQuery = fold(query.trim());
  let s = scoreHaystack(toks, entry.haystack, foldedQuery);
  if (s > 0 && entry.labelFold.startsWith(foldedQuery)) s += 4;
  return s;
};

// ── match highlighting (prototype `hl()`) ────────────────────────────────────

export interface HighlightSegment {
  text: string;
  mark: boolean;
}

/**
 * Split `text` into alternating plain / matched segments for a `<mark>`-style
 * highlight of the query tokens, mirroring the prototype's `hl()`. Each query
 * token matches at a word boundary (start-of-string or a non-alphanumeric char
 * before it), case/diacritic-insensitively, and the ORIGINAL casing of `text`
 * is preserved in the returned segments. Returns a single unmarked segment when
 * there are no tokens or no matches, so callers can render uniformly.
 */
export const highlightTokens = (text: string, query: string): HighlightSegment[] => {
  const src = String(text ?? '');
  const toks = Array.from(new Set(tokens(query))).filter(Boolean);
  if (!src || toks.length === 0) return [{ text: src, mark: false }];

  // Fold per-character while keeping a map back to the original string so we can
  // match on the folded form but slice the original (preserves accents/casing).
  // fold() only lowercases + strips diacritics/apostrophes (no length change for
  // our Latin inputs), so index alignment holds for the catalogue's strings.
  const folded = fold(src);
  const re = new RegExp(
    `(?:^|[^a-z0-9])(${toks.map(escapeRe).join('|')})`,
    'gi',
  );
  const segs: HighlightSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(folded)) !== null) {
    // m[1] is the matched token; it starts after an optional boundary char.
    const tokStart = m.index + (m[0].length - m[1].length);
    const tokEnd = tokStart + m[1].length;
    if (tokStart > last) segs.push({ text: src.slice(last, tokStart), mark: false });
    segs.push({ text: src.slice(tokStart, tokEnd), mark: true });
    last = tokEnd;
    // Avoid zero-length loops.
    if (re.lastIndex <= tokStart) re.lastIndex = tokEnd;
  }
  if (last < src.length) segs.push({ text: src.slice(last), mark: false });
  return segs.length ? segs : [{ text: src, mark: false }];
};

// ── recent SEARCH QUERIES store (prototype `recent`/`remember`) ───────────────

const RECENT_KEY = 'primo.search.recent.v1';
const RECENT_MAX = 6;

/** Read the stored recent-search queries (strings, newest first, max 6). */
export const getRecentSearches = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r): r is string => typeof r === 'string').slice(0, RECENT_MAX);
  } catch {
    return [];
  }
};

const writeRecent = (next: string[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, RECENT_MAX)));
  } catch {
    /* ignore quota errors */
  }
};

/**
 * Remember a submitted/clicked query: trims, ignores <2 chars, dedups
 * case/diacritic-insensitively (keeping the newest spelling first), caps at 6.
 * Returns the new list.
 */
export const rememberSearch = (query: string): string[] => {
  const q = query.trim();
  if (q.length < 2) return getRecentSearches();
  const foldedQ = fold(q);
  const next = [q, ...getRecentSearches().filter((r) => fold(r) !== foldedQ)].slice(0, RECENT_MAX);
  writeRecent(next);
  return next;
};

/** Remove a single recent-search entry (exact string). Returns the new list. */
export const removeRecentSearch = (query: string): string[] => {
  const next = getRecentSearches().filter((r) => r !== query);
  writeRecent(next);
  return next;
};

/** Clear all recent searches. */
export const clearRecentSearches = (): void => writeRecent([]);

// ── product swatch dot (prototype `.sx-dot` colour) ──────────────────────────

/** A product shape carrying the fields the swatch-dot resolver reads. */
export interface SwatchDotSource {
  colorName?: string;
  effect?: string;
  /** Present on Kit/bundle products — triggers the multi-colour gradient. */
  bundleHandles?: string[];
}

/**
 * Resolve the CSS background for a product's result-thumbnail colour dot
 * (prototype `.sx-dot`). A single-colour product uses its matching swatch's
 * `color`; a Kit/bundle (or a product with several comma-separated colours)
 * renders a multi-colour gradient from the swatches it spans. Returns null when
 * no swatch matches (caller then renders no dot).
 */
export const resolveSwatchDot = (p: SwatchDotSource): string | null => {
  // Collect every swatch this product belongs to (by colour token or effect).
  const colorTokens = (p.colorName ?? '')
    .split(/[,\s]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  const effect = p.effect?.toUpperCase();

  const matched = NAIL_SWATCHES.filter((sw) => {
    if (sw.productEffect && effect === sw.productEffect) return true;
    return sw.productColors.some((c) => colorTokens.includes(c));
  });
  if (matched.length === 0) return null;

  const isMulti = (p.bundleHandles?.length ?? 0) > 0 || matched.length > 1;
  if (!isMulti) return matched[0].color;

  // Multi-colour: build a conic/linear gradient from each swatch's base colour.
  // Swatch `color` can itself be a gradient (e.g. b&w); extract a representative
  // solid hex so the kit dot stays a clean multi-stop gradient.
  const stops = matched
    .map((sw) => {
      const hex = sw.color.match(/#[0-9a-fA-F]{3,8}/);
      return hex ? hex[0] : sw.color;
    })
    .filter(Boolean);
  const uniq = Array.from(new Set(stops));
  if (uniq.length === 1) return uniq[0];
  const step = 100 / uniq.length;
  const segments = uniq
    .map((c, i) => `${c} ${Math.round(i * step)}% ${Math.round((i + 1) * step)}%`)
    .join(', ');
  return `conic-gradient(${segments})`;
};
