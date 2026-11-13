import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Product } from '../../types';

// The "+N" chip on a season card only says how many more shades exist.
// It is an indicator, not a control: no button, nothing to click or focus.

const shade = (handle: string): Product =>
  ({ id: handle, handle, name: handle, price: '10', priceAmount: 10, category: 'Gel', image: '', isVisible: true, inStock: true }) as unknown as Product;
const HANDLES = ['s1', 's2', 's3', 's4', 's5'];

vi.mock('../../context/ProductContext', () => ({ useProducts: () => ({ products: HANDLES.map(shade) }) }));
vi.mock('../../context/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'it' }) }));
vi.mock('../../context/CartContext', () => ({ useCart: () => ({ addToCart: vi.fn() }) }));
vi.mock('../../hooks/useSeasons', () => ({
  useSeasons: () =>
    ['AUTUMN', 'WINTER', 'SPRING', 'SUMMER'].map((name) => ({
      name,
      kitHandle: `kit-${name.toLowerCase()}-collection`,
      productHandles: HANDLES,
      colors: ['#111', '#222', '#333', '#444', '#555'],
      image: '',
    })),
}));
vi.mock('../QuickViewModal', () => ({ QuickViewModal: () => null }));

import { SeasonalCollections } from './SeasonalCollections';

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

describe('SeasonalCollections — "+N" shades chip', () => {
  it('shows the remaining count but is not a button', () => {
    const { container } = render(<MemoryRouter><SeasonalCollections /></MemoryRouter>);
    const chips = container.querySelectorAll('.more');
    expect(chips.length).toBeGreaterThan(0);
    chips.forEach((chip) => {
      expect(chip.textContent).toBe('+2');
      expect(chip.tagName).not.toBe('BUTTON');
    });
    expect(screen.queryByRole('button', { name: 'collections.moreShades' })).toBeNull();
  });

  it('keeps only the first three swatches (no way to reveal the rest)', () => {
    const { container } = render(<MemoryRouter><SeasonalCollections /></MemoryRouter>);
    container.querySelectorAll('.ps-sw').forEach((row) => {
      expect(row.querySelectorAll('.sw').length).toBe(3);
    });
  });
});
