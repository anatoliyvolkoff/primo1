import { render, screen, fireEvent } from '@testing-library/react';
import { NAIL_SWATCHES } from '../../data/swatches';

// i18n: echo the key (plus a count when given) so text is assertable.
vi.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'it',
    t: (k: string, v?: { count?: number }) => (v?.count != null ? `${k}:${v.count}` : k),
  }),
}));

import { CategoryColorShop } from './CategoryColorShop';

const rosa = NAIL_SWATCHES.find((s) => s.slug === 'rosa')!;
const nude = NAIL_SWATCHES.find((s) => s.slug === 'nude')!;

const renderShop = (selected: string[], handlers = { onPick: vi.fn(), onClear: vi.fn() }) => {
  render(
    <CategoryColorShop
      selectedColors={selected}
      onPick={handlers.onPick}
      onClear={handlers.onClear}
      count={42}
      categoryLabel="Semipermanente"
    />,
  );
  return handlers;
};

describe('CategoryColorShop — Semipermanente colour header (Primo1 #cat-shop)', () => {
  it('shows the default title and "<category>, N tonalità" line when nothing is picked', () => {
    renderShop([]);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('shop.cs.title');
    expect(screen.getByText(/Semipermanente,/)).toHaveTextContent('Semipermanente, 42 shop.cs.shadesWord');
    expect(screen.queryByRole('button', { name: /shop.cs.allColors/ })).toBeNull();
  });

  it('renders one swatch button per NAIL_SWATCHES entry and reports the picked swatch NAME', () => {
    const { onPick } = renderShop([]);
    const group = screen.getByRole('group', { name: 'shop.cs.groupLabel' });
    expect(group.querySelectorAll('button')).toHaveLength(NAIL_SWATCHES.length);
    fireEvent.click(screen.getByRole('button', { name: nude.i18nKey }));
    expect(onPick).toHaveBeenCalledWith(nude.name);
  });

  it('turns the title into the picked colour, shows the product count and a clear button', () => {
    const { onClear } = renderShop([rosa.name]);
    // The echoed i18n key is capitalised like a colour name.
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Swatch.rosa');
    expect(screen.getByRole('button', { name: rosa.i18nKey })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('shop.cs.productsWord').parentElement).toHaveTextContent('42 shop.cs.productsWord');
    fireEvent.click(screen.getByRole('button', { name: /shop.cs.allColors/ }));
    expect(onClear).toHaveBeenCalled();
  });

  it('titles a multi-colour selection (from the filter panel) as "N colori"', () => {
    renderShop([rosa.name, nude.name]);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('shop.cs.colorsN:2');
  });
});
