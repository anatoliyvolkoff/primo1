import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Price } from './Price';
import { formatPrice } from '../../lib/formatPrice';

describe('Price atom — current + optional struck original', () => {
  it('renders the current price in foreground (not sale red) with no original', () => {
    const { container } = render(<Price current="99,00 €" />);
    const current = container.querySelector('span');
    expect(current?.textContent).toBe('99,00 €');
    expect(current?.className).toContain('text-foreground');
    expect(current?.className).not.toContain('text-sale-price');
  });

  it('renders ONLY one span when there is no original (no empty strike element)', () => {
    const { container } = render(<Price current="99,00 €" />);
    expect(container.querySelectorAll('span')).toHaveLength(1);
  });

  it('turns the current price red and strikes the original when on sale', () => {
    const { container } = render(<Price current="8,00 €" original="10,00 €" />);
    const spans = container.querySelectorAll('span');
    expect(spans).toHaveLength(2);

    const [current, original] = spans;
    expect(current.textContent).toBe('8,00 €');
    expect(current.className).toContain('text-sale-price');
    expect(current.className).not.toContain('text-foreground');

    expect(original.textContent).toBe('10,00 €');
    expect(original.className).toContain('line-through');
    expect(original.className).toContain('text-muted-foreground');
  });

  it('treats an EMPTY-STRING original as "no sale" (not a blank strike)', () => {
    // onSale = original != null && original !== '' — empty string must NOT
    // flip the colour or add a struck element.
    const { container } = render(<Price current="99,00 €" original="" />);
    expect(container.querySelectorAll('span')).toHaveLength(1);
    expect(container.querySelector('span')?.className).toContain('text-foreground');
  });

  it('treats original={0} (number zero) as a real value → on sale', () => {
    // 0 is != null and !== '' so the component renders the struck element.
    // (Formatting is the caller's job; Price only switches on presence.)
    const { container } = render(<Price current="8,00 €" original={0} />);
    expect(container.querySelectorAll('span')).toHaveLength(2);
    expect(container.querySelector('span')?.className).toContain('text-sale-price');
  });

  it('applies the size class to the current price and scales the struck original', () => {
    const { rerender, container } = render(
      <Price current="8,00 €" original="10,00 €" size="lg" />,
    );
    let spans = container.querySelectorAll('span');
    expect(spans[0].className).toContain('text-2xl'); // lg current
    expect(spans[1].className).toContain('text-lg'); // lg original

    rerender(<Price current="8,00 €" original="10,00 €" size="sm" />);
    spans = container.querySelectorAll('span');
    expect(spans[0].className).toContain('text-sm'); // sm current
    expect(spans[1].className).toContain('text-xs'); // sm original
  });

  it('defaults to md size and keeps amount+€ on one line (whitespace-nowrap)', () => {
    const { container } = render(<Price current="8,00 €" original="10,00 €" />);
    const spans = container.querySelectorAll('span');
    expect(spans[0].className).toContain('text-lg'); // md current
    expect(spans[1].className).toContain('text-sm'); // md original
    expect(spans[0].className).toContain('whitespace-nowrap');
  });

  it('merges a passthrough className onto the wrapper and forwards HTML attrs', () => {
    const { container } = render(
      <Price current="8,00 €" className="mt-4" data-testid="price-x" aria-label="prezzo" />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('mt-4');
    expect(wrapper.className).toContain('flex'); // base layout kept
    expect(wrapper.getAttribute('data-testid')).toBe('price-x');
    expect(wrapper.getAttribute('aria-label')).toBe('prezzo');
  });

  // ── Integration with formatPrice: the strings Price actually receives ───────
  it('renders real formatPrice output verbatim (€ leading, no space)', () => {
    const { container } = render(<Price current={formatPrice(99)} original={formatPrice(129)} />);
    const spans = container.querySelectorAll('span');
    expect(spans[0].textContent).toBe('€99,00');
    expect(spans[1].textContent).toBe('€129,00');
  });

  it('renders zero and large formatted amounts (edge values from formatPrice)', () => {
    const { container } = render(
      <Price current={formatPrice(0)} original={formatPrice(1234567.89)} />,
    );
    const spans = container.querySelectorAll('span');
    expect(spans[0].textContent).toBe('€0,00');
    expect(spans[0].className).toContain('text-sale-price'); // 0 current, has original
    expect(spans[1].textContent?.startsWith('€')).toBe(true);
  });

  it('accepts ReactNode children (not just strings) for current/original', () => {
    const { container } = render(
      <Price current={<em>free</em>} original={<s>12</s>} />,
    );
    expect(container.querySelector('em')?.textContent).toBe('free');
    // original wrapper is still present (on sale) with its struck child.
    expect(container.querySelectorAll('span')).toHaveLength(2);
  });
});
