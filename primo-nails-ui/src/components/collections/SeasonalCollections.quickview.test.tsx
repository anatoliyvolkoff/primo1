import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Product } from '../../types';

// Primo1 "The Seasons": opening a season shows its kit in the product
// quick-view pop-up (not a separate season dialog).

const kit = (handle: string, name: string): Product =>
  ({ id: handle, handle, name, price: '40', priceAmount: 40, category: 'Kit', image: '', isVisible: true, inStock: true, bundleHandles: [] }) as unknown as Product;
const KITS = [
  kit('kit-autumn-collection', 'Kit Collezione Autunnale'),
  kit('kit-winter-collection', 'Kit Collezione Invernale'),
  kit('kit-spring-collection', 'Kit Collezione Primaverile'),
  kit('kit-summer-collection', 'Kit Collezione Estiva'),
];

vi.mock('../../context/ProductContext', () => ({ useProducts: () => ({ products: KITS }) }));
vi.mock('../../context/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'it' }) }));
const addToCart = vi.fn();
vi.mock('../../context/CartContext', () => ({ useCart: () => ({ addToCart }) }));
vi.mock('../../hooks/useSeasons', () => ({
  useSeasons: () =>
    ['AUTUMN', 'WINTER', 'SPRING', 'SUMMER'].map((name) => ({
      name,
      kitHandle: `kit-${name === 'AUTUMN' ? 'autumn' : name === 'WINTER' ? 'winter' : name === 'SPRING' ? 'spring' : 'summer'}-collection`,
      productHandles: [],
      colors: [],
      image: '',
    })),
}));
// Quick-view stub: shows which product it was opened on, plus close / add.
vi.mock('../QuickViewModal', () => ({
  QuickViewModal: ({ product, onClose, onAddToCart, isAdded, onPickSibling }: { product: Product; onClose: () => void; onAddToCart: (q: number) => void; isAdded: boolean; onPickSibling: (p: Product) => void }) => (
    <div role="dialog" aria-label="quick view">
      <span data-testid="qv-product">{product.name}</span>
      <span data-testid="qv-added">{String(isAdded)}</span>
      <button type="button" onClick={() => onPickSibling(KITS[1])}>winter tab</button>
      <button type="button" onClick={() => onAddToCart(2)}>add</button>
      <button type="button" onClick={onClose}>close</button>
    </div>
  ),
}));

import { SeasonalCollections } from './SeasonalCollections';

beforeEach(() => {
  // Phones layout (no desktop hover / pinning).
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

describe('SeasonalCollections — seasons open their kit in the quick view', () => {
  it('opens the centred season\'s kit from "Scopri la collezione" and closes again', () => {
    render(<MemoryRouter><SeasonalCollections /></MemoryRouter>);
    expect(screen.queryByRole('dialog', { name: 'quick view' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'seasons.cta' }));
    expect(screen.getByTestId('qv-product').textContent).toBe('Kit Collezione Autunnale');

    fireEvent.click(screen.getByRole('button', { name: 'add' }));
    expect(addToCart).toHaveBeenCalledWith(KITS[0], 2);

    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog', { name: 'quick view' })).toBeNull();
  });

  it('does not carry the "added" state over to another kit (tab switch or reopen)', () => {
    render(<MemoryRouter><SeasonalCollections /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'seasons.cta' }));
    fireEvent.click(screen.getByRole('button', { name: 'add' }));
    expect(screen.getByTestId('qv-added').textContent).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'winter tab' }));
    expect(screen.getByTestId('qv-product').textContent).toBe('Kit Collezione Invernale');
    expect(screen.getByTestId('qv-added').textContent).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'add' }));
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    fireEvent.click(screen.getByRole('button', { name: 'seasons.cta' }));
    expect(screen.getByTestId('qv-added').textContent).toBe('false');
  });
});
