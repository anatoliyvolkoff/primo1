/**
 * Component tests for the checkout CountrySelect — the destination-country
 * picker that drives region-aware shipping (and the province field). This is a
 * money-path input: a wrong/empty country changes the GLS zone and the total,
 * so these guard open/close, search filtering, selection emitting the ISO code,
 * loading / disabled / empty-option edge cases, and the no-match state.
 */
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CountrySelect } from './CountrySelect';

// Identity t() so we assert on raw keys; motion/react rendered as-is (happy-dom
// handles the simple animated div fine here).
vi.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'it' }),
}));

const OPTIONS = [
  { iso_2: 'it', display_name: 'Italia' },
  { iso_2: 'fr', display_name: 'Francia' },
  { iso_2: 'de', display_name: 'Germania' },
];

function renderSelect(props: Partial<React.ComponentProps<typeof CountrySelect>> = {}) {
  const onChange = vi.fn();
  const { container } = render(
    <CountrySelect
      id="countryCode"
      value="it"
      options={OPTIONS}
      onChange={onChange}
      {...props}
    />,
  );
  // The trigger carries the id; scope to it so it stays unambiguous once the
  // panel (which contains option <button>s) is open.
  const trigger = () => container.querySelector('#countryCode') as HTMLButtonElement;
  return { onChange, trigger };
}

describe('CountrySelect', () => {
  it('renders the selected country display name on the trigger', () => {
    const { trigger } = renderSelect({ value: 'fr' });
    expect(trigger().textContent).toContain('Francia');
  });

  it('opens the listbox on click and shows every option', () => {
    const { trigger } = renderSelect();
    fireEvent.click(trigger());
    const listbox = screen.getByRole('listbox');
    const opts = within(listbox).getAllByRole('option');
    expect(opts).toHaveLength(3);
  });

  it('filters the option list by the search query (case-insensitive)', () => {
    const { trigger } = renderSelect();
    fireEvent.click(trigger());
    fireEvent.change(screen.getByPlaceholderText('checkout.countrySearch'), {
      target: { value: 'ger' },
    });
    const opts = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(opts).toHaveLength(1);
    expect(opts[0].textContent).toContain('Germania');
  });

  it('shows the no-match row when the query matches nothing', () => {
    const { trigger } = renderSelect();
    fireEvent.click(trigger());
    fireEvent.change(screen.getByPlaceholderText('checkout.countrySearch'), {
      target: { value: 'zzz' },
    });
    expect(within(screen.getByRole('listbox')).queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('checkout.countryNoMatch')).toBeTruthy();
  });

  it('emits the ISO-2 code (not the display name) when an option is picked, and closes', () => {
    const { onChange, trigger } = renderSelect();
    fireEvent.click(trigger());
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Germania'));
    expect(onChange).toHaveBeenCalledWith('de');
    // Panel closed → trigger reports collapsed (the listbox itself may linger
    // for the motion exit animation, so assert the open state, not unmount).
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('marks the current value as aria-selected in the list', () => {
    const { trigger } = renderSelect({ value: 'fr' });
    fireEvent.click(trigger());
    const selected = within(screen.getByRole('listbox'))
      .getAllByRole('option')
      .find((o) => o.getAttribute('aria-selected') === 'true');
    expect(selected?.textContent).toContain('Francia');
  });

  it('is disabled while loading and shows the loading label', () => {
    const { trigger } = renderSelect({ loading: true, disabled: true });
    const btn = trigger();
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('checkout.countryLoading');
    // Clicking a disabled trigger must not open the panel.
    fireEvent.click(btn);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('falls back to the country placeholder when the value is not in the options', () => {
    // Edge: region with no matching country yet (value points at something not
    // in the offered list) → shows the generic label, never a blank/undefined.
    const { trigger } = renderSelect({ value: 'xx' });
    expect(trigger().textContent).toContain('checkout.country');
  });

  it('clears the search query after a selection (next open starts unfiltered)', () => {
    const { trigger } = renderSelect();
    fireEvent.click(trigger());
    fireEvent.change(screen.getByPlaceholderText('checkout.countrySearch'), {
      target: { value: 'fra' },
    });
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Francia'));
    // Reopen — the query should have been reset so all three options show.
    fireEvent.click(trigger());
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(3);
  });
});
