import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent } from '@testing-library/react';
import { NAIL_SWATCHES } from '../data/swatches';

vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, vars?: Record<string, unknown>) =>
      vars ? `${k}:${Object.values(vars).join('/')}` : k,
    language: 'en',
  }),
}));
vi.mock('./SortControl', () => ({ SortControl: () => <div /> }));

import { FilterBar } from './FilterBar';

// Colour filters show the real product swatch that best matches each colour
// (scripts/filter-swatches.py), not a flat CSS fill.
describe('colour filter swatch photos', () => {
  it('gives every colour filter a product swatch photo that exists in public/', () => {
    for (const sw of NAIL_SWATCHES) {
      expect(sw.swatchImage, sw.slug).toBe(`/swatches/filter/${sw.slug}.webp`);
      expect(fs.existsSync(path.resolve(__dirname, '../../public', sw.swatchImage!.slice(1))), sw.slug).toBe(true);
    }
  });

  it('paints the filter panel colour circles with those photos', () => {
    render(
      <FilterBar
        sortBy="popularity"
        onSortChange={vi.fn()}
        activeFilters={[]}
        clearAll={vi.fn()}
        removeFilter={vi.fn()}
        selectedCollections={[]}
        setSelectedCollections={vi.fn()}
        selectedEffects={[]}
        setSelectedEffects={vi.fn()}
        selectedAvailability={null}
        setSelectedAvailability={vi.fn()}
        priceRange={[0, 100]}
        setPriceRange={vi.fn()}
        showColors
        selectedColors={[]}
        setSelectedColors={vi.fn()}
      />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: /filter/i })[0]);
    const rosa = screen.getAllByRole('checkbox', { name: 'swatch.rosa' })[0];
    expect(rosa.style.backgroundImage).toContain('/swatches/filter/rosa.webp');
  });
});
