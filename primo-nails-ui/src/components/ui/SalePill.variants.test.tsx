import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SalePill } from './SalePill';

// Complements SalePill.test.tsx: focuses on the three variant treatments, the
// "card falls through to the configured badge when there's no sale" behaviour,
// the no-leading-minus contract, and large/tiny discount rendering. No overlap
// with the baseline cases in SalePill.test.tsx.
describe('SalePill — variant treatments', () => {
  it('pdp renders the tall #ff4040 grid pill (25.1px) with "N%"', () => {
    const { container } = render(<SalePill variant="pdp" current="8.00" original="10.00" />);
    const span = container.querySelector('span')!;
    expect(span.textContent).toBe('20%');
    expect(span.className).toContain('bg-[#ff4040]');
    expect(span.className).toContain('rounded-[13px]');
    expect(span.className).toContain('h-[25.1px]');
    expect(span.className).toContain('inline-grid');
  });

  it('modal renders the #ff4040 grid pill (25px) with "N%"', () => {
    const { container } = render(<SalePill variant="modal" current="8.00" original="10.00" />);
    const span = container.querySelector('span')!;
    expect(span.textContent).toBe('20%');
    expect(span.className).toContain('bg-[#ff4040]');
    expect(span.className).toContain('rounded-[13px]');
    expect(span.className).toContain('h-[25px]');
  });

  it('card renders a Badge variant="sale" (brand token, not the raw #ff4040)', () => {
    const { container } = render(<SalePill variant="card" current="8.00" original="10.00" />);
    const span = container.querySelector('span')!;
    expect(span.textContent).toBe('20%');
    expect(span.className).toContain('bg-badge-sale');
    expect(span.className).not.toContain('bg-[#ff4040]');
    expect(span.className).toContain('rounded-pill');
  });

  it('shows "N%" with NO leading minus for any variant (prototype shows discount magnitude)', () => {
    for (const variant of ['pdp', 'modal', 'card'] as const) {
      const { container } = render(<SalePill variant={variant} current="7.50" original="9.99" />);
      const text = container.querySelector('span')!.textContent!;
      expect(text).toBe('25%');
      expect(text.startsWith('-')).toBe(false);
    }
  });
});

describe('SalePill — card fallthrough when there is no sale', () => {
  // The card call-site (ProductCard) renders SalePill AND a configured
  // new/hit/neutral badge; SalePill must render NOTHING with no genuine sale so
  // the call-site's other badge is what the user sees. We assert the null here.
  it('renders nothing (null) for card when original is missing', () => {
    const { container } = render(<SalePill variant="card" current="10.00" original={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for card when original equals current (no discount)', () => {
    const { container } = render(<SalePill variant="card" current="10.00" original="10.00" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for card when the discount rounds to 0%', () => {
    const { container } = render(<SalePill variant="card" current="99.80" original="100.00" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('SalePill — discount magnitude edge cases', () => {
  it('renders a near-100% pill for a deep discount', () => {
    render(<SalePill variant="pdp" current="0.01" original="200.00" />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders a tiny 1% pill (just above the suppression threshold)', () => {
    render(<SalePill variant="modal" current="99.00" original="100.00" />);
    expect(screen.getByText('1%')).toBeInTheDocument();
  });

  it('suppresses a sub-1% discount (0.49% → 0% → no pill)', () => {
    const { container } = render(<SalePill variant="pdp" current="99.51" original="100.00" />);
    expect(container).toBeEmptyDOMElement();
  });
});
