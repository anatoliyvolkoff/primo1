import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Banner } from './Banner';

describe('Banner', () => {
  it('centres the title over the photo by default', () => {
    render(<Banner title="Corsi" subtitle="Sub" imageUrl="/a.jpg" />);
    const h1 = screen.getByRole('heading', { level: 1, name: 'Corsi' });
    expect(h1.closest('[data-banner-text]')?.className).not.toContain('sr-only');
  });

  it('catalog variant: photo only on phones, but the <h1> stays for screen readers', () => {
    render(<Banner variant="catalog" title="Tutti i Prodotti" subtitle="Sub" imageUrl="/a.jpg" />);
    // Still the page heading (SEO / a11y) …
    const h1 = screen.getByRole('heading', { level: 1, name: 'Tutti i Prodotti' });
    // … visually hidden below lg only (Primo1 shows the text on desktop).
    const block = h1.closest('[data-banner-text]')!;
    expect(block.className).toContain('max-lg:sr-only');
    expect(screen.getByText('Sub')).toBeInTheDocument();
  });

  it('catalog variant: half-height photo on phones only (tablet/desktop unchanged)', () => {
    const { container } = render(<Banner variant="catalog" title="T" imageUrl="/a.jpg" />);
    const box = container.firstElementChild!;
    expect(box.className).toContain('h-[196px]');
    expect(box.className).toContain('sm:h-[391px]');
    expect(box.className).toContain('lg:h-[356px]');
  });
});
