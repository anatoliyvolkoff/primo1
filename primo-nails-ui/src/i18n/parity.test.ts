import { describe, expect, it as test } from 'vitest';

import { en } from './en';
import { it } from './it';

/**
 * Deeply flatten an object's key paths into dotted strings.
 *
 * The i18n dictionaries currently use FLAT objects whose keys already contain
 * dots (e.g. `'nav.gel.all'`). This flattener is nesting-agnostic: for the flat
 * shape it returns those keys verbatim, and if a future translation ever nests
 * sub-objects it will recurse into them so nested gaps are still caught.
 * Arrays are treated as leaf values (a missing/extra array key is what matters,
 * not its contents).
 */
function flattenKeys(
  obj: Record<string, unknown>,
  prefix = '',
  out: string[] = [],
): string[] {
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenKeys(value as Record<string, unknown>, path, out);
    } else {
      out.push(path);
    }
  }
  return out;
}

describe('i18n en/it key parity', () => {
  const enKeys = new Set(flattenKeys(en as Record<string, unknown>));
  const itKeys = new Set(flattenKeys(it as Record<string, unknown>));

  // Guard against a vacuous test: both dictionaries must be non-trivially populated.
  test('both dictionaries are non-empty', () => {
    expect(enKeys.size).toBeGreaterThan(50);
    expect(itKeys.size).toBeGreaterThan(50);
  });

  test('en and it expose the SAME set of (deeply-flattened) keys', () => {
    const missingInEn = [...itKeys].filter((k) => !enKeys.has(k)).sort();
    const missingInIt = [...enKeys].filter((k) => !itKeys.has(k)).sort();

    const detail = [
      missingInEn.length
        ? `Keys in it but MISSING in en (${missingInEn.length}): ${JSON.stringify(missingInEn)}`
        : '',
      missingInIt.length
        ? `Keys in en but MISSING in it (${missingInIt.length}): ${JSON.stringify(missingInIt)}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    expect(
      { missingInEn, missingInIt },
      `en/it translation key sets differ.\n${detail}`,
    ).toEqual({ missingInEn: [], missingInIt: [] });
  });
});

describe('VAT-rate strings interpolate the rate (ARCH-002)', () => {
  // These must render the rate via {{rate}} (driven by the vat_rate_percent
  // setting), never a hardcoded number — else a VAT change shows the wrong % copy.
  const dicts: Record<string, Record<string, string>> = { en, it };
  for (const key of ['cart.vatNote', 'checkout.vatIncluded']) {
    for (const [locale, dict] of Object.entries(dicts)) {
      test(`${locale} ${key} uses {{rate}} and no bare percentage`, () => {
        const s = dict[key];
        expect(s).toContain('{{rate}}');
        expect(s).not.toMatch(/\d+\s*%/);
      });
    }
  }
});
