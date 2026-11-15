import { render, screen, fireEvent } from '@testing-library/react';

// Echo the i18n key so the visible option labels equal their keys — lets the
// test assert on which options exist (and that there is NO name/alphabetical
// sort) without depending on the EN/IT copy.
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { SortControl } from './SortControl';
import type { SortOption } from './SortControl';

// The option buttons live inside the listbox (role="option"); open the menu
// first by clicking the trigger.
const openMenu = () => {
  fireEvent.click(screen.getByRole('button', { name: /sort\.label/ }));
};
const optionLabels = () =>
  screen.getAllByRole('option').map((o) => o.textContent?.trim());

describe('SortControl — option set matches the client prototype', () => {
  it('offers exactly Popolarità / Novità / Prezzo crescente / Prezzo decrescente (no Nome)', () => {
    render(<SortControl currentSort="popularity" onSortChange={() => {}} />);
    openMenu();

    expect(optionLabels()).toEqual([
      'sort.popularity',
      'sort.newest',
      'sort.priceAsc',
      'sort.priceDesc',
    ]);
    // Explicitly: there is no name / alphabetical sort option.
    expect(optionLabels()).not.toContain('sort.name');
    expect(optionLabels().some((l) => /name|nome/i.test(l ?? ''))).toBe(false);
  });

  it('marks the current sort option as aria-selected', () => {
    render(<SortControl currentSort="price-asc" onSortChange={() => {}} />);
    openMenu();
    const selected = screen
      .getAllByRole('option')
      .filter((o) => o.getAttribute('aria-selected') === 'true')
      .map((o) => o.textContent?.trim());
    expect(selected).toEqual(['sort.priceAsc']);
  });

  it('fires onSortChange with the chosen option id', () => {
    const onSortChange = vi.fn<(o: SortOption) => void>();
    render(<SortControl currentSort="popularity" onSortChange={onSortChange} />);
    openMenu();
    fireEvent.click(screen.getByRole('option', { name: 'sort.newest' }));
    expect(onSortChange).toHaveBeenCalledWith('newest');
  });

  it('shows the current sort label on the trigger (falls back to Popolarità)', () => {
    const { rerender } = render(
      <SortControl currentSort="price-desc" onSortChange={() => {}} />
    );
    // Closed trigger shows the active label.
    expect(screen.getByText('sort.priceDesc')).toBeTruthy();

    rerender(<SortControl currentSort="popularity" onSortChange={() => {}} />);
    expect(screen.getByText('sort.popularity')).toBeTruthy();
  });
});

describe('SortControl — placement', () => {
  it('opens downward by default (desktop bar)', () => {
    render(<SortControl currentSort="popularity" onSortChange={() => {}} />);
    openMenu();
    const list = screen.getByRole('listbox');
    expect(list.dataset.placement).toBe('down');
    expect(list.className).toContain('top-[calc(100%+6px)]');
  });

  it('opens upward when placement="up" so it never covers the sheet CTA', () => {
    render(<SortControl currentSort="popularity" onSortChange={() => {}} placement="up" />);
    openMenu();
    const list = screen.getByRole('listbox');
    expect(list.dataset.placement).toBe('up');
    expect(list.className).toContain('bottom-[calc(100%+8px)]');
    expect(list.className).not.toContain('top-[calc(100%+6px)]');
  });
});
