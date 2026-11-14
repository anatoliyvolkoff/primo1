import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// The Total value lives in the sibling <span> of the "checkout.total" label,
// inside the same flex row. This reads just that cell so we don't collide with
// the subtotal / per-item €100 figures elsewhere in the summary.
function totalRowText(): string {
  const label = screen.getByText('checkout.total');
  return label.parentElement?.textContent ?? '';
}

// ---------------------------------------------------------------------------
// Checkout.tsx shipping-total behaviours.
//
// Guards two money-sensitive checkout bugs:
//  1. LB198-1  — a shipping option that's no longer offered (options refetched
//     after the destination/cart changed) must NOT stay selected with its stale
//     price applied.
//  2. CHECKOUT-005 — while a selected option's calculated price is still in
//     flight, the Total must render as pending (never `cartTotal + 0`, which
//     understates it); once the price resolves the Total must include it.
// ---------------------------------------------------------------------------

// --- Cart context: fixed, post-discount cart total of €100. -----------------
const cartState = {
  cartItems: [{ id: 'i1', name: 'Item', capacity: '', price: '100', quantity: 1, image: null }],
  cartSubtotal: 100,
  cartTotal: 100,
  cartDiscountTotal: 0,
  cartPromotions: [] as any[],
  applyPromotion: vi.fn(),
  removePromotion: vi.fn(),
};
vi.mock('../context/CartContext', () => ({ useCart: () => cartState }));

// --- Language: identity-ish t() so we can assert on raw keys. ----------------
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'it' }),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children }: any) => <a>{children}</a>,
}));

vi.mock('../lib/useSeo', () => ({ useSeo: () => {} }));
vi.mock('../hooks/useRegionCountries', () => ({
  useRegionCountries: () => ({ data: [{ iso_2: 'it', display_name: 'Italia' }], isLoading: false }),
}));
// VAT rate comes from the vat_rate_percent store setting via React Query; mock it
// (0 = VAT-exempt) so Checkout renders without a QueryClientProvider in tests.
vi.mock('../hooks/useStoreContent', () => ({ useVatRatePct: () => 0 }));

// Real formatPrice/vatPortion so the Total's rendered figure is trustworthy.
vi.mock('../components/checkout/CountrySelect', () => ({ CountrySelect: () => <div /> }));
vi.mock('../components/checkout/ProvinceSelect', () => ({ ProvinceSelect: () => <div /> }));
vi.mock('../data/countryDialCodes', () => ({ phonePlaceholderFor: () => '' }));

// Fully-valid draft so a single click on "continue" passes validation and
// advances to the shipping step (where the shipping effect runs).
vi.mock('../lib/checkoutDraft', () => ({
  getCheckoutDraft: () => ({
    firstName: 'A', lastName: 'B', email: 'a@b.co', address: 'Via 1',
    city: 'Milano', postalCode: '20100', province: 'it-mi',
    countryCode: 'it', phone: '+391234567',
  }),
  setCheckoutDraft: vi.fn(),
  clearCheckoutDraft: vi.fn(),
}));

// --- SDK: controllable listCartOptions + calculate. -------------------------
const sdkState = {
  options: [] as any[],
  // calculate resolver keyed by option id → amount; a promise we can resolve
  // manually to simulate an in-flight quote.
  calc: {} as Record<string, { promise: Promise<any>; resolve: (amt: number) => void }>,
};

const makeDeferredCalc = (id: string) => {
  let resolve!: (amt: number) => void;
  const promise = new Promise<any>((res) => {
    resolve = (amt: number) => res({ shipping_option: { amount: amt } });
  });
  sdkState.calc[id] = { promise, resolve };
  return promise;
};

vi.mock('../lib/medusa', () => ({
  sdk: {
    store: {
      fulfillment: {
        listCartOptions: () => Promise.resolve({ shipping_options: sdkState.options }),
        calculate: (id: string) => sdkState.calc[id]?.promise ?? Promise.resolve({ shipping_option: { amount: 0 } }),
      },
      cart: {
        update: () => Promise.resolve({ cart: {} }),
        addShippingMethod: () => Promise.resolve({ cart: {} }),
      },
    },
  },
}));

import { Checkout } from './Checkout';

const calcOption = (id: string, name: string) => ({
  id, name, price_type: 'calculated', type: { description: '' },
});

beforeEach(() => {
  localStorage.setItem('primo_cart_id', 'cart_1');
  sdkState.options = [];
  sdkState.calc = {};
});

afterEach(() => {
  localStorage.clear();
});

// Advance from the info step to the shipping step (fires the shipping effect).
async function gotoShipping() {
  render(<Checkout />);
  fireEvent.click(screen.getByText('checkout.continueShipping'));
  // cart.update resolves → setStep('shipping') → effect runs → options render.
  await waitFor(() => screen.getByText('checkout.shippingMethod'));
}

describe('CHECKOUT-005: pending shipping never shown as €0 in the Total', () => {
  it('renders the Total as pending while a selected calculated price is in flight, then includes it once resolved', async () => {
    sdkState.options = [calcOption('opt_a', 'Standard — Italy')];
    makeDeferredCalc('opt_a'); // price stays unresolved

    await gotoShipping();

    // The lone option is auto-selected (opts.length === 1). "Calculating"
    // appears both on the option row and — the fix — on the Total.
    await waitFor(() => expect(screen.getAllByText('checkout.calculatingPrice').length).toBeGreaterThanOrEqual(2));

    // The Total row must NOT show a concrete figure (esp. €100 = cartTotal + 0)
    // while shipping is pending — it shows the calculating indicator instead.
    expect(totalRowText()).toContain('checkout.calculatingPrice');
    expect(totalRowText()).not.toContain('100,00');
    // VAT-included line is hidden while pending.
    expect(screen.queryByText('checkout.vatIncluded')).toBeNull();

    // Resolve the calculated price to €10 → Total = 100 + 10 = 110.
    await act(async () => {
      sdkState.calc['opt_a'].resolve(10);
      await sdkState.calc['opt_a'].promise;
    });

    await waitFor(() => expect(totalRowText()).toContain('110,00'));
    // The client is VAT-exempt (vat_rate_percent setting defaults to 0 under
    // test, regime forfettario) → the "IVA inclusa" line stays hidden even once
    // the total resolves, because vatPortion is 0. (Set it to 22 → line shows.)
    expect(screen.queryByText('checkout.vatIncluded')).toBeNull();
  });
});

describe('LB198-1: stale shipping selection/price is cleared when options change', () => {
  it('drops a selection no longer offered after the options refetch (does not apply its stale price)', async () => {
    // First load: three options so nothing auto-selects; select opt_a and
    // resolve its price to €10.
    sdkState.options = [
      calcOption('opt_a', 'StandardA'),
      calcOption('opt_b', 'StandardB'),
      calcOption('opt_x', 'StandardX'),
    ];
    makeDeferredCalc('opt_a');
    makeDeferredCalc('opt_b');
    makeDeferredCalc('opt_x');

    render(<Checkout />);
    fireEvent.click(screen.getByText('checkout.continueShipping'));
    await waitFor(() => screen.getByText('checkout.shippingMethod'));

    await waitFor(() => screen.getByText('StandardA'));
    fireEvent.click(screen.getByDisplayValue('opt_a'));
    await act(async () => {
      sdkState.calc['opt_a'].resolve(10);
      await sdkState.calc['opt_a'].promise;
    });
    // Total now includes the €10 shipping → €110.
    await waitFor(() => expect(totalRowText()).toContain('110,00'));

    // Sanity: with opt_a selected + priced, "Continue to payment" is enabled.
    const continueBtn = () => screen.getByText('checkout.continuePayment').closest('button') as HTMLButtonElement;
    expect(continueBtn().disabled).toBe(false);

    // Destination changes → options refetch WITHOUT opt_a (opt_a gone; new
    // list opt_c/opt_d). Re-trigger the shipping effect via a cartId change
    // (effect dep). Clicking the *already-selected* opt_a re-renders (so the
    // new cartId is read) WITHOUT itself changing the selection — the reset
    // must come from the effect, not from this click.
    sdkState.options = [
      calcOption('opt_c', 'StandardC'),
      calcOption('opt_d', 'StandardD'),
    ];
    makeDeferredCalc('opt_c');
    makeDeferredCalc('opt_d');
    localStorage.setItem('primo_cart_id', 'cart_2');

    await act(async () => {
      // Re-render WITHOUT touching the shipping selection: type in the discount
      // box. This re-reads the new cartId (effect dep) → options refetch. The
      // selection reset must therefore come purely from the effect.
      fireEvent.change(screen.getByLabelText('checkout.discountPlaceholder'), { target: { value: 'X' } });
    });

    await waitFor(() => screen.getByText('StandardC'));

    // opt_a is gone from the offered set → the stale selection is dropped and
    // its €10 price is NOT applied. Nothing is auto-selected (2 options), so
    // the Total falls back to the bare cartTotal (€100), never €110.
    await waitFor(() => {
      expect(totalRowText()).toContain('100,00');
      expect(totalRowText()).not.toContain('110,00');
    });
    // The dropped selection's radio no longer exists.
    expect(screen.queryByDisplayValue('opt_a')).toBeNull();
    // No new option is checked (selection was cleared, not silently re-pointed).
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios.some((r) => r.checked)).toBe(false);
    // And crucially the phantom selection is gone: the user cannot advance to
    // payment with a no-longer-offered option (button reads selectedShipping).
    expect(continueBtn().disabled).toBe(true);
  });

  it('KEEPS a still-valid selection when options refetch (no false reset)', async () => {
    // Two stable options; select opt_a, resolve €10.
    sdkState.options = [calcOption('opt_a', 'StandardA'), calcOption('opt_b', 'StandardB')];
    makeDeferredCalc('opt_a');
    makeDeferredCalc('opt_b');

    render(<Checkout />);
    fireEvent.click(screen.getByText('checkout.continueShipping'));
    await waitFor(() => screen.getByText('checkout.shippingMethod'));
    await waitFor(() => screen.getByText('StandardA'));
    fireEvent.click(screen.getByDisplayValue('opt_a'));
    await act(async () => {
      sdkState.calc['opt_a'].resolve(10);
      await sdkState.calc['opt_a'].promise;
    });
    await waitFor(() => expect(totalRowText()).toContain('110,00'));

    // Refetch returns the SAME options (opt_a still offered) after a cart change.
    makeDeferredCalc('opt_a'); // re-priced by the new calculate call
    makeDeferredCalc('opt_b');
    localStorage.setItem('primo_cart_id', 'cart_2');
    await act(async () => {
      // Re-render without touching selection → effect refetches with new cartId.
      fireEvent.change(screen.getByLabelText('checkout.discountPlaceholder'), { target: { value: 'X' } });
    });
    await waitFor(() => screen.getByText('StandardA'));
    // Selection is preserved: opt_a stays checked.
    const optA = screen.getByDisplayValue('opt_a') as HTMLInputElement;
    expect(optA.checked).toBe(true);
    // Resolve the re-priced amount → Total reflects it, selection intact.
    await act(async () => {
      sdkState.calc['opt_a'].resolve(10);
      await sdkState.calc['opt_a'].promise;
    });
    await waitFor(() => expect(totalRowText()).toContain('110,00'));
  });

  it('shows the Total as pending (not the STALE price) while a KEPT option is re-quoted for a new destination', async () => {
    // opt_a offered in both zones but repriced (€6 → €25). Select it in zone 1.
    sdkState.options = [calcOption('opt_a', 'StandardA'), calcOption('opt_b', 'StandardB')];
    makeDeferredCalc('opt_a');
    makeDeferredCalc('opt_b');

    render(<Checkout />);
    fireEvent.click(screen.getByText('checkout.continueShipping'));
    await waitFor(() => screen.getByText('checkout.shippingMethod'));
    await waitFor(() => screen.getByText('StandardA'));
    fireEvent.click(screen.getByDisplayValue('opt_a'));
    await act(async () => {
      sdkState.calc['opt_a'].resolve(6);
      await sdkState.calc['opt_a'].promise;
    });
    await waitFor(() => expect(totalRowText()).toContain('106,00'));

    // Destination changes → opt_a still offered but must be re-quoted. Its old
    // €6 is stale. During the recalc window the Total must NOT show €106 as if
    // final — it shows the calculating indicator instead.
    makeDeferredCalc('opt_a'); // new quote, left in flight
    makeDeferredCalc('opt_b');
    localStorage.setItem('primo_cart_id', 'cart_2');
    await act(async () => {
      fireEvent.change(screen.getByLabelText('checkout.discountPlaceholder'), { target: { value: 'X' } });
    });
    await waitFor(() => screen.getByText('StandardA'));

    // opt_a stays selected (valid) but its price is pending → pending Total, and
    // crucially the stale €106 must be gone.
    await waitFor(() => expect(totalRowText()).toContain('checkout.calculatingPrice'));
    expect(totalRowText()).not.toContain('106,00');

    // New zone price €25 resolves → Total = 100 + 25 = 125.
    await act(async () => {
      sdkState.calc['opt_a'].resolve(25);
      await sdkState.calc['opt_a'].promise;
    });
    await waitFor(() => expect(totalRowText()).toContain('125,00'));
  });
});
