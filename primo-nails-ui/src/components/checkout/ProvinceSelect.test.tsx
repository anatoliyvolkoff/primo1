/**
 * Component tests for the checkout ProvinceSelect — the Italian-province picker
 * (only rendered for IT addresses). It stores the lower-case ISO 3166-2 code
 * (e.g. "it-mi") that Medusa matches against province-level shipping zones, so
 * emitting the CODE (not the display name / 2-letter abbr) is money-path
 * critical: the wrong value resolves the wrong GLS zone. Guards open/close,
 * search by name AND by abbreviation, the invalid state, and the empty/no-match
 * edge case.
 */
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ProvinceSelect } from './ProvinceSelect';

vi.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'it' }),
}));

function renderSelect(props: Partial<React.ComponentProps<typeof ProvinceSelect>> = {}) {
  const onChange = vi.fn();
  const onBlur = vi.fn();
  const { container } = render(
    <ProvinceSelect id="province" value="" onChange={onChange} onBlur={onBlur} {...props} />,
  );
  const trigger = () => container.querySelector('#province') as HTMLButtonElement;
  return { onChange, onBlur, trigger };
}

describe('ProvinceSelect', () => {
  it('shows the placeholder when no province is selected', () => {
    const { trigger } = renderSelect({ value: '' });
    expect(trigger().textContent).toContain('checkout.provinceSelect');
  });

  it('renders the selected province as "Name (ABBR)" for a stored ISO code', () => {
    const { trigger } = renderSelect({ value: 'it-mi' });
    // Milano → "Milano (MI)".
    expect(trigger().textContent).toContain('Milano');
    expect(trigger().textContent).toContain('(MI)');
  });

  it('filters by province name (case-insensitive)', () => {
    const { trigger } = renderSelect();
    fireEvent.click(trigger());
    fireEvent.change(screen.getByPlaceholderText('checkout.provinceSearch'), {
      target: { value: 'milano' },
    });
    const opts = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(opts.some((o) => o.textContent?.includes('Milano'))).toBe(true);
    // Unrelated province is filtered out.
    expect(opts.some((o) => o.textContent?.includes('Torino'))).toBe(false);
  });

  it('filters by the 2-letter abbreviation too', () => {
    const { trigger } = renderSelect();
    fireEvent.click(trigger());
    fireEvent.change(screen.getByPlaceholderText('checkout.provinceSearch'), {
      target: { value: 'mi' },
    });
    const opts = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(opts.some((o) => o.textContent?.includes('Milano'))).toBe(true);
  });

  it('emits the lower-case ISO 3166-2 code (not the name or abbr) on selection', () => {
    const { onChange, trigger } = renderSelect();
    fireEvent.click(trigger());
    fireEvent.change(screen.getByPlaceholderText('checkout.provinceSearch'), {
      target: { value: 'milano' },
    });
    fireEvent.click(within(screen.getByRole('listbox')).getByText(/Milano/));
    expect(onChange).toHaveBeenCalledWith('it-mi');
  });

  it('shows the no-match row for a query matching no province', () => {
    const { trigger } = renderSelect();
    fireEvent.click(trigger());
    fireEvent.change(screen.getByPlaceholderText('checkout.provinceSearch'), {
      target: { value: 'zzzz' },
    });
    expect(within(screen.getByRole('listbox')).queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('checkout.countryNoMatch')).toBeTruthy();
  });

  it('reflects the invalid state via aria-invalid on the trigger', () => {
    const { trigger } = renderSelect({ invalid: true });
    expect(trigger().getAttribute('aria-invalid')).toBe('true');
  });

  it('does not set aria-invalid when valid', () => {
    const { trigger } = renderSelect({ invalid: false });
    expect(trigger().getAttribute('aria-invalid')).toBeNull();
  });
});
