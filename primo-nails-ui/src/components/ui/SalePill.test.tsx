import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SalePill } from './SalePill';

describe('SalePill (E + B6: red "N%" pill gated on computeSalePercent)', () => {
  it('renders the rounded discount % for a genuine sale', () => {
    render(<SalePill variant="pdp" current="8.00" original="10.00" />);
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('renders NOTHING when there is no original price', () => {
    const { container } = render(<SalePill variant="modal" current="10.00" original={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  // B6: the three call-sites previously reimplemented the raw formula and could
  // emit a bogus "0%" / "-N%" / "NaN%" pill. SalePill must render NOTHING.
  it('renders NOTHING when original <= current (B6: no "0%"/negative)', () => {
    const { container: equal } = render(<SalePill variant="card" current="10.00" original="10.00" />);
    expect(equal).toBeEmptyDOMElement();
    const { container: lower } = render(<SalePill variant="card" current="12.00" original="10.00" />);
    expect(lower).toBeEmptyDOMElement();
  });

  it('renders NOTHING for a malformed / zero / empty original (B6: no "NaN%")', () => {
    for (const original of ['0', 'abc', '']) {
      const { container } = render(<SalePill variant="pdp" current="10.00" original={original} />);
      expect(container).toBeEmptyDOMElement();
    }
  });

  it('keeps each call-site red: pdp/modal use the #ff4040 span, card uses Badge variant="sale"', () => {
    const { container: pdp } = render(<SalePill variant="pdp" current="8.00" original="10.00" />);
    expect(pdp.querySelector('span')?.className).toContain('bg-[#ff4040]');

    const { container: modal } = render(<SalePill variant="modal" current="8.00" original="10.00" />);
    expect(modal.querySelector('span')?.className).toContain('bg-[#ff4040]');

    // The card variant renders the Badge sale token (--badge-sale), NOT #ff4040.
    const { container: card } = render(<SalePill variant="card" current="8.00" original="10.00" />);
    const cardClass = card.querySelector('span')?.className ?? '';
    expect(cardClass).toContain('bg-badge-sale');
    expect(cardClass).not.toContain('bg-[#ff4040]');
  });

  it('appends the per-call-site className passthrough', () => {
    const { container } = render(
      <SalePill variant="pdp" current="8.00" original="10.00" className="mb-3 lg:text-[15px]" />
    );
    expect(container.querySelector('span')?.className).toContain('mb-3');
    expect(container.querySelector('span')?.className).toContain('lg:text-[15px]');
  });
});
