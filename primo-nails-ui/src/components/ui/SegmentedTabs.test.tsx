import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SegmentedTabs } from './SegmentedTabs';

describe('SegmentedTabs', () => {
  const options = [
    { value: 'a', label: 'I Più Venduti' },
    { value: 'b', label: 'Novità' },
    { value: 'c', label: 'Saldi' },
  ] as const;

  it('renders every tab label and marks the active one checked', () => {
    render(
      <SegmentedTabs value="a" onChange={() => {}} options={[...options]} aria-label="tabs" />
    );
    expect(screen.getByText('I Più Venduti')).toBeInTheDocument();
    expect(screen.getByText('Novità')).toBeInTheDocument();
    expect(screen.getByText('Saldi')).toBeInTheDocument();
    const active = screen.getByRole('radio', { checked: true });
    expect(active).toHaveTextContent('I Più Venduti');
  });

  it('fires onChange with the picked value', () => {
    const onChange = vi.fn();
    render(
      <SegmentedTabs value="a" onChange={onChange} options={[...options]} aria-label="tabs" />
    );
    fireEvent.click(screen.getByText('Saldi'));
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('applies buttonClassName to every tab (desktop grid-cell fill)', () => {
    render(
      <SegmentedTabs
        value="a"
        onChange={() => {}}
        options={[...options]}
        aria-label="tabs"
        buttonClassName="lg:w-full lg:px-0"
      />
    );
    for (const btn of screen.getAllByRole('radio')) {
      expect(btn.className).toContain('lg:w-full');
      expect(btn.className).toContain('lg:px-0');
    }
  });
});
