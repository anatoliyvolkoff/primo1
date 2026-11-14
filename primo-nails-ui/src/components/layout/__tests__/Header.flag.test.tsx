import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Language } from '../../../i18n';

// Mutable so each case can drive the active language the header reads.
const langState: { current: Language } = { current: 'it' };

vi.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({
    language: langState.current,
    setLanguage: (l: Language) => {
      langState.current = l;
    },
    t: (k: string) => k,
  }),
}));

vi.mock('../../../context/CartContext', () => ({
  useCart: () => ({
    isCartOpen: false,
    setIsCartOpen: () => {},
    isSearchOpen: false,
    setIsSearchOpen: () => {},
    cartCount: 0,
  }),
}));

// Neutralise the heavy child overlays — this test only cares about the flag glyph.
vi.mock('../header/CartSidebar', () => ({ CartSidebar: () => null }));
vi.mock('../header/SearchOverlay', () => ({ SearchOverlay: () => null }));
vi.mock('../header/MobileMenu', () => ({ MobileMenu: () => null }));

// `motion` scroll hooks need no real scroll container here.
vi.mock('motion/react', () => ({
  useScroll: () => ({ scrollY: { get: () => 0 } }),
  useMotionValueEvent: () => {},
}));

import { Header } from '../Header';

function renderHeader(language: Language) {
  langState.current = language;
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

// The picker follows Pattern A (show the ACTIVE language's flag). The Italian
// tricolor uses the official green `#009246`; the EN flag is an SVG Union Jack.
function flagGlyph() {
  // The decorative flag wrapper is the aria-hidden span before the label.
  return document.querySelector<HTMLElement>('span[aria-hidden="true"]');
}

describe('Header language flag', () => {
  it('shows the Italian tricolor when IT is active', () => {
    const { container } = renderHeader('it');
    const glyph = flagGlyph();
    expect(glyph?.innerHTML).toContain('#009246'); // Italian green stripe
    expect(container.querySelector('svg[viewBox="0 0 60 30"]')).toBeNull(); // no UK flag
  });

  it('shows the UK flag (not the Italian one) when EN is active', () => {
    const { container } = renderHeader('en');
    // Union Jack SVG present…
    expect(container.querySelector('svg[viewBox="0 0 60 30"]')).not.toBeNull();
    // …and the Italian tricolor stripes are NOT rendered (the reported bug).
    const glyph = flagGlyph();
    expect(glyph?.innerHTML).not.toContain('#009246');
  });

  it('shows the active language label in the trigger (both directions)', () => {
    renderHeader('it');
    expect(screen.getAllByText('IT').length).toBeGreaterThan(0);
    cleanup();
    renderHeader('en');
    expect(screen.getAllByText('EN').length).toBeGreaterThan(0);
  });
});
