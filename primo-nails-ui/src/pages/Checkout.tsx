import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { ShieldCheck, Truck, ChevronRight, ChevronLeft, Tag, Loader2, Lock, RotateCcw, Trash2, Info } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useSeo } from '../lib/useSeo';
import { sdk, MEDUSA_BACKEND_URL } from '../lib/medusa';
import { safeGetItem, safeRemoveItem } from '../lib/safeStorage';
import { useRegionCountries } from '../hooks/useRegionCountries';
import { formatPrice, vatPortion } from '../lib/formatPrice';
import { useVatRatePct } from '../hooks/useStoreContent';
import { CountrySelect } from '../components/checkout/CountrySelect';
import { ProvinceSelect } from '../components/checkout/ProvinceSelect';
import { FreeShippingProgress } from '../components/checkout/FreeShippingProgress';
import { PaymentMethods } from '../components/PaymentMethods';
import { phonePlaceholderFor } from '../data/countryDialCodes';
import { getCheckoutDraft, setCheckoutDraft, clearCheckoutDraft } from '../lib/checkoutDraft';
import { Container, Card, Button } from '../components/ui';

const NEXI_PROVIDER_ID = 'pp_nexi-xpay_nexi-xpay';

// Pill styling matching <Button variant="primary" size="lg" uppercase />, applied
// to a react-router <Link> so post-flow navigation stays client-side (SPA) rather
// than triggering a full-page reload as a plain <a href> would.
const PRIMARY_PILL_LG =
  'inline-flex items-center justify-center gap-2 rounded-pill font-sans font-medium ' +
  'transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out ' +
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-background active:scale-[0.98] select-none ' +
  'bg-primary text-primary-foreground border border-primary ' +
  'hover:bg-transparent hover:text-primary shadow-card hover:shadow-subtle ' +
  'h-12 px-8 text-base uppercase tracking-widest';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s().-]{6,}$/;
// EU postal codes vary widely: digits-only (IT 00100, FR 75001), with a space
// (NL "1011 AB", IE Eircode "D02 AF30", MT "ABC 1234") or a hyphen (PL 00-001).
// Accept 3–10 alphanumerics with optional internal spaces/hyphens.
const POSTAL_RE = /^[A-Za-z0-9][A-Za-z0-9 -]{1,8}[A-Za-z0-9]$/;

interface FieldProps {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  error?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributeAnchorTarget extends never ? never : 'text' | 'email' | 'tel' | 'numeric' | 'decimal' | 'search' | 'url' | 'none';
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const Field: React.FC<FieldProps> = ({
  id, name, label, type = 'text', placeholder, value, error,
  autoComplete, inputMode, onChange, onBlur,
}) => {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className={CHECKOUT_LABEL_CLS}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        inputMode={inputMode as any}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={checkoutInputCls(!!error)}
      />
      {error && (
        <p id={errorId} role="alert" className="font-sans text-[12.5px] leading-4 text-destructive mt-1.5 ml-4">
          {error}
        </p>
      )}
    </div>
  );
};

// Contact + address step: the controls in tab order. After a field is done the
// next one is focused and scrolled into view (phones: centred, above the keyboard).
const INFO_FIELD_ORDER = ['email', 'phone', 'firstName', 'lastName', 'address', 'postalCode', 'city', 'province', 'countryCode', 'continue-info-btn'];
function focusNextInfoField(fromId: string) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const desktop = window.matchMedia?.('(min-width: 1024px)').matches;
  for (let j = INFO_FIELD_ORDER.indexOf(fromId) + 1; j > 0 && j < INFO_FIELD_ORDER.length; j++) {
    const el = document.getElementById(INFO_FIELD_ORDER[j]) as HTMLElement | null;
    if (!el || (el as HTMLButtonElement).disabled || el.getBoundingClientRect().width === 0) continue; // e.g. province outside Italy
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: desktop ? 'nearest' : 'center' });
    return;
  }
}

// Shared prototype field styling (pill inputs, 52px, light fill, #111 focus ring).
// Exported helpers so the inline ProvinceSelect/CountrySelect labels match Field.
const CHECKOUT_LABEL_CLS =
  'font-sans text-[12.5px] leading-4 font-medium text-muted-foreground mb-1.5 ml-4';
const checkoutInputCls = (invalid: boolean) =>
  `w-full h-[52px] px-5 rounded-pill border bg-surface font-sans text-[15px] text-foreground ` +
  `placeholder:text-muted-foreground/60 outline-none transition-[border-color,background-color,box-shadow] duration-200 ` +
  `hover:border-[#c9c4bf] focus-visible:border-foreground focus-visible:bg-card focus-visible:ring-[3px] focus-visible:ring-foreground/10 ` +
  (invalid ? 'border-destructive bg-card' : 'border-[#e6e1dc]');

// Warm checkout hero band: back link + gold eyebrow + big "Checkout" + step pills.
// The pills are presentational (display-only, reflecting the current step); they
// do NOT drive the stepper — the sequential gating stays as-is.
const CheckoutHero: React.FC<{ step: 'info' | 'shipping' | 'payment' }> = ({ step }) => {
  const { t } = useLanguage();
  const current =
    step === 'info' ? 1 : step === 'shipping' ? 2 : 3;
  const pills: Array<{ n: number; label: string }> = [
    { n: 1, label: t('checkout.stepContact') },
    { n: 2, label: t('checkout.stepDelivery') },
    { n: 3, label: t('checkout.stepPayment') },
  ];
  return (
    <section className="bg-surface pt-24 sm:pt-28 md:pt-32">
      <Container className="lg:!max-w-[976px] lg:mx-auto">
        <Link
          to="/semipermanente"
          className="inline-flex items-center gap-1.5 h-10 font-sans text-[13.5px] font-medium text-foreground/80 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          {t('checkout.continueShopping')}
        </Link>
        <div className="pt-4 pb-10 lg:pb-12 flex flex-wrap items-end justify-between gap-y-6">
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-gold">
              {t('checkout.eyebrow')}
            </p>
            <h1 className="mt-2.5 text-[40px] lg:text-[56px] leading-[1.02] font-bold tracking-[-2.4px] text-foreground">
              {t('checkout.title')}
            </h1>
          </div>
          <ol className="flex flex-wrap gap-2" aria-label={t('checkout.stepContact')}>
            {pills.map((p) => {
              const active = p.n === current;
              return (
                <li key={p.n}>
                  <span
                    aria-current={active ? 'step' : undefined}
                    className={`flex items-center gap-2 h-10 pl-2 pr-4 rounded-pill border bg-card font-sans text-[13.5px] font-semibold text-foreground transition-colors ${
                      active ? 'border-foreground' : 'border-[#e6e1dc]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="grid place-items-center w-6 h-6 rounded-full bg-foreground text-background text-[11px] font-bold"
                    >
                      {p.n}
                    </span>
                    {p.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </Container>
    </section>
  );
};

// Numbered-circle section header (prototype `.co-n` + 26px title).
const SectionHeader: React.FC<{ n: number; title: string; done?: boolean }> = ({ n, title, done }) => (
  <h2 className="font-sans flex items-center gap-3 text-[22px] sm:text-[26px] leading-tight font-semibold tracking-[-0.6px] text-card-foreground">
    <span
      aria-hidden="true"
      className="flex-none grid place-items-center w-[30px] h-[30px] rounded-full bg-foreground text-background text-[13px] font-bold"
    >
      {n}
    </span>
    {title}
    {done && <span className="ml-auto text-xs text-success font-bold" aria-hidden="true">✓</span>}
  </h2>
);

type CheckoutField =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'address'
  | 'city'
  | 'postalCode'
  | 'province'
  | 'phone'
  | 'countryCode';

type FormErrors = Partial<Record<CheckoutField, string>>;

export const Checkout = () => {
  const {
    cartItems,
    cartSubtotal,
    cartItemTotal,
    cartTotal,
    cartDiscountTotal,
    cartPromotions,
    applyPromotion,
    removePromotion,
  } = useCart();
  const { t, language } = useLanguage();
  const toast = useToast();
  // Live VAT rate (admin `vat_rate_percent`); 0 = VAT-exempt → the IVA line hides.
  const vatRate = useVatRatePct();
  useSeo({ titleKey: 'pageTitle.checkout', noindex: true });

  const navigate = useNavigate();
  const { data: countries = [], isLoading: countriesLoading } = useRegionCountries();

  // Hydrate from the in-memory draft so leaving and returning to checkout
  // (via SPA navigation) keeps what was typed; a full reload resets it.
  const [formData, setFormData] = useState(() => getCheckoutDraft() ?? {
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    province: '',
    countryCode: 'it',
    phone: '',
  });

  // Mirror every change into the module-scoped draft.
  // Skip the initial render: the draft is already the source of truth for the
  // initial formData value (hydrated above via getCheckoutDraft). Writing it
  // back on mount is a no-op functionally, but it causes a spurious extra call
  // on every hydration cycle. The ref guard prevents that while keeping the
  // effect reactive to all subsequent changes.
  const _isFirstDraftRender = useRef(true);
  useEffect(() => {
    if (_isFirstDraftRender.current) {
      _isFirstDraftRender.current = false;
      return;
    }
    setCheckoutDraft(formData);
  }, [formData]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<CheckoutField, boolean>>>({});
  const [discountCode, setDiscountCode] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const discountApplied = cartPromotions.length > 0;
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  // Calculated options (e.g. GLS) carry no price in the options list — we fetch
  // each price via the calculate endpoint. `shippingPrices` holds resolved
  // amounts; `pricingIds` holds options whose price is still being calculated
  // (GLS quote in flight), which drives the inline loader.
  const [shippingPrices, setShippingPrices] = useState<Record<string, number>>({});
  const [pricingIds, setPricingIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'info' | 'shipping' | 'payment'>('info');
  // Phone keyboards: show "Next" on the Enter key of the contact/address inputs.
  useEffect(() => {
    if (step !== 'info') return;
    INFO_FIELD_ORDER.forEach((id) => document.getElementById(id)?.tagName === 'INPUT' && document.getElementById(id)?.setAttribute('enterkeyhint', 'next'));
  }, [step]);
  // Each step scrolls the customer to what they do next. Shipping: the method +
  // "Continua al pagamento". Payment (a single option exists): straight to the
  // confirmation area (terms + "Conferma Ordine"). Phones centre it; on desktop
  // it only scrolls if the target isn't already in view (the summary is sticky).
  useEffect(() => {
    if (step === 'info') return;
    const raf = requestAnimationFrame(() => {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const desktop = window.matchMedia?.('(min-width: 1024px)').matches;
      // Phones, payment step: the summary card sits below the form, so end the
      // scroll at the card's bottom edge — totals, terms, "Conferma Ordine" and
      // the shipping/returns notes all in view.
      const phonesPayment = step === 'payment' && !desktop;
      const el = document.getElementById(phonesPayment ? 'order-summary' : step === 'payment' ? 'order-confirm' : 'shipping-step');
      if (!el) return;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: phonesPayment ? 'end' : desktop && step === 'payment' ? 'nearest' : 'center' });
      if (step === 'payment') el.querySelector<HTMLInputElement>('input[name="terms"]')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [step]);
  const [error, setError] = useState<string | null>(null);
  // M36: required sale-terms + right-of-withdrawal acceptance. The Place Order
  // action is gated on this; `termsError` shows inline until it's checked.
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  // M37: newsletter opt-in. When checked, a successful order placement POSTs the
  // customer's email to the same /store/newsletter endpoint the popup uses.
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);

  const cartId = safeGetItem('primo_cart_id');

  const validateField = (name: CheckoutField, value: string): string | undefined => {
    const v = value.trim();
    if (name === 'email') {
      if (!v) return t('checkout.validation.required');
      if (!EMAIL_RE.test(v)) return t('checkout.validation.email');
      return;
    }
    if (name === 'phone') {
      if (!v) return t('checkout.validation.required');
      if (!PHONE_RE.test(v)) return t('checkout.validation.phone');
      return;
    }
    if (name === 'postalCode') {
      if (!v) return t('checkout.validation.required');
      if (!POSTAL_RE.test(v)) return t('checkout.validation.postal');
      return;
    }
    if (name === 'province') {
      // Required only for Italy (a picked ISO 3166-2 code like "it-mi"); other
      // countries don't use it — the backend supplies the country code to GLS.
      if (formData.countryCode === 'it' && !v) return t('checkout.validation.required');
      return;
    }
    if (['firstName', 'lastName', 'address', 'city'].includes(name)) {
      if (!v) return t('checkout.validation.required');
      return;
    }
    return;
  };

  const validateAll = (): FormErrors => {
    const next: FormErrors = {};
    (Object.keys(formData) as CheckoutField[]).forEach(field => {
      if (field === 'countryCode') return;
      const err = validateField(field, formData[field]);
      if (err) next[field] = err;
    });
    return next;
  };

  // Fetch shipping options when cart has an address. Flat options carry their
  // price inline; CALCULATED options (GLS) don't — for those we call the
  // calculate endpoint per option, which runs the GLS-quote-then-flat-fallback
  // on the backend. A loader shows while each calculated price is in flight.
  useEffect(() => {
    if (step === 'shipping' && cartId) {
      let cancelled = false;
      sdk.store.fulfillment
        .listCartOptions({ cart_id: cartId })
        .then(({ shipping_options }) => {
          if (cancelled) return;
          const opts = shipping_options || [];
          const offeredIds = new Set(opts.map((o: any) => o.id));
          const calculated = opts.filter((o: any) => o.price_type === 'calculated');
          // Calculated options are always re-quoted below (their price depends on
          // the current cart/destination). Their previously-resolved amount is
          // now stale, so drop it too — otherwise a KEPT calculated option whose
          // zone changed would flash its old price as the *final* total during
          // the recalc window instead of showing "calculating".
          const recalcIds = new Set<string>(calculated.map((o: any) => String(o.id)));
          setShippingOptions(opts);
          // The available options can change when the cart/destination changes
          // (address edited → different zone → different options). Drop a stale
          // selection that's no longer offered so its (stale) price is never
          // applied to the total; a still-valid selection is kept intact.
          setSelectedShipping((prev) => {
            if (opts.length === 1) return opts[0].id;
            return prev && offeredIds.has(prev) ? prev : null;
          });
          // Keep only FLAT prices for still-offered options; drop prices for
          // options no longer offered AND for calculated options about to be
          // re-quoted, so no stale amount leaks into the total.
          setShippingPrices((prev) => {
            const next: Record<string, number> = {};
            for (const id of Object.keys(prev)) {
              if (offeredIds.has(id) && !recalcIds.has(id)) next[id] = prev[id];
            }
            return next;
          });

          if (calculated.length === 0) {
            // No calculated options: clear any lingering in-flight markers.
            setPricingIds(new Set());
            return;
          }

          setPricingIds(recalcIds);
          calculated.forEach((o: any) => {
            sdk.store.fulfillment
              .calculate(o.id, { cart_id: cartId, data: {} })
              .then((res: any) => {
                if (cancelled) return;
                const amt = res?.shipping_option?.amount;
                if (amt != null) {
                  setShippingPrices((prev) => ({ ...prev, [o.id]: amt as number }));
                }
              })
              .catch((e) => console.error('calculate shipping price failed', o.id, e))
              .finally(() => {
                if (cancelled) return;
                setPricingIds((prev) => {
                  const next = new Set(prev);
                  next.delete(o.id);
                  return next;
                });
              });
          });
        })
        .catch(console.error);
      return () => {
        cancelled = true;
      };
    }
  }, [step, cartId]);

  // Effective price for an option: flat options use their inline amount;
  // calculated options use the fetched price (undefined until it resolves).
  const priceFor = (option: any): number | undefined =>
    option?.price_type === 'calculated' ? shippingPrices[option.id] : option?.amount ?? undefined;
  // True while a calculated option's price is still being fetched.
  const isPricing = (option: any): boolean =>
    option?.price_type === 'calculated' && pricingIds.has(option.id) && shippingPrices[option.id] == null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name as CheckoutField]) {
      const err = validateField(name as CheckoutField, value);
      setErrors(prev => ({ ...prev, [name]: err }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const err = validateField(name as CheckoutField, value);
    setErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleApplyDiscount = async () => {
    if (!discountCode || isApplyingDiscount) return;
    setIsApplyingDiscount(true);
    try {
      await applyPromotion(discountCode.trim());
      toast.success(t('checkout.discountSuccess'));
    } catch {
      setError(t('checkout.invalidDiscount'));
      toast.error(t('checkout.invalidDiscount'));
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = async () => {
    try {
      await removePromotion();
      setDiscountCode('');
    } catch {
      toast.error(t('checkout.invalidDiscount'));
    }
  };

  const handleSubmitAddress = async () => {
    const next = validateAll();
    setErrors(next);
    setTouched({
      firstName: true, lastName: true, email: true,
      address: true, city: true, postalCode: true, phone: true, province: true,
    });
    if (Object.keys(next).length > 0) {
      toast.error(t('checkout.validation.fix'));
      return;
    }
    if (!cartId) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const address = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        address_1: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
        // Lower-case ISO 3166-2 (e.g. "it-mi") so Medusa matches province zones;
        // the GLS backend converts it to the 2-letter code for its Provincia field.
        province: formData.province || undefined,
        country_code: formData.countryCode,
        phone: formData.phone,
      };
      await sdk.store.cart.update(cartId, {
        email: formData.email,
        shipping_address: address,
        billing_address: address,
        // Locale lives on cart metadata so downstream consumers
        // (Nexi HPP language, order-confirmation email template)
        // can localise without threading the language through every
        // step of the funnel.
        metadata: { locale: language },
      } as any);
      setStep('shipping');
    } catch (err: any) {
      const msg = err.message || t('checkout.addressError');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectShipping = async () => {
    if (!cartId || !selectedShipping) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await sdk.store.cart.addShippingMethod(cartId, {
        option_id: selectedShipping,
      });
      setStep('payment');
    } catch (err: any) {
      const msg = err.message || t('checkout.shippingError');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // M37: fire-and-forget newsletter opt-in. Reuses the exact /store/newsletter
  // call the newsletter popup makes (same endpoint, same headers, same body).
  // Never throws — a failed opt-in must not block/undo a placed order.
  const subscribeNewsletter = async (email: string) => {
    try {
      const publishableKey = (import.meta as any).env?.VITE_MEDUSA_PUBLISHABLE_KEY || '';
      await fetch(`${MEDUSA_BACKEND_URL}/store/newsletter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(publishableKey ? { 'x-publishable-api-key': publishableKey } : {}),
        },
        body: JSON.stringify({ email, language }),
      });
    } catch {
      // Swallow — the order is already placed; opt-in is best-effort.
    }
  };

  const handlePlaceOrder = async () => {
    if (!cartId) return;
    // M36: block checkout until the sale-terms / withdrawal box is ticked.
    // This runs before any payment session / cart completion, so nothing is
    // charged while the gate is unmet.
    if (!termsAccepted) {
      setTermsError(t('checkout.terms.error' as any));
      toast.error(t('checkout.terms.error' as any));
      return;
    }
    setTermsError(null);
    setIsSubmitting(true);
    setError(null);
    try {
      // Re-pull the cart so the payment session has the latest totals
      // (address + shipping method were set in earlier steps).
      const { cart } = await sdk.store.cart.retrieve(cartId);

      // Pick (or create) a payment session for the Nexi provider. The
      // provider service returns either a real Nexi HPP URL or a mock
      // payment URL depending on NEXI_XPAY_MOCK_MODE on the backend.
      const initRes = await (sdk.store.payment as any).initiatePaymentSession(cart, {
        provider_id: NEXI_PROVIDER_ID,
      });
      // Require the Nexi session explicitly — do NOT fall back to sessions[0].
      // A missing session means the provider did not initialise correctly; we
      // must throw rather than silently completing the cart with no payment.
      const session = initRes?.payment_collection?.payment_sessions?.find(
        (s: any) => s.provider_id === NEXI_PROVIDER_ID
      );
      if (!session) {
        throw new Error('Payment session unavailable — please refresh and try again.');
      }
      const hostedPage = session.data?.hostedPage as string | undefined;

      // Mock mode: VITE_NEXI_MOCK_MODE=true in the UI env, OR the backend
      // returned a mock URL (contains "mock-payment" — real Nexi URLs never will).
      // We skip the HPP redirect entirely and complete the cart in-line so we can
      // exercise the order-placed → email flow end-to-end without real Nexi creds.
      const isMockMode =
        import.meta.env.VITE_NEXI_MOCK_MODE === 'true' ||
        (!!hostedPage && /mock-payment/i.test(hostedPage));

      if (!isMockMode) {
        if (!hostedPage) {
          // Real Nexi session but no hosted-page URL — configuration error.
          throw new Error('Payment session unavailable — please refresh and try again.');
        }
        // Real Nexi HPP — redirect; Nexi will bounce back to a return
        // URL configured on the server side that completes the cart.
        window.location.href = hostedPage;
        return;
      }

      // Mock / dev path — complete the cart in-line.
      const completion = (await sdk.store.cart.complete(cartId)) as any;
      if (completion?.type === 'cart' || completion?.cart) {
        const errors = (completion.error ?? completion.errors ?? []) as any[];
        throw new Error(
          errors?.[0]?.message ?? t('checkout.placeOrderError' as any)
        );
      }

      const orderId = completion?.order?.id ?? completion?.id;
      if (!orderId) throw new Error('Missing order id after cart completion.');

      // M37: order placed → fire the newsletter opt-in if the box was ticked.
      // Fire-and-forget (doesn't block navigation; failures are swallowed).
      if (newsletterOptIn && formData.email) {
        void subscribeNewsletter(formData.email.trim());
      }

      // Clear the cart handle + checkout draft so the next order starts fresh.
      safeRemoveItem('primo_cart_id');
      clearCheckoutDraft();
      navigate(`/checkout/confirmation/${orderId}`);
    } catch (err: any) {
      const msg = err?.message || t('checkout.placeOrderError' as any);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Shipping cost = resolved price of the option the user just selected.
  // Flat options carry it inline; calculated (GLS) options resolve via the
  // calculate endpoint (priceFor). Medusa v2 amounts are DECIMAL MAJOR UNITS.
  // Falls back to 0 until a method is picked / its price resolves, so the order
  // summary always reflects the current cart state.
  const selectedShippingOption = shippingOptions.find(
    (o: any) => o.id === selectedShipping
  );
  const selectedShippingPrice = selectedShippingOption ? priceFor(selectedShippingOption) : undefined;
  const isSelectedPricing = selectedShippingOption ? isPricing(selectedShippingOption) : false;
  const shippingCost: number = selectedShippingPrice != null ? selectedShippingPrice : 0;
  // An option is selected but its price hasn't resolved yet (calculated/GLS
  // quote in flight). While pending, the shipping cost is UNKNOWN — we must not
  // render the Total as `cartTotal + 0`, which would understate it. Show the
  // Total (and its VAT line) as pending/TBD until the price arrives.
  const shippingPending = !!selectedShippingOption && (isSelectedPricing || selectedShippingPrice == null);
  // cartTotal already reflects post-discount item total (subtotal − cartDiscountTotal).
  const finalTotal = cartTotal + shippingCost;

  if (cartItems.length === 0) {
    return (
      <main className="flex-1 min-h-screen bg-background">
        <CheckoutHero step={step} />
        <Container className="text-center lg:!max-w-[976px] lg:mx-auto pt-16 sm:pt-20 lg:pt-24 pb-16 sm:pb-24">
          <Trash2 aria-hidden="true" className="mx-auto w-11 h-11 text-foreground" strokeWidth={1.3} />
          <h1 className="mt-4 text-[26px] sm:text-3xl font-semibold tracking-[-0.6px] text-card-foreground">{t('checkout.emptyCart')}</h1>
          <p className="mt-2.5 mx-auto max-w-[320px] font-sans text-[15px] leading-[22px] text-muted-foreground">
            {t('checkout.emptyCartSubtitle')}
          </p>
          <Link to="/semipermanente" className={`${PRIMARY_PILL_LG} mt-6`}>
            {t('checkout.discoverProducts')}
          </Link>
        </Container>
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-screen bg-background">
      <CheckoutHero step={step} />

      <Container className="lg:!max-w-[976px] lg:mx-auto pb-16 sm:pb-20 lg:pb-28">
        {error && (
          <div
            role="alert"
            className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-[16px] text-destructive text-sm"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 lg:gap-12 lg:items-start">

          {/* Left Column - Forms */}
          <div className="space-y-6 sm:space-y-8 lg:order-1">

            {/* Contact + Address */}
            <Card radius="lg" onKeyDown={(e: React.KeyboardEvent) => {
              const el = e.target as HTMLInputElement;
              if (step === 'info' && e.key === 'Enter' && el.tagName === 'INPUT' && INFO_FIELD_ORDER.includes(el.id)) {
                e.preventDefault();
                focusNextInfoField(el.id);
              }
            }} className={`rounded-[28px] lg:rounded-[32px] border-[#e6e1dc] shadow-[0_30px_60px_-36px_rgba(0,0,0,0.3)] p-6 sm:p-9 space-y-6 sm:space-y-8 ${step !== 'info' ? 'opacity-60 pointer-events-none' : ''}`}>
              <SectionHeader n={1} title={t('checkout.contactInfo')} done={step !== 'info'} />

              {/* M40: Contatti holds Email + Phone (courier) + newsletter opt-in,
                  matching the client prototype. Name fields moved down to the
                  address section; the field wiring (names/validation) is unchanged. */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-x-3.5 sm:gap-y-4">
                <div className="md:col-span-2">
                  <Field id="email" name="email" type="email" label={t('checkout.email')} placeholder={t('checkout.emailPlaceholder')} value={formData.email} error={errors.email} onChange={handleChange} onBlur={handleBlur} autoComplete="email" inputMode="email" />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="phone" className={CHECKOUT_LABEL_CLS}>
                    {t('checkout.phone')} <span className="font-normal normal-case italic text-muted-foreground/80">{t('checkout.phoneHelper' as any)}</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    placeholder={phonePlaceholderFor(formData.countryCode)}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="tel"
                    inputMode="tel"
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? 'phone-error' : undefined}
                    className={checkoutInputCls(!!errors.phone)}
                  />
                  {errors.phone && (
                    <p id="phone-error" role="alert" className="font-sans text-[12.5px] leading-4 text-destructive mt-1.5 ml-4">
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-[#e6e1dc]">
                <SectionHeader n={2} title={t('checkout.shippingAddress')} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-x-3.5 sm:gap-y-4">
                <Field id="firstName" name="firstName" type="text" label={t('checkout.firstName')} placeholder={t('checkout.firstNamePlaceholder')} value={formData.firstName} error={errors.firstName} onChange={handleChange} onBlur={handleBlur} autoComplete="given-name" />
                <Field id="lastName" name="lastName" type="text" label={t('checkout.lastName')} placeholder={t('checkout.lastNamePlaceholder')} value={formData.lastName} error={errors.lastName} onChange={handleChange} onBlur={handleBlur} autoComplete="family-name" />
                <div className="md:col-span-2">
                  <Field id="address" name="address" type="text" label={t('checkout.fullAddress')} placeholder={t('checkout.addressPlaceholder')} value={formData.address} error={errors.address} onChange={handleChange} onBlur={handleBlur} autoComplete="street-address" />
                </div>
                <Field id="postalCode" name="postalCode" type="text" label={t('checkout.postalCode')} placeholder={t('checkout.postalCodePlaceholder')} value={formData.postalCode} error={errors.postalCode} onChange={(e) => { handleChange(e); if (formData.countryCode === 'it' && /^\d{5}$/.test(e.target.value) && e.target.value.length > formData.postalCode.length && e.target.selectionStart === 5) focusNextInfoField('postalCode'); }} onBlur={handleBlur} autoComplete="postal-code" inputMode="numeric" />
                <Field id="city" name="city" type="text" label={t('checkout.city')} placeholder={t('checkout.cityPlaceholder')} value={formData.city} error={errors.city} onChange={handleChange} onBlur={handleBlur} autoComplete="address-level2" />
                {/* Province only applies to Italy (GLS uses the country code for
                    other destinations), so it's shown only for Italian addresses. */}
                {formData.countryCode === 'it' && (
                  <div className="flex flex-col md:col-span-2">
                    <label htmlFor="province" className={CHECKOUT_LABEL_CLS}>{t('checkout.province' as any)}</label>
                    <ProvinceSelect
                      id="province"
                      value={formData.province}
                      invalid={!!errors.province}
                      onChange={(code) => {
                        setFormData(prev => ({ ...prev, province: code }));
                        setTouched(tt => ({ ...tt, province: true }));
                        setErrors(e => ({ ...e, province: validateField('province', code) }));
                        focusNextInfoField('province');
                      }}
                      onBlur={() => {
                        setTouched(tt => ({ ...tt, province: true }));
                        setErrors(e => ({ ...e, province: validateField('province', formData.province) }));
                      }}
                    />
                    {errors.province && <p className="font-sans text-[12.5px] leading-4 text-destructive mt-1.5 ml-4" role="alert">{errors.province}</p>}
                  </div>
                )}
                <div className="flex flex-col md:col-span-2">
                  <label htmlFor="countryCode" className={CHECKOUT_LABEL_CLS}>{t('checkout.country')}</label>
                  <CountrySelect
                    id="countryCode"
                    value={formData.countryCode}
                    options={countries.length > 0 ? countries : [{ iso_2: 'it', display_name: 'Italia' }]}
                    loading={countriesLoading}
                    disabled={countriesLoading || countries.length === 0}
                    onChange={(iso2) => {
                      // Clear the province (value + error) when leaving Italy so a
                      // stale code is never sent for a non-Italian address.
                      setFormData(prev => ({ ...prev, countryCode: iso2, province: iso2 === 'it' ? prev.province : '' }));
                      setErrors(e => ({ ...e, province: undefined }));
                      focusNextInfoField('countryCode');
                    }}
                  />
                </div>
              </div>

              {step === 'info' && (
                <Button
                  id="continue-info-btn"
                  type="button"
                  onClick={handleSubmitAddress}
                  disabled={isSubmitting}
                  size="lg"
                  fullWidth
                  uppercase
                  trailingIcon={<ChevronRight className="w-4 h-4" />}
                >
                  {isSubmitting ? t('checkout.saving') : t('checkout.continueShipping')}
                </Button>
              )}
            </Card>

            {/* Shipping Method */}
            {step !== 'info' && (
              <Card radius="lg" id="shipping-step" className={`scroll-mt-32 rounded-[28px] lg:rounded-[32px] border-[#e6e1dc] shadow-[0_30px_60px_-36px_rgba(0,0,0,0.3)] p-6 sm:p-9 space-y-6 sm:space-y-8 ${step !== 'shipping' ? 'opacity-60 pointer-events-none' : ''}`}>
                <h2 className="font-sans flex items-center gap-3 text-[22px] sm:text-[26px] leading-tight font-semibold tracking-[-0.6px] text-card-foreground">
                  <Truck className="flex-none w-6 h-6 text-foreground" strokeWidth={1.8} aria-hidden="true" />
                  {t('checkout.shippingMethod')}
                  {step === 'payment' && <span className="ml-auto text-xs text-success font-bold" aria-hidden="true">✓</span>}
                </h2>

                {shippingOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('checkout.loadingShipping')}</p>
                ) : (
                  <div className="grid gap-2.5">
                    {shippingOptions.map((option: any) => {
                      const selected = selectedShipping === option.id;
                      return (
                        <label
                          key={option.id}
                          className={`relative flex items-center gap-3.5 min-h-[68px] px-4 py-3 border rounded-[20px] bg-card cursor-pointer transition-[border-color,box-shadow,background-color] duration-200 ${
                            selected
                              ? 'border-foreground shadow-[0_0_0_1px_var(--color-foreground)] bg-surface'
                              : 'border-[#e6e1dc] hover:border-[#b9b3ad]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="shipping"
                            value={option.id}
                            checked={selected}
                            onChange={() => setSelectedShipping(option.id)}
                            className={`flex-none w-[22px] h-[22px] appearance-none rounded-full bg-card cursor-pointer transition-[border] duration-200 focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2 ${
                              selected ? 'border-[7px] border-foreground' : 'border-[1.5px] border-[#c9c4bf]'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            {/* Options are named "Standard Shipping — <zone>" so admins
                                can tell the 6 per-zone options apart; strip the zone
                                suffix so customers just see "Standard Shipping". */}
                            <p className="font-sans text-[15px] font-bold text-foreground">{String(option.name ?? '').split(' — ')[0] || option.name}</p>
                            {option.type?.description && <p className="font-sans text-[12.5px] text-muted-foreground mt-0.5">{option.type.description}</p>}
                          </div>
                          <span className="text-[15px] font-bold text-foreground whitespace-nowrap shrink-0">
                            {isPricing(option) ? (
                              <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium text-sm">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                {t('checkout.calculatingPrice')}
                              </span>
                            ) : priceFor(option) != null ? (
                              priceFor(option) === 0 ? <span className="text-success">{t('checkout.freeShipping')}</span> : formatPrice(priceFor(option) as number, language)
                            ) : (
                              <span className="text-muted-foreground font-medium text-sm">{t('checkout.shippingTBD')}</span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <p className="font-sans text-[12.5px] leading-[18px] text-muted-foreground -mt-2">
                  {t('checkout.shippingNote')}{' '}
                  <Link to="/spedizioni#tariffe" className="text-foreground underline underline-offset-[3px] decoration-[#c9c4bf] hover:decoration-foreground">
                    {t('checkout.shippingRatesLink')}
                  </Link>.
                </p>

                {step === 'shipping' && (
                  <Button
                    type="button"
                    onClick={handleSelectShipping}
                    disabled={isSubmitting || !selectedShipping}
                    size="lg"
                    fullWidth
                    uppercase
                    trailingIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    {isSubmitting ? t('checkout.saving') : t('checkout.continuePayment')}
                  </Button>
                )}
              </Card>
            )}

            {/* Payment — SINGLE Nexi HPP redirect step. NOT a card-capture form:
                no PAN/Exp/CVC inputs, no Luhn, no PayPal/bonifico. The accepted-card
                badges are decoration only; the real pay action is handlePlaceOrder
                → Nexi redirect, triggered by the button in the order summary. */}
            {step === 'payment' && (
              <Card radius="lg" className="rounded-[28px] lg:rounded-[32px] border-[#e6e1dc] shadow-[0_30px_60px_-36px_rgba(0,0,0,0.3)] p-6 sm:p-9 space-y-5">
                <div className="space-y-2">
                  <SectionHeader n={3} title={t('checkout.paymentMethod')} />
                  <p className="flex items-center gap-2 font-sans text-[13px] leading-[18px] text-muted-foreground">
                    <Lock className="flex-none w-4 h-4 text-success" strokeWidth={1.8} aria-hidden="true" />
                    {t('checkout.paymentSecureNote')}
                  </p>
                </div>
                <div className="flex items-center gap-3.5 min-h-[68px] px-4 py-3 border border-foreground rounded-[20px] bg-surface shadow-[0_0_0_1px_var(--color-foreground)]">
                  <span aria-hidden="true" className="flex-none grid place-items-center w-[22px] h-[22px] rounded-full border-[7px] border-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-[15px] font-bold text-foreground">Nexi XPay</p>
                    <p className="font-sans text-[12.5px] text-muted-foreground mt-0.5">{t('checkout.paymentRedirect')}</p>
                  </div>
                  <div className="shrink-0">
                    <PaymentMethods />
                  </div>
                </div>
                {/* Next-step notice: the pay action lives in the order summary, so say so. */}
                <div role="note" className="flex items-start gap-3 px-4 py-3.5 rounded-[16px] bg-surface border border-[#e6e1dc]">
                  <Info className="flex-none w-[18px] h-[18px] mt-0.5 text-foreground" strokeWidth={1.8} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-[14px] leading-5 font-semibold text-foreground">{t('checkout.payHintTitle' as any)}</p>
                    <p className="font-sans text-[13px] leading-[19px] text-muted-foreground mt-0.5">{t('checkout.payHint' as any)}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Order Summary (sticky rail) */}
          <div className="lg:order-2">
            <Card
              radius="lg"
              id="order-summary"
              className="scroll-mb-8 lg:sticky lg:top-[120px] rounded-[28px] lg:rounded-[32px] border-[#e6e1dc] bg-surface shadow-[0_30px_60px_-36px_rgba(0,0,0,0.3)] p-6 sm:p-8"
            >
              <h3 className="font-sans text-[22px] leading-7 font-semibold tracking-[-0.4px] text-card-foreground mb-5">{t('checkout.orderSummary')}</h3>

              <ul className="list-none m-0 p-0 max-h-[300px] overflow-y-auto overscroll-contain custom-scrollbar">
                {cartItems.map((item, idx) => (
                  <li key={item.id} className={`grid grid-cols-[60px_1fr_auto] gap-3.5 items-center py-3 ${idx > 0 ? 'border-t border-[#e6e1dc]' : ''}`}>
                    {/* Outer wrapper is NOT clipped so the quantity badge at the
                        corner stays visible; the inner div keeps the rounded
                        image clipped. */}
                    <div className="relative w-[60px] h-[60px]">
                      <div className="w-[60px] h-[60px] rounded-[14px] border border-[#e6e1dc] bg-card overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted" />
                        )}
                      </div>
                      <div
                        aria-label={t('checkout.qtyLabel', { count: item.quantity })}
                        className="absolute -top-[7px] -right-[7px] min-w-[22px] h-[22px] px-1.5 rounded-full bg-foreground text-background text-[11px] font-bold flex items-center justify-center shadow-[0_0_0_2px_var(--surface)]"
                      >
                        {item.quantity}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="font-sans text-[14.5px] leading-[19px] font-bold text-foreground truncate">{item.name}</p>
                      {item.capacity && <p className="font-sans text-[12.5px] leading-[17px] text-muted-foreground mt-0.5">{item.capacity}</p>}
                    </div>
                    <div className="text-right">
                      <div className="font-sans text-[14.5px] font-bold text-foreground tabular-nums">{formatPrice(parseFloat(item.price) * item.quantity, language)}</div>
                      {item.quantity > 1 && (
                        <div className="font-sans text-[11px] text-muted-foreground mt-0.5 tabular-nums">{item.quantity} × {formatPrice(item.price, language)}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Discount Form */}
              <div className="flex gap-2 mt-3.5">
                <div className="relative flex-1">
                  <div aria-hidden="true" className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <label htmlFor="discount-code" className="sr-only">{t('checkout.discountPlaceholder')}</label>
                  <input
                    id="discount-code"
                    type="text"
                    placeholder={t('checkout.discountPlaceholder')}
                    value={discountApplied ? cartPromotions[0]?.code ?? discountCode : discountCode}
                    onChange={e => setDiscountCode(e.target.value)}
                    disabled={discountApplied || isApplyingDiscount}
                    className="w-full h-12 pl-11 pr-4 rounded-pill border border-[#e6e1dc] bg-card outline-none transition-[border-color,box-shadow] duration-200 hover:border-[#c9c4bf] focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-foreground/10 font-sans text-sm uppercase disabled:opacity-50"
                  />
                </div>
                {discountApplied ? (
                  <button
                    type="button"
                    onClick={handleRemoveDiscount}
                    className="flex-none h-12 px-5 rounded-pill border-[1.2px] border-[#c9c4bf] bg-card font-sans text-sm font-semibold text-foreground transition-colors hover:border-black hover:bg-black hover:text-white active:scale-[0.97]"
                  >
                    {t('checkout.remove' as any)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyDiscount}
                    disabled={!discountCode || isApplyingDiscount}
                    className="flex-none h-12 px-5 rounded-pill border-[1.2px] border-[#c9c4bf] bg-card font-sans text-sm font-semibold text-foreground transition-colors hover:border-black hover:bg-black hover:text-white active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {t('checkout.apply')}
                  </button>
                )}
              </div>

              <dl className="mt-[18px] pt-1.5 border-t border-[#e6e1dc]">
                <div className="flex justify-between items-baseline gap-3 py-[7px]">
                  <dt className="font-sans text-sm text-muted-foreground">{t('checkout.subtotal')}</dt>
                  <dd className="m-0 font-sans text-[14.5px] font-bold text-foreground tabular-nums whitespace-nowrap">{formatPrice(cartSubtotal, language)}</dd>
                </div>
                {cartDiscountTotal > 0 && (
                  <div className="flex justify-between items-baseline gap-3 py-[7px]">
                    <dt className="font-sans text-sm text-success flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 shrink-0" />
                      {t('checkout.discount' as any)}
                      {cartPromotions[0]?.code ? ` (${cartPromotions[0].code})` : ''}
                    </dt>
                    <dd className="m-0 font-sans text-[14.5px] font-bold text-success tabular-nums whitespace-nowrap">−{formatPrice(cartDiscountTotal, language)}</dd>
                  </div>
                )}
                <div className="flex justify-between items-baseline gap-3 py-[7px]">
                  <dt className="font-sans text-sm text-muted-foreground flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 shrink-0" /> {t('checkout.shipping')}</dt>
                  <dd className="m-0 font-sans text-[14.5px] font-bold text-foreground tabular-nums whitespace-nowrap">{
                    !selectedShippingOption
                      ? t('checkout.shippingTBD')
                      : isSelectedPricing
                        ? <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium"><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />{t('checkout.calculatingPrice')}</span>
                        : selectedShippingPrice == null
                          ? t('checkout.shippingTBD')
                          : shippingCost === 0
                            ? <span className="text-success">{t('checkout.freeShipping')}</span>
                            : formatPrice(shippingCost, language)
                  }</dd>
                </div>
                {/* Free-shipping nudge sits directly under the delivery price it
                    relates to — destination-aware ("€X to free shipping"), so it
                    reads as guidance on the shipping cost, not a checkout error. */}
                <div className="py-[7px]">
                  <FreeShippingProgress
                    country={formData.countryCode}
                    province={formData.province || undefined}
                    postal={formData.postalCode || undefined}
                    subtotal={cartItemTotal}
                  />
                </div>

                <div className="flex justify-between items-baseline gap-3 mt-2 pt-3.5 border-t border-[#e6e1dc]">
                  <dt className="font-sans text-base font-bold text-foreground">
                    {t('checkout.total')}
                    {/* While a selected shipping price is still resolving the total
                        is incomplete — never show `cartTotal + 0` as if final. */}
                    {!shippingPending && vatPortion(finalTotal, vatRate) > 0 && (
                      <small className="ml-1 font-sans text-xs font-normal text-muted-foreground">{t('checkout.vatIncluded', { rate: vatRate })}</small>
                    )}
                  </dt>
                  <dd className="m-0 font-sans text-[22px] font-extrabold text-foreground tabular-nums whitespace-nowrap">{
                    shippingPending
                      ? <span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm font-medium"><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />{t('checkout.calculatingPrice')}</span>
                      : formatPrice(finalTotal, language)
                  }</dd>
                </div>
              </dl>

              {step === 'payment' && (
                <div id="order-confirm" className="scroll-mt-32">
                  {/* M36: required sale-terms + right-of-withdrawal acceptance,
                      directly above the pay button. Order submit is gated on it. */}
                  <label className="flex items-start gap-3 mt-5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="terms"
                      checked={termsAccepted}
                      aria-invalid={!!termsError}
                      aria-describedby={termsError ? 'terms-error' : undefined}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked);
                        if (e.target.checked) setTermsError(null);
                      }}
                      className={`mt-0.5 flex-none w-[18px] h-[18px] rounded-[5px] border-[1.5px] accent-foreground cursor-pointer focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-2 ${termsError ? 'border-destructive' : 'border-[#c9c4bf]'}`}
                    />
                    <span className="font-sans text-[13px] leading-[18px] text-muted-foreground">
                      {t('checkout.terms.label' as any)}{' '}
                      <Link to="/spedizioni#condizioni" className="text-foreground underline underline-offset-[3px] decoration-[#c9c4bf] hover:decoration-foreground">
                        {t('checkout.terms.linkText' as any)}
                      </Link>{' '}
                      {t('checkout.terms.suffix' as any)}
                    </span>
                  </label>
                  {termsError && (
                    <p id="terms-error" role="alert" className="font-sans text-[12.5px] leading-4 text-destructive mt-1.5 ml-[30px]">
                      {termsError}
                    </p>
                  )}
                  {/* M37: newsletter opt-in. Lives here in the order summary —
                      alongside the terms checkbox and directly above the pay
                      button — because the Contatti card is dimmed/non-interactive
                      (`pointer-events-none`) at the payment step. Placing it
                      outside that wrapper keeps it reachable where the user
                      actually submits. handlePlaceOrder reads `newsletterOptIn`;
                      the opt-in POST wiring is unchanged. */}
                  <label className="flex items-start gap-3 mt-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="newsletter"
                      checked={newsletterOptIn}
                      onChange={(e) => setNewsletterOptIn(e.target.checked)}
                      className="mt-0.5 flex-none w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-[#c9c4bf] accent-foreground cursor-pointer focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-2"
                    />
                    <span className="font-sans text-[13px] leading-[18px] text-muted-foreground">
                      {t('checkout.newsletter.label' as any)}
                    </span>
                  </label>
                  <Button
                    id="place-order-btn"
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    size="lg"
                    fullWidth
                    uppercase
                    className="mt-4"
                    leadingIcon={<ShieldCheck className="w-4 h-4" />}
                    trailingIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    {t('checkout.placeOrder')}
                  </Button>
                </div>
              )}

              {/* Trust list (prototype `.co-trust`) */}
              <ul className="grid gap-2.5 mt-[18px] pt-[18px] border-t border-[#e6e1dc] list-none p-0 font-sans text-[13px] leading-[18px] text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <Truck className="flex-none w-5 h-5 text-foreground" strokeWidth={1.5} aria-hidden="true" />
                  {t('checkout.trustShippedFrom')}
                </li>
                <li className="flex items-center gap-2.5">
                  <RotateCcw className="flex-none w-5 h-5 text-foreground" strokeWidth={1.5} aria-hidden="true" />
                  <span>
                    {t('checkout.trustReturns')} ·{' '}
                    <Link to="/spedizioni#condizioni" className="text-foreground underline underline-offset-[3px] decoration-[#c9c4bf] hover:decoration-foreground">
                      {t('checkout.trustConditions')}
                    </Link>
                  </span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </Container>
    </main>
  );
};
