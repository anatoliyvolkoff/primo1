import { describe, it, expect, beforeEach } from 'vitest';
import {
  fold,
  tokens,
  matchProducts,
  matchProductsWithFallback,
  buildVocab,
  correct,
  levenshtein,
  scoreSuggestion,
  highlightTokens,
  resolveSwatchDot,
  getRecentSearches,
  rememberSearch,
  removeRecentSearch,
  clearRecentSearches,
  COLOR_ALIAS_MAP,
  type Matchable,
} from './searchMatch';

// A tiny catalogue exercising the matcher's key paths: IT-named colour,
// multi-word name, and a distinct category.
const PRODUCTS: Matchable[] = [
  {
    id: 'p1',
    name: 'Semipermanente Rosso Passione',
    description: 'Smalto gel rosso intenso',
    category: 'Semipermanente',
    colorName: 'ROSSO',
    searchText: 'semipermanente rosso passione smalto gel rosso intenso semi-permanent red red polish',
  },
  {
    id: 'p2',
    name: 'Top Coat No Wipe',
    description: 'Finitura lucida',
    category: 'Top',
    searchText: 'top coat no wipe finitura lucida glossy top coat',
  },
  {
    id: 'p3',
    name: 'Acrygel Nude',
    description: 'Costruttore nude',
    category: 'Gel',
    colorName: 'NUDE',
    searchText: 'acrygel nude costruttore builder beige naturale',
  },
];

describe('searchMatch — fold', () => {
  it('strips diacritics, punctuation and lowercases', () => {
    expect(fold('Rosà')).toBe('rosa');
    expect(fold("L'été")).toBe('lete');
    expect(fold('TOP COAT')).toBe('top coat');
  });
});

describe('matchProducts', () => {
  it('matches a plain substring query', () => {
    const r = matchProducts(PRODUCTS, 'top coat');
    expect(r.map(p => p.id)).toContain('p2');
  });

  it('matches an IT colour name diacritic-insensitively', () => {
    expect(matchProducts(PRODUCTS, 'rosso').map(p => p.id)).toContain('p1');
  });

  it('matches via the EN↔IT colour alias crosswalk ("red" → ROSSO)', () => {
    // "red" is an alias for ROSSO; p1 is tagged colorName ROSSO.
    expect(matchProducts(PRODUCTS, 'red').map(p => p.id)).toContain('p1');
  });

  it('ranks a whole-word hit above a weaker one', () => {
    const r = matchProducts(PRODUCTS, 'nude');
    expect(r[0]?.id).toBe('p3');
  });

  it('applies the category filter when supplied', () => {
    const r = matchProducts(PRODUCTS, 'gel', {
      filter: (p) => p.category === 'Top',
    });
    expect(r.every(p => p.category === 'Top')).toBe(true);
  });

  it('returns [] for an empty query', () => {
    expect(matchProducts(PRODUCTS, '   ')).toEqual([]);
  });
});

describe('typo tolerance (matchProductsWithFallback)', () => {
  const vocab = buildVocab(PRODUCTS);

  it('corrects a one-off typo and still finds the product', () => {
    // "sempermanente" (missing an "i") → "semipermanente"
    const res = matchProductsWithFallback(PRODUCTS, 'sempermanente', vocab);
    expect(res.results.map(p => p.id)).toContain('p1');
    expect(res.correctedQuery).toBeTruthy();
  });

  it('does not report a correction when the raw query already matches', () => {
    const res = matchProductsWithFallback(PRODUCTS, 'rosso', vocab);
    expect(res.correctedQuery).toBeNull();
    expect(res.results.map(p => p.id)).toContain('p1');
  });

  it('correct() swaps a mistyped token for the closest vocab word', () => {
    // "costrutore" (missing a "t") → "costruttore"; an unambiguous one-edit fix.
    expect(correct('costrutore', vocab)).toBe('costruttore');
    expect(correct('rosso', vocab)).toBeNull();
  });
});

describe('scoreSuggestion', () => {
  it('scores a label hit and rewards a whole-query prefix', () => {
    const entry = { haystack: fold('rosso red bordeaux'), labelFold: fold('rosso') };
    const prefix = scoreSuggestion(entry, 'ros');
    const miss = scoreSuggestion(entry, 'verde');
    expect(prefix).toBeGreaterThan(0);
    expect(miss).toBe(0);
  });
});

describe('highlightTokens', () => {
  it('wraps a matched token at a word boundary, preserving original casing', () => {
    const segs = highlightTokens('Semipermanente Rosso', 'rosso');
    const marked = segs.filter(s => s.mark).map(s => s.text);
    expect(marked).toEqual(['Rosso']); // original casing kept
    expect(segs.map(s => s.text).join('')).toBe('Semipermanente Rosso');
  });

  it('highlights token at the start of the string', () => {
    const segs = highlightTokens('Rosso intenso', 'ros');
    expect(segs[0]).toEqual({ text: 'Ros', mark: true });
  });

  it('matches diacritic-insensitively but keeps the accented source char', () => {
    const segs = highlightTokens('Rosà passione', 'rosa');
    expect(segs.find(s => s.mark)?.text).toBe('Rosà');
  });

  it('returns a single unmarked segment when there is no match or no query', () => {
    expect(highlightTokens('Top Coat', 'rosso')).toEqual([{ text: 'Top Coat', mark: false }]);
    expect(highlightTokens('Top Coat', '')).toEqual([{ text: 'Top Coat', mark: false }]);
  });

  it('does not highlight a mid-word substring (word-boundary only)', () => {
    // "ro" should not light up the "ro" inside "pennaRObbia"-style words.
    const segs = highlightTokens('Microbo', 'ro');
    expect(segs.some(s => s.mark)).toBe(false);
  });
});

describe('resolveSwatchDot', () => {
  it('returns a single swatch colour for a single-colour product', () => {
    const dot = resolveSwatchDot({ colorName: 'ROSSO' });
    expect(dot).toBe('#D91A2A'); // NAIL_SWATCHES rosso
  });

  it('returns a multi-colour gradient for a bundle/kit product', () => {
    const dot = resolveSwatchDot({ colorName: 'ROSSO, VERDE', bundleHandles: ['a', 'b'] });
    expect(dot).toMatch(/gradient/);
  });

  it('matches the glitter swatch by effect', () => {
    const dot = resolveSwatchDot({ effect: 'GLITTER' });
    expect(dot).toBeTruthy();
  });

  it('returns null when nothing matches', () => {
    expect(resolveSwatchDot({ colorName: 'NONEXISTENT' })).toBeNull();
    expect(resolveSwatchDot({})).toBeNull();
  });
});

describe('recent-search store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('remembers a query, newest first, and reads it back', () => {
    rememberSearch('rosso');
    rememberSearch('top coat');
    expect(getRecentSearches()).toEqual(['top coat', 'rosso']);
  });

  it('ignores queries shorter than 2 chars', () => {
    rememberSearch('a');
    expect(getRecentSearches()).toEqual([]);
  });

  it('dedups case/diacritic-insensitively, keeping the newest spelling first', () => {
    rememberSearch('Rosso');
    rememberSearch('nude');
    rememberSearch('rossò'); // same as "Rosso" after folding
    expect(getRecentSearches()).toEqual(['rossò', 'nude']);
  });

  it('caps at 6 entries', () => {
    for (const q of ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7']) rememberSearch(q);
    const recent = getRecentSearches();
    expect(recent.length).toBe(6);
    expect(recent[0]).toBe('q7');
    expect(recent).not.toContain('q1');
  });

  it('removes a single entry and clears all', () => {
    rememberSearch('rosso');
    rememberSearch('nude');
    removeRecentSearch('rosso');
    expect(getRecentSearches()).toEqual(['nude']);
    clearRecentSearches();
    expect(getRecentSearches()).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EDGE CASES — extended coverage below.
// ─────────────────────────────────────────────────────────────────────────────

describe('fold / tokens — edge cases', () => {
  it('folds a range of diacritics (grave/acute/circumflex/umlaut/tilde)', () => {
    expect(fold('àéîöñü')).toBe('aeionu');
    expect(fold('CAFFÈ Perù Çà')).toBe('caffe peru ca'); // ç→c only via its own path? see below
  });

  it('strips emoji / symbols / punctuation, keeping only the word', () => {
    // fold itself only lowercases + strips diacritics/apostrophes; tokens() drops
    // the rest down to alphanumeric words.
    expect(fold('💅 Rosso!!')).toBe('💅 rosso!!');
    expect(tokens('💅 Rosso!!')).toEqual(['rosso']);
    expect(tokens('Top—Coat / No·Wipe')).toEqual(['top', 'coat', 'no', 'wipe']);
  });

  it('drops the apostrophe so "O&Y"-style / possessive tokens fold cleanly', () => {
    expect(fold("L'été")).toBe('lete');
    expect(fold('D’Oro')).toBe('doro');
  });

  it('returns empty for null/undefined/empty/whitespace input', () => {
    expect(fold(undefined as unknown as string)).toBe('');
    expect(fold(null as unknown as string)).toBe('');
    expect(fold('')).toBe('');
    expect(tokens('')).toEqual([]);
    expect(tokens('   \t\n ')).toEqual([]);
    expect(tokens('!!! --- ...')).toEqual([]);
  });

  it('keeps digits as part of tokens', () => {
    expect(tokens('Gel 2in1 v2')).toEqual(['gel', '2in1', 'v2']);
  });
});

describe('token scoring tiers (whole-word > prefix > substring>3)', () => {
  // Minimal haystack products isolating each tier.
  const P: Matchable[] = [
    { id: 'whole', name: '', searchText: 'alpha bravo charlie' },
    { id: 'prefix', name: '', searchText: 'alphabet bravissimo' },
    { id: 'sub', name: '', searchText: 'xxalphaxx' }, // 'alpha' only as an inner substring
  ];

  it('ranks whole-word above prefix above inner-substring for the same token', () => {
    const r = matchProducts(P, 'alpha').map(p => p.id);
    // whole-word (score 3) first, then prefix (2), then substring>3 (1).
    expect(r).toEqual(['whole', 'prefix', 'sub']);
  });

  it('a 3-char token matches as whole-word / prefix but NOT as an inner substring', () => {
    // "oss" is only an inner substring of "rosso" (len 3, not > 3) → no hit.
    const only = matchProducts(
      [{ id: 'x', name: '', searchText: 'rosso' }],
      'oss',
    );
    expect(only).toEqual([]);
    // "osso" (len 4) IS a valid inner-substring match.
    const four = matchProducts(
      [{ id: 'x', name: '', searchText: 'rosso' }],
      'osso',
    );
    expect(four.map(p => p.id)).toEqual(['x']);
  });

  it('requires ALL tokens to contribute (AND semantics) — one miss zeroes the score', () => {
    const P2: Matchable[] = [{ id: 'p1', name: 'Semipermanente Rosso', searchText: 'semipermanente rosso' }];
    expect(matchProducts(P2, 'rosso semipermanente').map(p => p.id)).toEqual(['p1']);
    expect(matchProducts(P2, 'rosso verde')).toEqual([]); // "verde" absent → 0
  });
});

describe('COLOR_ALIAS_MAP crosswalk (EN / IT / catalogue)', () => {
  it('maps EN and IT colour words to the catalogue colour value', () => {
    expect(COLOR_ALIAS_MAP['red']).toContain('ROSSO');
    expect(COLOR_ALIAS_MAP['rosso']).toContain('ROSSO');
    expect(COLOR_ALIAS_MAP['grey']).toContain('GRIGIO');
    expect(COLOR_ALIAS_MAP['grigio']).toContain('GRIGIO');
  });

  it('maps alias names like "burgundy"/"bordo" to BORDEAUX', () => {
    expect(COLOR_ALIAS_MAP['burgundy']).toContain('BORDEAUX');
    expect(COLOR_ALIAS_MAP['bordo']).toContain('BORDEAUX');
  });

  it('surfaces an IT-named product via the EN alias even with no text match', () => {
    // A product whose only colour signal is colorName=BORDEAUX; "burgundy" is the
    // EN alias and appears nowhere in the haystack — the alias fallback must hit.
    const P: Matchable[] = [
      { id: 'b1', name: 'Smalto Scuro', searchText: 'smalto scuro elegante', colorName: 'BORDEAUX' },
    ];
    expect(matchProducts(P, 'burgundy').map(p => p.id)).toEqual(['b1']);
    // A non-colour, non-text query still misses.
    expect(matchProducts(P, 'verde')).toEqual([]);
  });
});

describe('buildVocab + correct() — typo correction edge cases', () => {
  const PRODUCTS2: Matchable[] = [
    { id: 'p1', name: 'Semipermanente Rosso', searchText: 'semipermanente rosso red' },
    { id: 'p3', name: 'Acrygel Nude', searchText: 'acrygel nude costruttore builder' },
  ];

  it('DELTA-1: non-product vocab words (corso) are KNOWN and never "corrected"', () => {
    // Without the extra words, "corso" could be snapped to a near product word.
    const vocab = buildVocab(PRODUCTS2, ['corso corsi formazione course academy']);
    expect(correct('corso', vocab)).toBeNull();
    expect(correct('corsi', vocab)).toBeNull();
    // But a genuine typo of that same extra word IS corrected to it.
    expect(correct('corsoo', vocab)).toBe('corso');
  });

  it('corrects a one-edit typo but respects the short-token distance=1 bound', () => {
    const vocab = buildVocab(PRODUCTS2);
    // 4-char token: max edit distance 1 → "nide" → "nude".
    expect(correct('nide', vocab)).toBe('nude');
    // A short token 2 edits away from everything is left untouched (returns null).
    expect(correct('zxq', vocab)).toBeNull();
  });

  it('leaves a query that is already a known prefix unchanged', () => {
    const vocab = buildVocab(PRODUCTS2);
    expect(correct('ros', vocab)).toBeNull(); // prefix of "rosso"
    expect(correct('rosso', vocab)).toBeNull();
  });

  it('returns null when nothing changed, a string when at least one token changed', () => {
    const vocab = buildVocab(PRODUCTS2);
    expect(correct('rosso nude', vocab)).toBeNull();
    // one good token + one typo → corrected string preserving the good token.
    expect(correct('rosso nide', vocab)).toBe('rosso nude');
  });
});

describe('levenshtein — bounds', () => {
  it('computes small edit distances', () => {
    expect(levenshtein('rosso', 'rosso')).toBe(0);
    expect(levenshtein('rosso', 'rossso')).toBe(1);
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('bails to 9 when the length gap already exceeds 2', () => {
    expect(levenshtein('a', 'abcdef')).toBe(9);
  });
});

describe('matchProductsWithFallback — corrected vs raw', () => {
  const PRODUCTS2: Matchable[] = [
    { id: 'p1', name: 'Semipermanente Rosso', searchText: 'semipermanente rosso red' },
    { id: 'p3', name: 'Acrygel Nude', searchText: 'acrygel nude costruttore builder' },
  ];
  const vocab = buildVocab(PRODUCTS2);

  it('returns raw results with no correction when the raw query already hits', () => {
    const res = matchProductsWithFallback(PRODUCTS2, 'rosso', vocab);
    expect(res.usedQuery).toBe('rosso');
    expect(res.correctedQuery).toBeNull();
    expect(res.results.map(p => p.id)).toEqual(['p1']);
  });

  it('falls back to the corrected query (and reports it) only when raw yields nothing', () => {
    const res = matchProductsWithFallback(PRODUCTS2, 'rossso', vocab);
    expect(res.correctedQuery).toBe('rosso');
    expect(res.usedQuery).toBe('rosso');
    expect(res.results.map(p => p.id)).toEqual(['p1']);
  });

  it('does NOT report a correction when even the corrected query finds nothing', () => {
    const res = matchProductsWithFallback(PRODUCTS2, 'zzzzxqwv', vocab);
    expect(res.results).toEqual([]);
    expect(res.correctedQuery).toBeNull();
    expect(res.usedQuery).toBe('zzzzxqwv');
  });

  it('treats an empty / whitespace query as a no-op (no correction, no results)', () => {
    for (const q of ['', '   ', '\t\n']) {
      const res = matchProductsWithFallback(PRODUCTS2, q, vocab);
      expect(res.results).toEqual([]);
      expect(res.correctedQuery).toBeNull();
      expect(res.usedQuery).toBe(q);
    }
  });
});

describe('matchProducts — degenerate queries', () => {
  const PRODUCTS2: Matchable[] = [
    { id: 'p1', name: 'Semipermanente Rosso', searchText: 'semipermanente rosso red' },
  ];

  it('returns [] for a very long junk query (no token contributes)', () => {
    expect(matchProducts(PRODUCTS2, 'z'.repeat(500))).toEqual([]);
  });

  it('tolerates a very long query that still contains a real token', () => {
    const q = `rosso ${'x'.repeat(400)}`;
    // "x…" contributes nothing and, under AND semantics, zeroes the score.
    expect(matchProducts(PRODUCTS2, q)).toEqual([]);
    // The real token alone still hits.
    expect(matchProducts(PRODUCTS2, 'rosso').map(p => p.id)).toEqual(['p1']);
  });

  it('returns [] when nothing matches', () => {
    expect(matchProducts(PRODUCTS2, 'verde').map(p => p.id)).toEqual([]);
  });
});

describe('highlightTokens — multi-token / overlap edge cases', () => {
  it('marks several distinct tokens across the string', () => {
    const segs = highlightTokens('Rosso e Rosa', 'rosso rosa');
    expect(segs.filter(s => s.mark).map(s => s.text)).toEqual(['Rosso', 'Rosa']);
    expect(segs.map(s => s.text).join('')).toBe('Rosso e Rosa');
  });

  it('dedups duplicate query tokens (no double-processing)', () => {
    const segs = highlightTokens('Rosso', 'rosso rosso rosso');
    expect(segs.filter(s => s.mark).map(s => s.text)).toEqual(['Rosso']);
  });

  it('matches the shorter of two overlapping prefix tokens at a boundary', () => {
    // "semi" and "semip" both start the word; the alternation marks one run.
    const segs = highlightTokens('Semipermanente', 'semi semip');
    expect(segs[0].mark).toBe(true);
    expect(segs.map(s => s.text).join('')).toBe('Semipermanente');
  });
});

describe('scoreSuggestion — edge cases', () => {
  const entry = { haystack: fold('rosso red bordeaux'), labelFold: fold('rosso') };

  it('returns 0 for an empty / whitespace query', () => {
    expect(scoreSuggestion(entry, '')).toBe(0);
    expect(scoreSuggestion(entry, '   ')).toBe(0);
  });

  it('rewards a full-label prefix more than a partial-haystack hit', () => {
    const labelPrefix = scoreSuggestion(entry, 'rosso'); // whole label prefix bonus
    const haystackOnly = scoreSuggestion(entry, 'bordeaux'); // only in aliases
    expect(labelPrefix).toBeGreaterThan(haystackOnly);
  });
});
