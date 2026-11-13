import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import { QuickViewModal } from './QuickViewModal';
import type { Product } from '../data';

// B5 regression — the shade/colour grid must reflect the ACTIVE product, not the
// original one the card memoized `shadeSiblings` on. The card swaps the modal's
// `product` prop on a size/season pick but hands down a FROZEN `shadeSiblings`
// prop (memoized on its original product). The modal must re-derive the shade
// family LIVE from `product` + the products context, so the swatch grid updates
// when the active product changes.
//
// Contexts are mocked like the sibling ProductCard.quickview.test so the test
// stays offline; `useProducts` returns a populated catalogue so the modal can
// derive the live shade family.

// Catalogue: two colour families, each a pair of same-colour shade siblings.
const REDS: Product[] = [
  {
    id: 'red-a',
    name: 'Gel Rosso Chiaro',
    handle: 'gel-rosso-chiaro',
    price: '12',
    category: 'Smalti',
    hasShade: true,
    colorName: 'Rosso',
    swatchImage: 'https://cdn.test/red-a-sw.jpg',
  } as Product,
  {
    id: 'red-b',
    name: 'Gel Rosso Scuro',
    handle: 'gel-rosso-scuro',
    price: '12',
    category: 'Smalti',
    hasShade: true,
    colorName: 'Rosso',
    swatchImage: 'https://cdn.test/red-b-sw.jpg',
  } as Product,
];
const BLUES: Product[] = [
  {
    id: 'blue-a',
    name: 'Gel Blu Chiaro',
    handle: 'gel-blu-chiaro',
    price: '12',
    category: 'Smalti',
    hasShade: true,
    colorName: 'Blu',
    swatchImage: 'https://cdn.test/blue-a-sw.jpg',
  } as Product,
  {
    id: 'blue-b',
    name: 'Gel Blu Scuro',
    handle: 'gel-blu-scuro',
    price: '12',
    category: 'Smalti',
    hasShade: true,
    colorName: 'Blu',
    swatchImage: 'https://cdn.test/blue-b-sw.jpg',
  } as Product,
];
const CATALOGUE = [...REDS, ...BLUES];

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

const noop = vi.fn();

const renderModal = (product: Product, shadeSiblingsProp: Product[]) =>
  render(
    <MemoryRouter>
      <QuickViewModal
        product={product}
        bundleChildren={[]}
        shadeSiblings={shadeSiblingsProp}
        open
        onClose={noop}
        onAddToCart={noop}
        isAdded={false}
        onPickSibling={noop}
      />
    </MemoryRouter>
  );

// The swatch grid is the group labelled `product.availableColors`; each swatch
// carries its product name as `title`, so we can read the rendered set.
const renderedShadeNames = (): string[] => {
  const dialog = screen.getByRole('dialog');
  const grid = within(dialog).getByRole('group', { name: 'product.availableColors' });
  return Array.from(grid.querySelectorAll('[title]')).map((el) => el.getAttribute('title')!);
};

describe('QuickViewModal shade grid (B5)', () => {
  it('derives the shade family from the ACTIVE product, not the frozen prop', () => {
    // Open on a RED shade; the card correctly passes the red siblings.
    const { rerender } = renderModal(REDS[0], REDS);
    expect(renderedShadeNames().sort()).toEqual(['Gel Rosso Chiaro', 'Gel Rosso Scuro']);

    // The card swaps the active `product` to a BLUE shade but the memoized
    // `shadeSiblings` prop is STILL the reds (frozen on the original product).
    // The grid must follow the active product and show the BLUES.
    rerender(
      <MemoryRouter>
        <QuickViewModal
          product={BLUES[0]}
          bundleChildren={[]}
          shadeSiblings={REDS}
          open
          onClose={noop}
          onAddToCart={noop}
          isAdded={false}
          onPickSibling={noop}
        />
      </MemoryRouter>
    );

    const names = renderedShadeNames().sort();
    expect(names).toEqual(['Gel Blu Chiaro', 'Gel Blu Scuro']);
    // And crucially, the stale red family is gone.
    expect(names).not.toContain('Gel Rosso Chiaro');
    expect(names).not.toContain('Gel Rosso Scuro');
  });

  it('falls back to the prop when the products context yields no family', () => {
    // A shade whose family is NOT in the (here empty-matching) catalogue: the
    // derived set is empty, so the prop is used as the fallback.
    const orphan = {
      id: 'orphan',
      name: 'Gel Verde',
      handle: 'gel-verde',
      price: '12',
      category: 'Smalti',
      hasShade: true,
      colorName: 'Verde',
      swatchImage: 'https://cdn.test/green-sw.jpg',
    } as Product;
    const propSiblings = [orphan, { ...orphan, id: 'orphan-2', name: 'Gel Verde Scuro' } as Product];

    renderModal(orphan, propSiblings);
    expect(renderedShadeNames().sort()).toEqual(['Gel Verde', 'Gel Verde Scuro']);
  });
});

describe('QuickViewModal kit shades (Primo1 quick view)', () => {
  const mkP = (id: string, name: string, price: string): Product =>
    ({ id, handle: id, name, price, priceAmount: Number(price), category: 'Kit', image: `/${id}.jpg`, isVisible: true, inStock: true }) as unknown as Product;
  const kit = { ...mkP('kit-spring-collection', 'Kit Spring', '40'), bundleHandles: ['s1', 's2'] } as Product;
  const s1 = mkP('s1', 'Shade One', '14');
  (s1 as Product).capacity = '12ml';

  it('picking a kit shade stays in the pop-up, shows that shade and adds it; ALL goes back to the set', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const onClose = vi.fn();
    const onAddToCart = vi.fn();
    render(
      <MemoryRouter>
        <QuickViewModal product={kit} bundleChildren={[s1, mkP('s2', 'Shade Two', '14')]} shadeSiblings={[]} open
          onClose={onClose} onAddToCart={onAddToCart} isAdded={false} onPickSibling={noop} />
      </MemoryRouter>
    );
    const dialog = screen.getByRole('dialog');
    // Whole set selected → "2 × 12 ml".
    expect(dialog.textContent).toContain('2 × 12 ml');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Shade One' }));
    expect(dialog.textContent).toContain('12ml');
    expect(onClose).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('button', { name: 'Shade One' })).toHaveAttribute('aria-pressed', 'true');
    expect(dialog.textContent).toContain('€14,00');
    // The bottom link opens the picked shade's own page.
    expect(within(dialog).getByRole('link', { name: 'product.viewFullDetails' })).toHaveAttribute('href', '/product/s1?from-kit=kit-spring-collection');

    fireEvent.click(within(dialog).getByRole('button', { name: 'pdp.addToCart' }));
    expect(mockAddToCart).toHaveBeenCalledWith(s1, 1);
    expect(onAddToCart).not.toHaveBeenCalled();
    // Picking another shade drops the "added" flash.
    expect(within(dialog).getByRole('button', { name: 'product.added' })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Shade Two' }));
    expect(within(dialog).getByRole('button', { name: 'pdp.addToCart' })).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'collections.fullCollection' }));
    expect(dialog.textContent).toContain('€40,00');
    fireEvent.click(within(dialog).getByRole('button', { name: 'pdp.addToCart' }));
    expect(onAddToCart).toHaveBeenCalledWith(1);
  });
});
