/**
 * Guards for LB198-4 (payment session provider guard) and REACT-011
 * (checkoutDraft skip-first-render guard).
 *
 * LB198-4: handlePlaceOrder must throw a user-visible error when the Nexi
 *   payment session is missing instead of silently falling through to
 *   cart.complete() with no payment authorization.
 *
 * REACT-011: setCheckoutDraft must NOT be called on the initial render
 *   (the draft is already the source for the initial formData value), but
 *   MUST be called on subsequent formData mutations.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Shared mocks (same pattern as Checkout.shipping.test.tsx).
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
// VAT rate comes from the vat_rate_percent store setting via React Query; mock it
// (0 = VAT-exempt) so Checkout renders without a QueryClientProvider in tests.
vi.mock('../hooks/useStoreContent', () => ({ useVatRatePct: () => 0 }));

vi.mock('../components/checkout/CountrySelect', () => ({ CountrySelect: () => <div /> }));
vi.mock('../components/checkout/ProvinceSelect', () => ({ ProvinceSelect: () => <div /> }));
vi.mock('../data/countryDialCodes', () => ({ phonePlaceholderFor: () => '' }));

// Fully-valid draft so "Continue" advances past the info step.
// Use a spy that's defined inside the factory to avoid the TDZ issue with
// vi.mock hoisting — the spied function is exposed via the module itself.
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

// ---------------------------------------------------------------------------
// Controllable SDK mock.
//
// listCartOptions returns ONE flat option so the shipping step auto-selects it
// and the "Continue to payment" button becomes enabled — allowing the tests to
// actually reach handlePlaceOrder and exercise the payment-session guard.
// ---------------------------------------------------------------------------

const NEXI_PROVIDER_ID = 'pp_nexi-xpay_nexi-xpay';

// A single flat shipping option that auto-selects (opts.length === 1).
const ONE_FLAT_OPTION = [{
  id: 'opt_flat',
  name: 'Standard Shipping',
  price_type: 'flat',
  amount: 5,
  type: { description: '' },
}];

// Mutable factories so individual tests can override payment session behaviour.
const sdkBehavior = {
  initiatePaymentSession: () =>
    Promise.resolve({ payment_collection: { payment_sessions: [] } }),
  cartComplete: () => Promise.resolve({ order: { id: 'order_test_1' } }),
  cartCompleteCalled: 0,
};

vi.mock('../lib/medusa', () => ({
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
        initiatePaymentSession: () => sdkBehavior.initiatePaymentSession(),
      },
    },
  },
}));

import { Checkout } from './Checkout';
import * as checkoutDraftModule from '../lib/checkoutDraft';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Render Checkout and navigate through info → shipping → payment steps.
 * Returns once the "Place Order" button is visible and enabled.
 */
async function gotoPaymentStep() {
  render(<Checkout />);

  // Info step → shipping step.
  fireEvent.click(screen.getByText('checkout.continueShipping'));
  await waitFor(() => screen.getByText('checkout.shippingMethod'));

  // The single flat option auto-selects (opts.length === 1), so
  // "Continue to payment" must be enabled immediately.
  const continuePaymentBtn = await waitFor(() => {
    const btn = screen.getByText('checkout.continuePayment').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    return btn;
  });

  // Shipping step → payment step.
  fireEvent.click(continuePaymentBtn);
  await waitFor(() => screen.getByText('checkout.placeOrder'));

  // M36: the sale-terms gate now blocks placing the order until checked. These
  // guards exercise the payment-session logic *past* that gate, so tick it.
  const termsCheckbox = screen.getByLabelText(/checkout\.terms\.label/) as HTMLInputElement;
  fireEvent.click(termsCheckbox);

  return screen.getByText('checkout.placeOrder').closest('button') as HTMLButtonElement;
}

beforeEach(() => {
  localStorage.setItem('primo_cart_id', 'cart_1');
  mockNavigate.mockReset();
  mockToast.error.mockReset();
  sdkBehavior.cartCompleteCalled = 0;
  sdkBehavior.initiatePaymentSession = () =>
    Promise.resolve({ payment_collection: { payment_sessions: [] } });
  sdkBehavior.cartComplete = () => Promise.resolve({ order: { id: 'order_test_1' } });
  vi.mocked(checkoutDraftModule.setCheckoutDraft).mockClear();
  // Ensure window.location.href assignment does not throw in happy-dom.
  Object.defineProperty(window, 'location', {
    value: { href: '' },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// REACT-011: setCheckoutDraft skip-first-render guard.
// ---------------------------------------------------------------------------

describe('REACT-011: checkoutDraft is not written on the initial render', () => {
  it('does NOT call setCheckoutDraft on mount (the draft was the source of formData)', async () => {
    render(<Checkout />);

    // After mount and all microtasks settle, the skip-first-render guard should
    // prevent setCheckoutDraft from being called.
    await act(async () => {});

    expect(checkoutDraftModule.setCheckoutDraft).not.toHaveBeenCalled();
  });

  it('DOES call setCheckoutDraft after the user mutates the form', async () => {
    render(<Checkout />);
    await act(async () => {});

    // Type into the first-name field → formData changes → effect fires.
    const firstNameInput = screen.getByLabelText('checkout.firstName');
    fireEvent.change(firstNameInput, {
      target: { name: 'firstName', value: 'Luigi' },
    });

    await waitFor(() => {
      expect(checkoutDraftModule.setCheckoutDraft).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Luigi' })
      );
    });
  });
});

// ---------------------------------------------------------------------------
// LB198-4: payment session guard — no cart.complete when session is absent
// or belongs to the wrong provider.
// ---------------------------------------------------------------------------

describe('LB198-4: payment session provider guard', () => {
  it('shows an error and does NOT call cart.complete when the payment session collection is empty', async () => {
    // initiatePaymentSession returns an empty sessions array — no Nexi session.
    sdkBehavior.initiatePaymentSession = () =>
      Promise.resolve({ payment_collection: { payment_sessions: [] } });

    const placeOrderBtn = await gotoPaymentStep();

    // Click "Place Order" — handlePlaceOrder is reached and the guard fires.
    await act(async () => {
      fireEvent.click(placeOrderBtn);
    });

    // The guard must surface an error message (toast or inline error div).
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });

    // cart.complete must NOT have been called.
    expect(sdkBehavior.cartCompleteCalled).toBe(0);
  });

  it('shows an error and does NOT call cart.complete when only a non-Nexi session is present', async () => {
    // Only a non-Nexi session is returned (e.g. Stripe). The old code would
    // fall back to sessions[0] and use it. The new guard requires the exact
    // NEXI_PROVIDER_ID and throws if not found.
    sdkBehavior.initiatePaymentSession = () =>
      Promise.resolve({
        payment_collection: {
          payment_sessions: [
            {
              provider_id: 'pp_stripe_stripe',
              data: { hostedPage: 'https://stripe.com/pay/xyz' },
            },
          ],
        },
      });

    const placeOrderBtn = await gotoPaymentStep();

    await act(async () => {
      fireEvent.click(placeOrderBtn);
    });

    // Wrong provider → guard throws → error toast shown.
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });

    // cart.complete must NOT have been called.
    expect(sdkBehavior.cartCompleteCalled).toBe(0);
  });

  it('redirects via window.location.href and does NOT call cart.complete for a real (non-mock) Nexi session', async () => {
    // Valid Nexi session with a real HPP URL (no "mock-payment" in it).
    const REAL_HPP_URL = 'https://xpay.nexigroup.com/pay/abc123';
    sdkBehavior.initiatePaymentSession = () =>
      Promise.resolve({
        payment_collection: {
          payment_sessions: [
            {
              provider_id: NEXI_PROVIDER_ID,
              data: { hostedPage: REAL_HPP_URL },
            },
          ],
        },
      });

    // Ensure VITE_NEXI_MOCK_MODE is NOT set (or false) so isMockMode is false.
    vi.stubEnv('VITE_NEXI_MOCK_MODE', 'false');

    const placeOrderBtn = await gotoPaymentStep();

    await act(async () => {
      fireEvent.click(placeOrderBtn);
    });

    // Should redirect to the Nexi HPP URL.
    await waitFor(() => {
      expect(window.location.href).toBe(REAL_HPP_URL);
    });

    // cart.complete must NOT have been called (redirect, not in-line completion).
    expect(sdkBehavior.cartCompleteCalled).toBe(0);
    // No error toast — the redirect is the happy path.
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it('calls cart.complete (mock path) when the hostedPage URL contains "mock-payment"', async () => {
    // Backend mock mode: the provider returns a URL with "mock-payment" in it.
    sdkBehavior.initiatePaymentSession = () =>
      Promise.resolve({
        payment_collection: {
          payment_sessions: [
            {
              provider_id: NEXI_PROVIDER_ID,
              data: { hostedPage: 'http://localhost:9000/mock-payment?cart_id=cart_1' },
            },
          ],
        },
      });

    // VITE_NEXI_MOCK_MODE is NOT set — the mock path must be triggered purely
    // by the "mock-payment" pattern in the hostedPage URL.
    vi.stubEnv('VITE_NEXI_MOCK_MODE', 'false');

    const placeOrderBtn = await gotoPaymentStep();

    await act(async () => {
      fireEvent.click(placeOrderBtn);
    });

    // cart.complete IS called on the mock path.
    await waitFor(() => {
      expect(sdkBehavior.cartCompleteCalled).toBe(1);
    });

    // Should navigate to the confirmation page, no error.
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/checkout/confirmation/')
      );
    });
    expect(mockToast.error).not.toHaveBeenCalled();
  });
});
