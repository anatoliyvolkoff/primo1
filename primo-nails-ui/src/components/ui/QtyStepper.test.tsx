import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QtyStepper } from './QtyStepper';

describe('QtyStepper (D: shared stepper, behaviour owned by the call-site)', () => {
  it('renders the value and fires the call-site handlers (call-site owns the clamp)', () => {
    const onDecrement = vi.fn();
    const onIncrement = vi.fn();
    render(
      <QtyStepper
        value={3}
        onDecrement={onDecrement}
        onIncrement={onIncrement}
        decrementLabel="less"
        incrementLabel="more"
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('less'));
    fireEvent.click(screen.getByLabelText('more'));
    expect(onDecrement).toHaveBeenCalledTimes(1);
    expect(onIncrement).toHaveBeenCalledTimes(1);
  });

  it('only disables a control when the call-site asks (no auto-disabled minus / no cap)', () => {
    render(
      <QtyStepper
        value={1}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
        decrementLabel="less"
        incrementLabel="more"
      />
    );
    // Neither disabled flag passed → both enabled (PDP steppers never disabled
    // the minus and had no max cap).
    expect(screen.getByLabelText('less')).not.toBeDisabled();
    expect(screen.getByLabelText('more')).not.toBeDisabled();
  });

  it('disables the decrement when decrementDisabled is set (modal: quantity<=1)', () => {
    render(
      <QtyStepper
        value={1}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
        decrementLabel="less"
        incrementLabel="more"
        decrementDisabled
      />
    );
    expect(screen.getByLabelText('less')).toBeDisabled();
  });

  it('renders the circle glyph (two <path>s + <circle>) with the requested stroke width', () => {
    const { container } = render(
      <QtyStepper
        value={1}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
        decrementLabel="less"
        incrementLabel="more"
        glyph="circle"
        glyphStrokeWidth={0.9}
      />
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
    expect(svgs[0].getAttribute('stroke-width')).toBe('0.9');
    expect(svgs[0].querySelector('circle')).not.toBeNull();
  });

  it('renders an <output> readout and a role=group wrapper when asked (modal parity)', () => {
    render(
      <QtyStepper
        value={5}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
        decrementLabel="less"
        incrementLabel="more"
        readoutAs="output"
        role="group"
        aria-label="qty"
      />
    );
    const group = screen.getByRole('group', { name: 'qty' });
    expect(group.querySelector('output')?.textContent).toBe('5');
  });

  it('renders the lucide glyph variant (plain Minus/Plus, no <circle>)', () => {
    const { container } = render(
      <QtyStepper
        value={1}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
        decrementLabel="less"
        incrementLabel="more"
        glyph="lucide"
      />
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
    // lucide icons have no explicit <circle> ring (that's the circle variant).
    expect(container.querySelector('circle')).toBeNull();
  });

  it('circle glyph defaults to stroke-width 1.5 when none is given (modal default)', () => {
    const { container } = render(
      <QtyStepper
        value={1}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
        decrementLabel="less"
        incrementLabel="more"
        glyph="circle"
      />
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('stroke-width')).toBe('1.5');
  });

  it('PDP inline call-site variant: hairline circle glyph (stroke 0.9) with sizing class', () => {
    const { container } = render(
      <QtyStepper
        value={2}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
        decrementLabel="less"
        incrementLabel="more"
        glyph="circle"
        glyphStrokeWidth={0.9}
        glyphClassName="w-11 h-11"
      />
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('stroke-width')).toBe('0.9');
    expect(svg.getAttribute('class')).toContain('w-11');
  });

  it('is purely presentational: the call-site owns the clamp, so a min-value click still fires onDecrement when not disabled', () => {
    // The stepper never auto-clamps; it just renders the value verbatim and
    // delegates. At the min value with no `decrementDisabled`, the handler fires
    // (the call-site's Math.max(1,...) keeps the displayed value at 1).
    const onDecrement = vi.fn();
    render(
      <QtyStepper
        value={1}
        onDecrement={onDecrement}
        onIncrement={vi.fn()}
        decrementLabel="less"
        incrementLabel="more"
      />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('less'));
    expect(onDecrement).toHaveBeenCalledTimes(1);
  });

  it('a disabled decrement at the min value swallows the click (modal: quantity<=1)', () => {
    const onDecrement = vi.fn();
    render(
      <QtyStepper
        value={1}
        onDecrement={onDecrement}
        onIncrement={vi.fn()}
        decrementLabel="less"
        incrementLabel="more"
        decrementDisabled
      />
    );
    fireEvent.click(screen.getByLabelText('less'));
    expect(onDecrement).not.toHaveBeenCalled();
  });
});
