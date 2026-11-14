import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProductCard } from './ProductCard';
import type { Product } from '../types';

// ProductCard EDGE CASES — the card's OWN surface (sale pill B6, its own
// ADD TO CART pill + handler, swatch rows, badge priority, out-of-stock),
// complementing ProductCard.picsum (media) + ProductCard.quickview (modal).
// Contexts are mocked like the sibling card tests so the suite stays offline.
const addToCart = vi.fn();

// A populated catalogue so the shade-sibling / kit-child rows can resolve.
let CATALOGUE: Product[] = [];

vi.mock('../context/CartContext', () => ({
  useCart: () => ({ addToCart }),
}));
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'it',
    setLanguage: vi.fn(),
    t: (k: string, vars?: Record<string, unknown>) =>
      vars && 'name' in vars ? `${k}:${vars.name}` : k,
  }),
}));
vi.mock('../context/ProductContext', () => ({
  useProducts: () => ({ products: CATALOGUE }),
}));
vi.mock('../hooks/useStoreContent', () => ({
  useStoreSetting: <T,>(_key: string, fallback: T) => fallback,
}));

const makeProduct = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    name: 'Gel Rosso',
    handle: 'gel-rosso',
    price: '12',
    category: 'Smalti',
    image: 'https://cdn.test/gel.jpg',
    ...over,
  } as Product);

const renderCard = (over: Partial<Product> = {}) =>
  render(
    <MemoryRouter>
      <ProductCard product={makeProduct(over)} />
    </MemoryRouter>
  );

// The card's OWN add-to-cart button lives in the card (not the modal); its label
// is the uppercased i18n key under the mock t() → "PRODUCT.ADDTOCARTCARD".
const addBtn = () =>
  screen.getByRole('button', { name: 'PRODUCT.ADDTOCARTCARD' });

describe('ProductCard edge cases', () => {
  beforeEach(() => {
    addToCart.mockClear();
    CATALOGUE = [];
  });

  describe('sale pill (B6 — only a genuine discount renders)', () => {
    it('renders the red % sale pill for a strictly-higher original', () => {
      renderCard({ price: '8', originalPrice: '10' });
      // round((1 - 8/10) * 100) = 20%.
      expect(screen.getByText('20%')).toBeInTheDocument();
    });

    it('renders NO sale pill when the original equals the current price', () => {
      renderCard({ price: '10', originalPrice: '10' });
      expect(screen.queryByText(/%$/)).toBeNull();
    });

    it('renders NO sale pill when the original is LOWER than the current price', () => {
      renderCard({ price: '12', originalPrice: '10' });
      expect(screen.queryByText(/%$/)).toBeNull();
    });

    it('renders NO sale pill for a zero / malformed original', () => {
      const { rerender } = renderCard({ price: '8', originalPrice: '0' });
      expect(screen.queryByText(/%$/)).toBeNull();
      rerender(
        <MemoryRouter>
          <ProductCard product={makeProduct({ price: '8', originalPrice: 'abc' })} />
        </MemoryRouter>
      );
      expect(screen.queryByText(/%$/)).toBeNull();
      expect(screen.queryByText(/NaN/)).toBeNull();
    });
  });

  describe('badge priority — sale pill over the admin-configured badge', () => {
    it('shows the sale pill (not the NEW badge) when the product is both on sale AND badged', () => {
      renderCard({ price: '8', originalPrice: '10', badge: 'NEW' });
      // The computed sale pill wins the top-left slot.
      expect(screen.getByText('20%')).toBeInTheDocument();
      // The admin badge label ("NOVITÀ" for NEW/it) is NOT rendered.
      expect(screen.queryByText('NOVITÀ')).toBeNull();
    });

    it('falls back to the admin badge when there is no genuine discount', () => {
      renderCard({ badge: 'NEW' });
      // resolveBadge → NEW → Italian label "NOVITÀ".
      expect(screen.getByText('NOVITÀ')).toBeInTheDocument();
      expect(screen.queryByText(/%$/)).toBeNull();
    });

    it('renders no badge layer at all when neither a sale nor a badge is present', () => {
      renderCard();
      expect(screen.queryByText('NOVITÀ')).toBeNull();
      expect(screen.queryByText(/%$/)).toBeNull();
    });
  });

  describe('ADD TO CART pill + handler', () => {
    it("adds ONE unit of the card's product via the shared handler", () => {
      renderCard();
      fireEvent.click(addBtn());
      expect(addToCart).toHaveBeenCalledTimes(1);
      expect(addToCart).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
        1
      );
    });

    it('flashes the "added ✓" label after adding', () => {
      renderCard();
      fireEvent.click(addBtn());
      // Button relabels to the uppercased "added" key with a check icon.
      expect(
        screen.getByRole('button', { name: 'PRODUCT.ADDED' })
      ).toBeInTheDocument();
    });
  });

  describe('out-of-stock / backorder', () => {
    it('disables the pill and shows the out-of-stock label when inStock===false', () => {
      renderCard({ inStock: false });
      const btn = screen.getByRole('button', { name: 'PRODUCT.OUTOFSTOCK' });
      expect(btn).toBeDisabled();
      // Clicking the disabled control does nothing.
      fireEvent.click(btn);
      expect(addToCart).not.toHaveBeenCalled();
    });

    it('treats a backorder-allowed product (inStock undefined / true) as buyable', () => {
      // inStock is only ever `false` when depleted AND backorders are off; an
      // undefined/true flag means it can be ordered (incl. backorder).
      renderCard({ inStock: undefined });
      const btn = addBtn();
      expect(btn).not.toBeDisabled();
      fireEvent.click(btn);
      expect(addToCart).toHaveBeenCalledTimes(1);
    });
  });

  describe('swatch rows', () => {
    it('renders a single own-swatch circle for a product with a swatchImage and no family', () => {
      renderCard({ swatchImage: 'https://cdn.test/sw.jpg' });
      const sw = screen.getByRole('img', { name: 'Gel Rosso — a11y.shade' });
      expect(sw).toHaveStyle({
        backgroundImage: 'url(https://cdn.test/sw.jpg)',
      });
    });

    it('renders a shade-sibling SwatchGroup (and switches the active product on pick)', () => {
      // Two same-colour shade siblings → the card shows a chooser row and the
      // ATC/price re-bind to the picked sibling.
      const siblingA = makeProduct({
        id: 'red-a',
        name: 'Rosso A',
        handle: 'rosso-a',
        hasShade: true,
        colorName: 'Rosso',
        swatchImage: 'https://cdn.test/a.jpg',
      });
      const siblingB = makeProduct({
        id: 'red-b',
        name: 'Rosso B',
        handle: 'rosso-b',
        hasShade: true,
        colorName: 'Rosso',
        swatchImage: 'https://cdn.test/b.jpg',
      });
      CATALOGUE = [siblingA, siblingB];
      render(
        <MemoryRouter>
          <ProductCard product={siblingA} />
        </MemoryRouter>
      );
      const group = screen.getByRole('radiogroup', {
        name: 'a11y.chooseShade:Rosso',
      });
      const swatches = within(group).getAllByRole('radio');
      expect(swatches).toHaveLength(2);
      // Pick sibling B → the card's ATC now adds sibling B.
      const picks = within(group).getAllByRole('radio');
      fireEvent.click(picks[1]);
      fireEvent.click(addBtn());
      expect(addToCart).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'red-b' }),
        1
      );
    });

    it('keeps the shade swatches packed to the left on every width', () => {
      const a = makeProduct({ id: 'g-a', name: 'Grigio A', handle: 'grigio-a', hasShade: true, colorName: 'Grigio' });
      const b = makeProduct({ id: 'g-b', name: 'Grigio B', handle: 'grigio-b', hasShade: true, colorName: 'Grigio' });
      CATALOGUE = [a, b];
      render(
        <MemoryRouter>
          <ProductCard product={a} />
        </MemoryRouter>
      );
      const group = screen.getByRole('radiogroup', { name: 'a11y.chooseShade:Grigio' });
      // Two shades must sit side by side, not spread to the card's two edges.
      expect(group.className).toContain('justify-start');
      expect(group.className).not.toMatch(/justify-between/);
    });

    it('renders kit-child swatches in place of the swatch row for a bundle', () => {
      const childA = makeProduct({ id: 'c-a', name: 'Child A', handle: 'child-a', swatchImage: 'https://cdn.test/ca.jpg' });
      const childB = makeProduct({ id: 'c-b', name: 'Child B', handle: 'child-b', swatchImage: 'https://cdn.test/cb.jpg' });
      CATALOGUE = [childA, childB];
      render(
        <MemoryRouter>
          <ProductCard
            product={makeProduct({
              id: 'kit',
              name: 'Kit',
              handle: 'kit',
              bundleHandles: ['child-a', 'child-b'],
            })}
          />
        </MemoryRouter>
      );
      // Each kit child is a link to its own page (with ?from-kit).
      expect(screen.getByRole('link', { name: 'Child A' })).toHaveAttribute(
        'href',
        '/product/child-a?from-kit=kit'
      );
      expect(screen.getByRole('link', { name: 'Child B' })).toHaveAttribute(
        'href',
        '/product/child-b?from-kit=kit'
      );
    });

    it('collapses a long shade row behind a "+N" chip that expands it', () => {
      const shades = Array.from({ length: 10 }, (_, i) =>
        makeProduct({
          id: `red-${i}`,
          name: `Rosso ${i}`,
          handle: `rosso-${i}`,
          hasShade: true,
          colorName: 'Rosso',
          swatchImage: `https://cdn.test/${i}.jpg`,
        })
      );
      CATALOGUE = shades;
      render(
        <MemoryRouter>
          <ProductCard product={shades[0]} />
        </MemoryRouter>
      );
      const group = () =>
        screen.getByRole('radiogroup', { name: 'a11y.chooseShade:Rosso' });
      // Collapsed: every shade renders; CSS keeps 5 visible on desktop (one row)
      // and the chip counts what's past the visible slots: 5 on desktop, 6 on
      // rail cards (4 shades), 7 on narrow ones (3 shades).
      const radios = within(group()).getAllByRole('radio');
      expect(radios).toHaveLength(10);
      expect(radios.filter((r) => !/(^|\s)lg:hidden/.test(r.className))).toHaveLength(5);
      const chip = screen.getByRole('link', { name: /collections\.moreShades/ });
      expect(within(chip).getByText('+5').className).toContain('lg:inline');
      expect(within(chip).getByText('+6').className).toContain('@max-[230px]:hidden');
      expect(within(chip).getByText('+7').className).toContain('hidden max-lg:@max-[230px]:inline');
      // The visible count stays in the accessible name (WCAG 2.5.3).
      expect(chip).toHaveAccessibleName(/\+6/);
      // The chip is a link to the product page (all colours are shown there);
      // it does not expand the row in place.
      expect(chip.tagName).toBe('A');
      expect(chip).toHaveAttribute('href', '/product/rosso-0');
      expect(within(group()).getAllByRole('radio')).toHaveLength(10);
    });

    it("never hides the card's own shade on phones when it sits past slot 4", () => {
      const shades = Array.from({ length: 10 }, (_, i) =>
        makeProduct({
          id: `rosa-${i}`,
          name: `Rosa ${i}`,
          handle: `rosa-${i}`,
          hasShade: true,
          colorName: 'Rosa',
          swatchImage: `https://cdn.test/r${i}.jpg`,
        })
      );
      CATALOGUE = shades;
      render(
        <MemoryRouter>
          <ProductCard product={shades[6]} />
        </MemoryRouter>
      );
      const radios = screen.getAllByRole('radio');
      const active = radios.find((r) => r.getAttribute('aria-checked') === 'true')!;
      expect(active).toHaveAccessibleName(/^Rosa 6/);
      expect(active.className).not.toContain('max-lg:hidden');
      // Still exactly 4 shades visible on rail cards, 3 on narrow cards.
      expect(radios.filter((r) => !r.className.includes('max-lg:hidden'))).toHaveLength(4);
      expect(radios.filter((r) => !/max-lg:(@max-\[230px\]:)?hidden/.test(r.className))).toHaveLength(3);
      expect(active.className).not.toMatch(/max-lg:(@max-\[230px\]:)?hidden/);
    });

    it("keeps the card's own shade visible on desktop even past the 5-swatch row", () => {
      const shades = Array.from({ length: 10 }, (_, i) =>
        makeProduct({
          id: `bl-${i}`,
          name: `Blu ${i}`,
          handle: `blu-${i}`,
          hasShade: true,
          colorName: 'Blu',
          swatchImage: `https://cdn.test/bl${i}.jpg`,
        })
      );
      CATALOGUE = shades;
      render(
        <MemoryRouter>
          <ProductCard product={shades[9]} />
        </MemoryRouter>
      );
      const radios = screen.getAllByRole('radio');
      const active = radios.find((r) => r.getAttribute('aria-checked') === 'true')!;
      expect(active).toHaveAccessibleName(/^Blu 9/);
      expect(active.className).not.toContain('max-lg:hidden');
      // Desktop: 5 swatches in one row; the own shade takes the last visible slot.
      expect(active.className).not.toContain('lg:hidden');
      expect(radios.filter((r) => !/(^|\s)lg:hidden/.test(r.className))).toHaveLength(5);
      expect(radios.filter((r) => !r.className.includes('max-lg:hidden'))).toHaveLength(4);
    });

    it('collapses a long kit row behind the chip too', () => {
      const kids = Array.from({ length: 7 }, (_, i) =>
        makeProduct({ id: `k-${i}`, name: `Kid ${i}`, handle: `kid-${i}`, swatchImage: `https://cdn.test/k${i}.jpg` })
      );
      CATALOGUE = kids;
      render(
        <MemoryRouter>
          <ProductCard
            product={makeProduct({ id: 'kit', name: 'Kit', handle: 'kit', bundleHandles: kids.map((k) => k.handle!) })}
          />
        </MemoryRouter>
      );
      // Desktop shows every kit child; phones hide the ones past slot 4.
      expect(screen.getByRole('link', { name: 'Kid 6' }).className).toContain('max-lg:hidden');
      expect(screen.getByRole('link', { name: 'Kid 3' }).className).not.toContain('max-lg:hidden');
      // The chip is a link to the kit page (all shades are listed there).
      expect(screen.getByRole('link', { name: /collections\.moreShades/ })).toHaveAttribute('href', '/product/kit');
    });

    it('keeps the out-of-stock label visible on phones (not just a faded "+")', () => {
      renderCard({ inStock: false });
      const label = screen.getByText('PRODUCT.OUTOFSTOCK');
      expect(label.className).not.toContain('sr-only');
    });

    it('shows a 5-shade row whole on rail cards and 3 + chip on narrow cards', () => {
      const shades = Array.from({ length: 5 }, (_, i) =>
        makeProduct({
          id: `blu-${i}`,
          name: `Blu ${i}`,
          handle: `blu-${i}`,
          hasShade: true,
          colorName: 'Blu',
          swatchImage: `https://cdn.test/b${i}.jpg`,
        })
      );
      CATALOGUE = shades;
      render(
        <MemoryRouter>
          <ProductCard product={shades[0]} />
        </MemoryRouter>
      );
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(5);
      // Nothing is hidden on rail cards…
      expect(radios.filter((r) => r.className.includes('max-lg:hidden'))).toHaveLength(0);
      // …and the chip exists only for the narrow layout, counting "+2".
      const chip = screen.getByRole('link', { name: /collections\.moreShades/ });
      expect(chip.className).toContain('hidden max-lg:@max-[230px]:grid');
      expect(chip).toHaveTextContent('+2');
      expect(radios.filter((r) => r.className.includes('max-lg:@max-[230px]:hidden'))).toHaveLength(2);
    });

    it('gives search cards the catalogue swatch sizes, with a 5-slot row when narrow', () => {
      const shades = Array.from({ length: 8 }, (_, i) =>
        makeProduct({
          id: `red-${i}`,
          name: `Red ${i}`,
          handle: `red-${i}`,
          hasShade: true,
          colorName: 'Red',
          swatchImage: `https://cdn.test/r${i}.jpg`,
        })
      );
      CATALOGUE = shades;
      render(
        <MemoryRouter>
          <ProductCard product={shades[0]} highlightQuery="red" onNavigate={() => {}} />
        </MemoryRouter>
      );
      const radios = screen.getAllByRole('radio');
      // Same desktop sizes as the catalogue card: 30px selected, 26px others.
      expect(radios[0].className).toContain('lg:h-[30px] lg:w-[30px]');
      expect(radios[1].className).toContain('lg:h-[26px] lg:w-[26px]');
      expect(radios.some((r) => r.className.includes('lg:h-[22px]'))).toBe(false);
      // Wide search cards: 5 circles + "+3" (as the catalogue); narrow ones: 4 + "+4".
      expect(radios.filter((r) => /(^| )lg:hidden/.test(r.className))).toHaveLength(3);
      expect(radios.filter((r) => /(^| )lg:@max-\[230px\]:hidden/.test(r.className))).toHaveLength(1);
      const chip = screen.getByRole('link', { name: /collections\.moreShades/ });
      expect(chip.className).toContain('lg:grid');
      expect(chip.className).toContain('lg:w-[26px]');
      expect(chip.className).not.toMatch(/(^| )@max-\[230px\]:w-\[22px\]/);
      expect(chip).toHaveTextContent('+3');
      expect(chip).toHaveTextContent('+4');
    });
  });
});
