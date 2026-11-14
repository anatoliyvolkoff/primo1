/**
 * Guards for M36 (required terms-acceptance gate) and M37 (newsletter opt-in
 * POST on successful order placement).
 *
 * M36: handlePlaceOrder MUST be blocked until the terms checkbox is checked —
 *   no payment session is initiated, no cart.complete, and an inline error is
 *   shown. Once checked, the order proceeds normally.
 *
 * M37: when the newsletter opt-in checkbox is checked, a successful order
 *   placement POSTs { email, language } to /store/newsletter (the same endpoint
 *   the newsletter popup uses). When unchecked, no POST fires.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Shared mocks (same pattern as Checkout.payment.test.tsx).
// ---------------------------------------------------------------------------

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

vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'it' }),
}));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock('../context/ToastContext', () => ({ useToast: () => mockToast }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children }: any) => <a>{children}</a>,
}));

vi.mock('../lib/useSeo', () => ({ useSeo: () => {} }));
vi.mock('../hooks/useRegionCountries', () => ({
  useRegionCountries: () => ({ data: [{ iso_2: 'it', display_name: 'Italia' }], isLoading: false }),
}));
vi.mock('../hooks/useStoreContent', () => ({ useVatRatePct: () => 0 }));

vi.mock('../components/checkout/CountrySelect', () => ({ CountrySelect: () => <div /> }));
vi.mock('../components/checkout/ProvinceSelect', () => ({ ProvinceSelect: () => <div /> }));
vi.mock('../data/countryDialCodes', () => ({ phonePlaceholderFor: () => '' }));

vi.mock('../lib/checkoutDraft', () => {
  const setCheckoutDraft = vi.fn();
  const clearCheckoutDraft = vi.fn();
  return {
    getCheckoutDraft: () => ({
      firstName: 'A', lastName: 'B', email: 'a@b.co', address: 'Via 1',
      city: 'Milano', postalCode: '20100', province: 'it-mi',
      countryCode: 'it', phone: '+391234567',
    }),
    setCheckoutDraft,
    clearCheckoutDraft,
  };
});

const NEXI_PROVIDER_ID = 'pp_nexi-xpay_nexi-xpay';

const ONE_FLAT_OPTION = [{
  id: 'opt_flat',
  name: 'Standard Shipping',
  price_type: 'flat',
  amount: 5,
  type: { description: '' },
}];

// A valid Nexi mock session so the happy path completes the cart in-line.
const sdkBehavior = {
  initiatePaymentSession: () =>
    Promise.resolve({
      payment_collection: {
        payment_sessions: [
          {
            provider_id: NEXI_PROVIDER_ID,
            data: { hostedPage: 'http://localhost:9000/mock-payment?cart_id=cart_1' },
          },
        ],
      },
    }),
  initiateCalled: 0,
  cartComplete: () => Promise.resolve({ order: { id: 'order_test_1' } }),
  cartCompleteCalled: 0,
};

vi.mock('../lib/medusa', () => ({
  MEDUSA_BACKEND_URL: 'http://backend',
  sdk: {
    store: {
      fulfillment: {
        listCartOptions: () => Promise.resolve({ shipping_options: ONE_FLAT_OPTION }),
        calculate: () => Promise.resolve({ shipping_option: { amount: 5 } }),
      },
      cart: {
        update: () => Promise.resolve({ cart: {} }),
        addShippingMethod: () => Promise.resolve({ cart: {} }),
        retrieve: () => Promise.resolve({ cart: { id: 'cart_1', payment_collection: null } }),
        complete: () => {
          sdkBehavior.cartCompleteCalled++;
          return sdkBehavior.cartComplete();
        },
      },
      payment: {
        initiatePaymentSession: () => {
          sdkBehavior.initiateCalled++;
          return sdkBehavior.initiatePaymentSession();
        },
      },
    },
  },
}));

import { Checkout } from './Checkout';

async function gotoPaymentStep() {
  render(<Checkout />);
  fireEvent.click(screen.getByText('checkout.continueShipping'));
  await waitFor(() => screen.getByText('checkout.shippingMethod'));
  const continuePaymentBtn = await waitFor(() => {
    const btn = screen.getByText('checkout.continuePayment').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    return btn;
  });
  fireEvent.click(continuePaymentBtn);
  await waitFor(() => screen.getByText('checkout.placeOrder'));
  return screen.getByText('checkout.placeOrder').closest('button') as HTMLButtonElement;
}

const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));

beforeEach(() => {
  localStorage.setItem('primo_cart_id', 'cart_1');
  mockNavigate.mockReset();
  mockToast.error.mockReset();
  mockToast.success.mockReset();
  sdkBehavior.cartCompleteCalled = 0;
  sdkBehavior.initiateCalled = 0;
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_NEXI_MOCK_MODE', 'false');
  Object.defineProperty(window, 'location', {
    value: { href: '' },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// M36: required terms-acceptance gate.
// ---------------------------------------------------------------------------

describe('M36: terms-acceptance gate', () => {
  it('blocks the order (no payment session, no cart.complete) and shows an error when terms are unchecked', async () => {
    const placeOrderBtn = await gotoPaymentStep();

    await act(async () => {
      fireEvent.click(placeOrderBtn);
    });

    // Gate fires: inline terms error visible, nothing charged.
    await waitFor(() => {
      expect(screen.getByText('checkout.terms.error')).toBeTruthy();
    });
    expect(sdkBehavior.initiateCalled).toBe(0);
    expect(sdkBehavior.cartCompleteCalled).toBe(0);
  });

  it('allows the order to proceed once the terms checkbox is checked', async () => {
    const placeOrderBtn = await gotoPaymentStep();

    const termsCheckbox = screen.getByLabelText(/checkout\.terms\.label/) as HTMLInputElement;
    await act(async () => {
      fireEvent.click(termsCheckbox);
    });
    expect(termsCheckbox.checked).toBe(true);

    await act(async () => {
      fireEvent.click(placeOrderBtn);
    });

    // Happy mock path: session initiated + cart completed + navigated.
    await waitFor(() => {
      expect(sdkBehavior.cartCompleteCalled).toBe(1);
    });
    expect(sdkBehavior.initiateCalled).toBe(1);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/checkout/confirmation/')
      );
    });
  });
});

// ---------------------------------------------------------------------------
// M37: newsletter opt-in POST on successful placement.
// ---------------------------------------------------------------------------

describe('M37: newsletter opt-in', () => {
  // B8 regression guard: the opt-in must be REACHABLE where the user submits.
  // It previously lived inside the Contatti card, whose wrapper gets
  // `opacity-60 pointer-events-none` at the payment step — so CSS made the
  // checkbox non-interactive even though `fireEvent` (which bypasses
  // pointer-events) still "clicked" it. Assert no ancestor up to <body> carries
  // `pointer-events-none`, i.e. a real pointer could reach it at payment.
  it('is interactive (not inside a pointer-events-none container) at the payment step', async () => {
    await gotoPaymentStep();

    const newsletterCheckbox = screen.getByLabelText(/checkout\.newsletter\.label/) as HTMLInputElement;

    let node: HTMLElement | null = newsletterCheckbox;
    while (node && node !== document.body) {
      expect(node.className).not.toContain('pointer-events-none');
      node = node.parentElement;
    }

    // And it sits alongside the terms checkbox in the submit area, so toggling
    // it at the payment step is possible right where the order is placed.
    const termsCheckbox = screen.getByLabelText(/checkout\.terms\.label/) as HTMLInputElement;
    expect(termsCheckbox).toBeTruthy();
  });

  it('POSTs { email, language } to /store/newsletter after a successful order when opted in', async () => {
    const placeOrderBtn = await gotoPaymentStep();

    // Opt in to the newsletter + accept terms.
    const newsletterCheckbox = screen.getByLabelText(/checkout\.newsletter\.label/) as HTMLInputElement;
    const termsCheckbox = screen.getByLabelText(/checkout\.terms\.label/) as HTMLInputElement;
    await act(async () => {
      fireEvent.click(newsletterCheckbox);
      fireEvent.click(termsCheckbox);
    });

    await act(async () => {
      fireEvent.click(placeOrderBtn);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });

    // Newsletter POST fired with the cart email + language.
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const call = fetchMock.mock.calls.find((c: any) => String(c[0]).includes('/store/newsletter'));
    expect(call).toBeTruthy();
    const body = JSON.parse((call as any)[1].body);
    expect(body).toMatchObject({ email: 'a@b.co', language: 'it' });
  });

  it('does NOT POST to /store/newsletter when the opt-in is unchecked', async () => {
    const placeOrderBtn = await gotoPaymentStep();

    // Accept terms only; leave newsletter unchecked.
    const termsCheckbox = screen.getByLabelText(/checkout\.terms\.label/) as HTMLInputElement;
    await act(async () => {
      fireEvent.click(termsCheckbox);
    });

    await act(async () => {
      fireEvent.click(placeOrderBtn);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });

    const newsletterCall = fetchMock.mock.calls.find((c: any) => String(c[0]).includes('/store/newsletter'));
    expect(newsletterCall).toBeUndefined();
  });
});
