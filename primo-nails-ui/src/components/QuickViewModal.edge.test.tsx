import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QuickViewModal } from './QuickViewModal';
import type { Product } from '../types';

// QuickViewModal EDGE CASES — the three option-selector shapes (season-kit tabs,
// size chips, plain product), one-open-at-a-time accordions, the gallery B7 NaN
// guard, and that switching a size/season re-binds the price (complements
// QuickViewModal.shades B5 + ProductCard.quickview for the shared paths).

let CATALOGUE: Product[] = [];

vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'it',
    setLanguage: vi.fn(),
    t: (k: string, vars?: Record<string, unknown>) =>
      vars && 'name' in vars ? `${k}:${vars.name}` : k,
  }),
}));
const mockAddToCart = vi.fn();
vi.mock('../context/CartContext', () => ({ useCart: () => ({ addToCart: mockAddToCart }) }));
vi.mock('../context/ProductContext', () => ({
  useProducts: () => ({ products: CATALOGUE }),
}));
vi.mock('../hooks/useStoreContent', () => ({
  useStoreSetting: <T,>(_key: string, fallback: T) => fallback,
}));

const makeProduct = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    name: 'Prodotto',
    handle: 'prodotto',
    price: '12',
    category: 'Cat',
    image: 'https://cdn.test/p.jpg',
    description: 'Descrizione del prodotto.',
    ...over,
  } as Product);

const onPickSibling = vi.fn();
const onAddToCart = vi.fn();
const onClose = vi.fn();

const renderModal = (
  product: Product,
  extra: Partial<React.ComponentProps<typeof QuickViewModal>> = {}
) =>
  render(
    <MemoryRouter>
      <QuickViewModal
        product={product}
        bundleChildren={extra.bundleChildren ?? []}
        shadeSiblings={extra.shadeSiblings ?? []}
        open
        onClose={onClose}
        onAddToCart={onAddToCart}
        isAdded={extra.isAdded ?? false}
        onPickSibling={onPickSibling}
      />
    </MemoryRouter>
  );

describe('QuickViewModal edge cases', () => {
  beforeEach(() => {
    CATALOGUE = [];
    onPickSibling.mockClear();
    onAddToCart.mockClear();
    onClose.mockClear();
  });

  describe('option-selector shape depends on the product', () => {
    // A ≥2-size family (same name + category, each with a capacity) → size chips.
    const buildSizeFamily = () => {
      const small = makeProduct({
        id: 'ce-100',
        name: 'Cleaner Emotion',
        handle: 'cleaner-100',
        category: 'Detergenti',
        capacity: '100 ml',
        price: '8',
        priceAmount: 8,
      });
      const large = makeProduct({
        id: 'ce-1000',
        name: 'Cleaner Emotion',
        handle: 'cleaner-1000',
        category: 'Detergenti',
        capacity: '1000 ml',
        price: '40',
        priceAmount: 40,
      });
      CATALOGUE = [small, large];
      return { small, large };
    };

    // The four seasonal kits → season tabs.
    const buildSeasonKits = () => {
      const mk = (handle: string, name: string): Product =>
        makeProduct({ id: handle, handle, name, bundleHandles: ['x'] });
      CATALOGUE = [
        mk('kit-winter-collection', 'Winter'),
        mk('kit-spring-collection', 'Spring'),
        mk('kit-summer-collection', 'Summer'),
        mk('kit-autumn-collection', 'Autumn'),
      ];
      return CATALOGUE;
    };

    it('a ≥2-size family renders selectable SIZE chips (Cleaner Emotion 100/1000 ml)', () => {
      const { small } = buildSizeFamily();
      renderModal(small);
      const dialog = screen.getByRole('dialog');
      const group = within(dialog).getByRole('group', { name: 'product.format' });
      const chips = within(group).getAllByRole('button');
      expect(chips.map((c) => c.textContent)).toEqual(['100 ml', '1000 ml']);
      // The active (100 ml) chip is pressed.
      expect(chips[0]).toHaveAttribute('aria-pressed', 'true');
      expect(chips[1]).toHaveAttribute('aria-pressed', 'false');
    });

    it('picking another size chip re-binds via onPickSibling (price follows)', () => {
      const { small, large } = buildSizeFamily();
      renderModal(small);
      const dialog = screen.getByRole('dialog');
      // On-open the price is the small one (8,00).
      expect(within(dialog).getByText(/8/)).toBeTruthy();
      const chips = within(
        within(dialog).getByRole('group', { name: 'product.format' })
      ).getAllByRole('button');
      fireEvent.click(chips[1]);
      // The modal does not own the active product; it asks the parent to swap.
      expect(onPickSibling).toHaveBeenCalledWith(
        expect.objectContaining({ id: large.id })
      );
      // Clicking the already-active chip is a no-op.
      onPickSibling.mockClear();
      fireEvent.click(chips[0]);
      expect(onPickSibling).not.toHaveBeenCalled();
    });

    it('a kit (one of the four seasonal collections) renders the SEASON tabs', () => {
      const kits = buildSeasonKits();
      renderModal(kits[0], { bundleChildren: [makeProduct({ id: 'x', name: 'x', handle: 'x' })] });
      const dialog = screen.getByRole('dialog');
      const tablist = within(dialog).getByRole('tablist');
      const tabs = within(tablist).getAllByRole('tab');
      expect(tabs).toHaveLength(4);
      // The active season (winter) is selected; no size chips are shown.
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(within(dialog).queryByRole('group', { name: 'product.format' })).toBeNull();
    });

    it('phones: season tabs sit in the bottom bar with Add to cart, and the close button is single', () => {
      const original = window.matchMedia;
      window.matchMedia = vi.fn().mockImplementation((q: string) => ({
        matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
      })) as unknown as typeof window.matchMedia;
      try {
        const kits = buildSeasonKits();
        renderModal(kits[0], { bundleChildren: [makeProduct({ id: 'x', name: 'x', handle: 'x' })] });
        const dialog = screen.getByRole('dialog');
        const tablists = within(dialog).getAllByRole('tablist');
        expect(tablists).toHaveLength(1);
        const bar = tablists[0].closest('.sticky');
        expect(bar).not.toBeNull();
        expect(within(bar as HTMLElement).getByText('pdp.addToCart')).toBeTruthy();
        expect(within(dialog).getAllByRole('button', { name: 'search.close' })).toHaveLength(1);
      } finally {
        window.matchMedia = original;
      }
    });

    it('tablet and desktop: season tabs stay in the header row, next to the close button', () => {
      const kits = buildSeasonKits();
      renderModal(kits[0], { bundleChildren: [makeProduct({ id: 'x', name: 'x', handle: 'x' })] });
      const dialog = screen.getByRole('dialog');
      const tablist = within(dialog).getByRole('tablist');
      expect(tablist.closest('.sticky')).toBeNull();
      expect(tablist.parentElement).toContainElement(within(dialog).getByRole('button', { name: 'search.close' }));
    });

    it('every season tab glows in its own season colour', () => {
      const kits = buildSeasonKits();
      renderModal(kits[0], { bundleChildren: [makeProduct({ id: 'x', name: 'x', handle: 'x' })] });
      const tabs = within(screen.getByRole('tablist')).getAllByRole('tab');
      const glowByLabel = Object.fromEntries(tabs.map((tab) => [tab.textContent, tab.getAttribute('data-glow')]));
      expect(glowByLabel).toEqual({
        'collections.season.autumn': '#c8742d',
        'collections.season.winter': '#2f80e9',
        'collections.season.spring': '#e5668f',
        'collections.season.summer': '#44c232',
      });
      tabs.forEach((tab) => expect(tab.style.getPropertyValue('--glow')).toBe(tab.getAttribute('data-glow')));
    });

    it('clicking another season tab re-binds via onPickSibling', () => {
      const kits = buildSeasonKits();
      renderModal(kits[0], { bundleChildren: [makeProduct({ id: 'x', name: 'x', handle: 'x' })] });
      const tabs = within(screen.getByRole('tablist')).getAllByRole('tab');
      fireEvent.click(tabs[2]); // summer
      expect(onPickSibling).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'kit-summer-collection' })
      );
    });

    it('a plain product renders NEITHER size chips NOR season tabs', () => {
      renderModal(makeProduct({ capacity: undefined }));
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).queryByRole('tablist')).toBeNull();
      expect(within(dialog).queryByRole('group', { name: 'product.format' })).toBeNull();
    });

    it('a single-capacity product shows the static format pill (not a chooser)', () => {
      renderModal(makeProduct({ capacity: '12 ml' }));
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('12 ml')).toBeTruthy();
      // No multi-chip group when there is no ≥2-size family.
      expect(within(dialog).queryByRole('group', { name: 'product.format' })).toBeNull();
    });

    it('the single size pill shares the title row, and the price sits below the shades', () => {
      renderModal(makeProduct({ capacity: '12 ml', swatchImage: 'https://cdn.test/s.jpg' }));
      const dialog = screen.getByRole('dialog');
      const title = within(dialog).getByRole('heading', { level: 2 });
      expect(title.parentElement?.textContent).toContain('12 ml');
      const shades = within(dialog).getByRole('group', { name: 'product.availableColors' });
      const price = within(dialog).getByText(/12/, { selector: 'span:not(.grid)' });
      // DOCUMENT_POSITION_FOLLOWING: the price comes after the shades in reading order.
      expect(shades.compareDocumentPosition(price) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe('accordions open one at a time', () => {
    it('opening a second accordion closes the first (single-open)', () => {
      renderModal(
        makeProduct({
          description: 'Corpo descrizione.',
          application: 'Corpo applicazione.',
          ingredients: 'Corpo ingredienti.',
        })
      );
      const dialog = screen.getByRole('dialog');
      const descBtn = within(dialog).getByRole('button', { name: 'product.description' });
      const appBtn = within(dialog).getByRole('button', { name: 'pdp.section.application' });

      // All start closed (prototype parity).
      expect(descBtn).toHaveAttribute('aria-expanded', 'false');
      expect(appBtn).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(descBtn);
      expect(descBtn).toHaveAttribute('aria-expanded', 'true');
      expect(within(dialog).getByText('Corpo descrizione.')).toBeTruthy();

      // Opening application collapses description.
      fireEvent.click(appBtn);
      expect(appBtn).toHaveAttribute('aria-expanded', 'true');
      expect(descBtn).toHaveAttribute('aria-expanded', 'false');
      expect(within(dialog).queryByText('Corpo descrizione.')).toBeNull();
      expect(within(dialog).getByText('Corpo applicazione.')).toBeTruthy();

      // Clicking the open one again collapses it (toggle to null).
      fireEvent.click(appBtn);
      expect(appBtn).toHaveAttribute('aria-expanded', 'false');
      expect(within(dialog).queryByText('Corpo applicazione.')).toBeNull();
    });

    it('omits accordions whose body is empty (no empty section)', () => {
      renderModal(makeProduct({ description: 'Solo descrizione.', application: undefined, ingredients: undefined }));
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByRole('button', { name: 'product.description' })).toBeTruthy();
      expect(within(dialog).queryByRole('button', { name: 'pdp.section.application' })).toBeNull();
      expect(within(dialog).queryByRole('button', { name: 'pdp.section.ingredients' })).toBeNull();
    });
  });

  describe('gallery (B7 NaN guard)', () => {
    it('keeps dot 0 active (no NaN) when a scroll fires at clientWidth === 0', () => {
      renderModal(makeProduct());
      const dialog = screen.getByRole('dialog');
      const dot0 = within(dialog).getByRole('button', { name: 'Prodotto — 1' });
      const dot1 = within(dialog).getByRole('button', { name: 'Prodotto — 2' });
      expect(dot0).toHaveAttribute('aria-current', 'true');
      // jsdom reports clientWidth === 0; the guard swallows the scroll so the
      // round(scrollLeft / 0) = NaN never reaches `active`.
      const track = dialog.querySelector('[aria-roledescription="carousel"]')!;
      fireEvent.scroll(track);
      expect(dot0).toHaveAttribute('aria-current', 'true');
      expect(dot1.getAttribute('aria-current')).toBeNull();
      expect(within(dialog).queryByText('NaN')).toBeNull();
    });
  });

  describe('badge priority in the modal (sale over configured badge)', () => {
    it('shows the red sale pill, not the admin badge, when both apply', () => {
      renderModal(makeProduct({ price: '8', originalPrice: '10', badge: 'NEW' }));
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('20%')).toBeTruthy();
      expect(within(dialog).queryByText('NOVITÀ')).toBeNull();
    });
  });
});
