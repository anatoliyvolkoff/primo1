import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { motion } from 'motion/react';
import { LanguageProvider } from '../context/LanguageContext';
import { ProductCarousel, carouselItemVariants } from './ProductCarousel';

// Fires every observed element as "in view" straight away, like a row that
// is already on screen.
class InViewObserver {
  cb: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) { this.cb = cb; }
  observe(el: Element) {
    this.cb([{ isIntersecting: true, target: el, intersectionRatio: 1 } as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

const Row: React.FC<{ ids: string[] }> = ({ ids }) => (
  <LanguageProvider>
    <ProductCarousel>
      {ids.map((id) => (
        <motion.div key={id} data-testid={id} variants={carouselItemVariants} className="shrink-0 w-[258px]">
          {id}
        </motion.div>
      ))}
    </ProductCarousel>
  </LanguageProvider>
);

const settle = () => act(() => new Promise((r) => setTimeout(r, 1200)));

describe('ProductCarousel', () => {
  const orig = window.IntersectionObserver;
  beforeEach(() => { window.IntersectionObserver = InViewObserver as unknown as typeof IntersectionObserver; });
  afterEach(() => { window.IntersectionObserver = orig; });

  // Moving from one product page to another keeps the same carousel and swaps
  // its items (the product you just left is added to the front). The added card
  // must still fade in; it used to stay at opacity 0, leaving a blank card-wide
  // hole at the start of "Potrebbe piacerti anche" on iPhone.
  it('shows cards that are added after the row has already animated in', async () => {
    const { rerender, getByTestId } = render(<Row ids={['b', 'c', 'd']} />);
    await settle();
    expect(getByTestId('b').style.opacity).toBe('1');

    rerender(<Row ids={['a', 'b', 'c', 'd']} />);
    await settle();
    expect(getByTestId('a').style.opacity).toBe('1');
  });

  it('jumps back to the first card when the first item changes', async () => {
    const { rerender, getByRole } = render(<Row ids={['b', 'c', 'd']} />);
    await settle();
    const row = getByRole('group');
    row.scrollLeft = 274;
    rerender(<Row ids={['a', 'b', 'c', 'd']} />);
    await settle();
    expect(row.scrollLeft).toBe(0);
  });
});
