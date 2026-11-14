import { render, screen } from '@testing-library/react';
import { describe, expect, it as test, vi } from 'vitest';

// ---------------------------------------------------------------------------
// ShippingPage FAQ + processing-time copy guards.
//
//  - m75: the FAQ accordion must surface the Art. 59 "products that can't be
//    returned" exclusion as its own (last) item and must NOT surface a
//    "Contatti"/"Contact" accordion (contacts live in the closing panel).
//  - m76: Step 02's processing time and the delivery-times FAQ body must be
//    consistent — both expressed as the [[1–2]] placeholder (single source).
// ---------------------------------------------------------------------------

// The real i18n dict is heavy and not the thing under test; a passthrough t()
// that still interpolates nothing lets us read raw keys where irrelevant while
// the step bodies we DO assert on come from the real dict below.
import { en } from '../i18n/en';
import { it as itDict } from '../i18n/it';

let lang: 'it' | 'en' = 'it';
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    language: lang,
    t: (k: string) => (lang === 'en' ? en : itDict)[k] ?? k,
  }),
}));

vi.mock('../lib/useSeo', () => ({ useSeo: () => {} }));
vi.mock('../lib/shippingZones', () => ({
  useShippingRates: () => [],
  useMinFreeThreshold: () => 199,
}));
vi.mock('../hooks/useStoreContent', () => ({ useStoreSetting: () => '' }));
vi.mock('../lib/whatsapp', () => ({
  waLinkWithText: () => 'https://wa.me/x',
  WHOLESALE_EMAIL: 'primonailspro@gmail.com',
  WHATSAPP_FALLBACK: 'https://wa.me/393893193049',
}));
vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

import { ShippingPage } from './ShippingPage';
import { SHIPPING } from '../data/legal';

function summaries(): string[] {
  // Each FAQ item is a <details><summary>…</summary>; read the heading text,
  // stripping the trailing "+" toggle glyph / whitespace.
  return screen.getAllByRole('group').map((d) => {
    const summary = d.querySelector('summary');
    return (summary?.textContent ?? '').trim();
  });
}

describe('ShippingPage FAQ item set (m75)', () => {
  for (const locale of ['it', 'en'] as const) {
    test(`${locale}: last FAQ item is the Art. 59 exclusion, not Contatti`, () => {
      lang = locale;
      const { unmount } = render(<ShippingPage />);
      const heads = summaries();

      const exclusion =
        locale === 'en' ? "Products that can't be returned" : 'Prodotti che non si possono rendere';
      const contact = locale === 'en' ? 'Contact' : 'Contatti';

      // The exclusion item is present and is the LAST FAQ item.
      expect(heads).toContain(exclusion);
      expect(heads[heads.length - 1]).toBe(exclusion);

      // No standalone Contatti/Contact accordion, and no leftover costs item.
      expect(heads).not.toContain(contact);
      expect(heads.some((h) => /costi|costs/i.test(h))).toBe(false);

      // Prototype FAQ has exactly 7 items.
      expect(heads).toHaveLength(7);
      unmount();
    });
  }
});

describe('processing-time single source (m76)', () => {
  for (const [locale, dict] of [
    ['it', itDict],
    ['en', en],
  ] as const) {
    test(`${locale}: Step 02 body uses the [[1–2]] placeholder`, () => {
      expect(dict['shipping.step2Body']).toContain('[[1–2]]');
      // No bare "1–2" left outside the marker.
      expect(dict['shipping.step2Body'].replace('[[1–2]]', '')).not.toContain('1–2');
    });

    test(`${locale}: delivery-times FAQ body uses the SAME [[1–2]] placeholder`, () => {
      const doc = locale === 'en' ? SHIPPING.en : SHIPPING.it;
      const bodies = doc.sections.flatMap((s) =>
        s.body.flatMap((b) => (typeof b === 'string' ? [b] : b.list)),
      );
      expect(bodies.some((b) => b.includes('[[1–2]]'))).toBe(true);
    });
  }

  test('both locales render Step 02 as a highlighted <mark>, not literal brackets', () => {
    for (const locale of ['it', 'en'] as const) {
      lang = locale;
      const { container, unmount } = render(<ShippingPage />);
      const marks = Array.from(container.querySelectorAll('mark')).map((m) => m.textContent);
      expect(marks).toContain('[[1–2]]');
      unmount();
    }
  });
});
