import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProductCard } from './ProductCard';
import type { Product } from '../data';

// The quick-view (eye button) modal: opens the product preview, renders
// title/price/shades, adds to cart via the SHARED CartContext handler (with the
// in-modal quantity), closes on ✕ / backdrop / Escape, and (matching the
// prototype) carries NO TPO/HEMA trust pills. Contexts are mocked like the
// sibling ProductCard.picsum.test so the test stays offline.
const addToCart = vi.fn();

vi.mock('../context/CartContext', () => ({
  useCart: () => ({ addToCart }),
}));
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'it',
    setLanguage: vi.fn(),
    // Echo the key back, except interpolate {{name}} so aria-labels are findable.
    t: (k: string, vars?: Record<string, unknown>) =>
      vars && 'name' in vars ? `${k}:${vars.name}` : k,
  }),
}));
vi.mock('../context/ProductContext', () => ({
  useProducts: () => ({ products: [] }),
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

const openQuickView = () => {
  // The eye button's aria-label is `product.quickView:<name>` under the mock t().
  fireEvent.click(screen.getByLabelText('product.quickView:Gel Rosso'));
  return screen.getByRole('dialog');
};

describe('ProductCard quick-view (eye) modal', () => {
  beforeEach(() => addToCart.mockClear());

  it('eye button opens the modal with the product title and price', () => {
    renderCard();
    expect(screen.queryByRole('dialog')).toBeNull();
    const dialog = openQuickView();
    expect(within(dialog).getByText('Gel Rosso')).toBeTruthy();
    // Price primitive renders the formatted current price.
    expect(within(dialog).getByText(/12/)).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('does NOT render the invented TPO/HEMA trust pills (M14 — prototype parity)', () => {
    const dialog = (renderCard(), openQuickView());
    // The prototype quick-view has no such pills; the claim lives only in the
    // description. Neither the i18n keys nor the literal English must appear.
    expect(within(dialog).queryByText('product.tpoFree')).toBeNull();
    expect(within(dialog).queryByText('product.hemaFree')).toBeNull();
    expect(within(dialog).queryByText(/TPO Free/i)).toBeNull();
    expect(within(dialog).queryByText(/HEMA Free/i)).toBeNull();
  });

  it('renders the 2-slide zoom gallery with two real clickable dots (M15)', () => {
    const dialog = (renderCard(), openQuickView());
    // Two dot buttons labelled "<name> — 1" / "<name> — 2" (mock t echoes
    // {{name}} but these are plain template strings, so match by the suffix).
    const dot1 = within(dialog).getByRole('button', { name: 'Gel Rosso — 1' });
    const dot2 = within(dialog).getByRole('button', { name: 'Gel Rosso — 2' });
    expect(dot1).toBeTruthy();
    expect(dot2).toBeTruthy();
    // First dot is active on open.
    expect(dot1.getAttribute('aria-current')).toBe('true');
    expect(dot2.getAttribute('aria-current')).toBeNull();
  });

  it('adds to cart from the modal via the shared handler with the chosen quantity', () => {
    renderCard();
    const dialog = openQuickView();
    // Bump quantity to 3 with the stepper.
    const inc = within(dialog).getByLabelText('cart.increaseQty');
    fireEvent.click(inc);
    fireEvent.click(inc);
    // The modal's add-to-cart button — the ported design keeps the prototype's
    // normal-case "Add to Cart" label (i18n key, not uppercased).
    fireEvent.click(within(dialog).getByText('pdp.addToCart'));
    expect(addToCart).toHaveBeenCalledTimes(1);
    expect(addToCart).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), 3);
  });

  it('links to the full product page', () => {
    const dialog = (renderCard(), openQuickView());
    const link = within(dialog).getByText('product.viewFullDetails').closest('a');
    expect(link?.getAttribute('href')).toBe('/product/gel-rosso');
  });

  it('closes on the ✕ close button', async () => {
    renderCard();
    openQuickView();
    fireEvent.click(screen.getByLabelText('search.close'));
    // AnimatePresence plays an exit animation, so the dialog unmounts async.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('closes on Escape', async () => {
    renderCard();
    openQuickView();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('closes on backdrop click', async () => {
    renderCard();
    const dialog = openQuickView();
    // The backdrop is the dialog's previous sibling (aria-hidden overlay).
    const backdrop = dialog.parentElement?.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop as Element);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('renders the capacity / format pill when present', () => {
    renderCard({ capacity: '12 ml' });
    const dialog = openQuickView();
    expect(within(dialog).getByText('12 ml')).toBeTruthy();
  });

  // Height-jump fix: the modal box must keep a STABLE, viewport-tied height so
  // expanding/collapsing an accordion scrolls INTERNALLY instead of growing the
  // outer box. jsdom does not do layout, so we assert the structural invariants
  // that guarantee it: the dialog carries a fixed `h-*` height (not a bare
  // `max-h` cap), that height is unchanged by opening an accordion, and the
  // scroll container (`.qv-scroll`) keeps its `overflow-auto` + `flex-1 min-h-0`
  // so overflow is reachable by scrolling.
  it('keeps a stable viewport-tied modal height so accordions scroll internally', () => {
    renderCard({
      description: 'Una descrizione lunga del prodotto.',
      application: 'Come si applica.',
      ingredients: 'Lista ingredienti.',
    } as Partial<Product>);
    const dialog = openQuickView();

    // Fixed height tied to the viewport (mobile 92dvh / md min(90dvh,820px)) —
    // present so the box occupies a constant height rather than hugging content.
    expect(dialog.className).toContain('h-[92dvh]');
    expect(dialog.className).toContain('md:h-[min(90dvh,820px)]');
    // No height *cap* class: the height is driven by `h-*`, not `max-h-*`, so it
    // cannot shrink-to-fit and then grow when content expands.
    expect(dialog.className).not.toMatch(/(?:^|\s)(?:md:)?max-h-/);

    // The single scroll container that absorbs the overflow.
    const scroller = dialog.querySelector('.overflow-auto') as HTMLElement;
    expect(scroller).toBeTruthy();
    expect(scroller.className).toContain('flex-1');
    expect(scroller.className).toContain('min-h-0');
    expect(scroller.className).toContain('overscroll-contain');

    const heightBefore = dialog.className;

    // Open the first accordion ("product.description").
    const accBtn = within(dialog).getByRole('button', { name: 'product.description' });
    expect(accBtn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(accBtn);

    // Body now reachable (rendered inside the scroll container).
    expect(accBtn.getAttribute('aria-expanded')).toBe('true');
    expect(within(dialog).getByText('Una descrizione lunga del prodotto.')).toBeTruthy();
    expect(scroller.contains(within(dialog).getByText('Una descrizione lunga del prodotto.'))).toBe(true);

    // The outer modal's height classes are unchanged by the expansion — the box
    // does not resize; the extra content lives inside the scroller.
    expect(dialog.className).toBe(heightBefore);
  });
});
