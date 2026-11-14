import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { sdk } from '../lib/medusa';
import { useLanguage } from '../context/LanguageContext';
import { useSeo } from '../lib/useSeo';
import { safeGetItem, safeRemoveItem } from '../lib/safeStorage';
import { Container, Card } from '../components/ui';

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

/**
 * Landing page Nexi (or any redirect-based payment provider) bounces
 * the user back to after the hosted-payment-page flow.
 *
 * Two routes share this component:
 *   /checkout/payment-success — auth completed; we need to finish
 *      the Medusa cart → order conversion and forward to the
 *      confirmation page.
 *   /checkout/payment-cancelled — user cancelled or auth failed;
 *      we keep the cart intact and bounce them back to /checkout
 *      with an error message.
 *
 * The actual payment authorisation has already happened on Nexi's
 * side. All we do here is call `sdk.store.cart.complete(cartId)` —
 * Medusa's payment module then verifies the session against Nexi
 * via our provider's `authorizePayment` (which re-fetches the
 * order status from Nexi over our authenticated channel).
 */

interface Props {
  outcome: 'success' | 'cancelled';
}

/**
 * Interpret Medusa's `cart.complete` result.
 *
 * Medusa returns one of two shapes:
 *   { type: "order", order }              — success (INCLUDING the idempotent
 *                                            re-complete of an already-completed
 *                                            cart, which returns the same order,
 *                                            HTTP 200, no error — verified against
 *                                            Medusa 2.13.3).
 *   { type: "cart", cart, error/errors }  — a genuine decline / validation failure.
 *
 * So an already-completed cart must resolve to SUCCESS, not an error — never tell
 * a paid customer "payment failed" just because completion ran twice.
 */
export function interpretCompletion(
  completion: any
): { orderId?: string; errorMessage?: string } {
  const orderId =
    completion?.type === 'order' ? completion?.order?.id ?? completion?.id : undefined;
  if (orderId) return { orderId };
  const errs = completion?.error ?? completion?.errors ?? [];
  const errorMessage = Array.isArray(errs)
    ? errs?.[0]?.message
    : errs?.message ?? (typeof errs === 'string' ? errs : undefined);
  return { errorMessage: errorMessage || undefined };
}

export const PaymentReturn: React.FC<Props> = ({ outcome }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  // 'unresolved' = we can't tell if payment succeeded (cart handle gone) —
  // shown as a neutral, non-alarming message, never "payment failed".
  const [status, setStatus] = useState<'pending' | 'ok' | 'error' | 'unresolved'>('pending');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Strict-mode double-mount guard: the effect re-fires in dev, and we only
  // want a single completion attempt per page-load. (cart.complete is itself
  // idempotent on an already-completed cart — verified — but the ref keeps the
  // flow to one attempt and avoids a redundant round-trip.)
  const completeAttempted = useRef(false);

  useSeo({ titleKey: 'pageTitle.checkout', noindex: true });

  useEffect(() => {
    if (completeAttempted.current) return;
    completeAttempted.current = true;

    const cartId = safeGetItem('primo_cart_id');

    if (outcome === 'cancelled') {
      // User cancelled on Nexi's page. Cart stays open; punt back to
      // the payment step so they can re-attempt.
      setStatus('ok');
      setTimeout(() => navigate('/checkout', { replace: true }), 1500);
      return;
    }

    if (!cartId) {
      // Cart handle is gone — a successful completion clears it, so this is
      // usually a back/refresh/re-redirect onto the success URL AFTER the order
      // was already placed. We can't determine the outcome here (no cart, no
      // order ref) and must NOT guess: showing "payment failed" would be wrong
      // for a paid customer, and redirecting to a remembered order could show a
      // stale/previous order for a NEW declined attempt. So surface a neutral,
      // honest message instead.
      setStatus('unresolved');
      return;
    }

    (async () => {
      try {
        const completion = (await sdk.store.cart.complete(cartId)) as any;
        const { orderId, errorMessage } = interpretCompletion(completion);
        if (!orderId) {
          setStatus('error');
          setErrorMsg(errorMessage || t('checkout.placeOrderError' as any));
          return;
        }

        safeRemoveItem('primo_cart_id');
        setStatus('ok');
        navigate(`/checkout/confirmation/${orderId}`, { replace: true });
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err?.message ?? t('checkout.placeOrderError' as any));
      }
    })();
  }, [outcome, navigate, t]);

  if (status === 'pending') {
    return (
      <main className="flex-1 pt-24 sm:pt-28 md:pt-32 pb-16 flex items-center justify-center min-h-screen bg-background">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          {t('common.loading' as any)}
        </p>
      </main>
    );
  }

  if (status === 'unresolved') {
    // Neutral, honest message — we don't know if payment went through.
    return (
      <main className="flex-1 pt-24 sm:pt-28 md:pt-32 pb-16 min-h-screen bg-background">
        <Container>
          <Card radius="lg" className="mx-auto max-w-2xl p-8 sm:p-12 text-center space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-card-foreground">
              {t('checkout.paymentUnresolvedTitle' as any)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('checkout.paymentUnresolvedBody' as any)}
            </p>
            <Link to="/" className={PRIMARY_PILL_LG}>
              {t('checkout.returnToShop' as any)}
            </Link>
          </Card>
        </Container>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="flex-1 pt-24 sm:pt-28 md:pt-32 pb-16 min-h-screen bg-background">
        <Container>
          <Card radius="lg" className="mx-auto max-w-2xl p-8 sm:p-12 text-center space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-card-foreground">
              {t('checkout.placeOrderError' as any)}
            </h1>
            {errorMsg && (
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
            )}
            <Link to="/checkout" className={PRIMARY_PILL_LG}>
              {t('checkout.returnToShop' as any)}
            </Link>
          </Card>
        </Container>
      </main>
    );
  }

  // outcome === 'cancelled' → ok status briefly before the navigate fires
  return (
    <main className="flex-1 pt-24 sm:pt-28 md:pt-32 pb-16 flex items-center justify-center min-h-screen bg-background">
      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        {t('common.loading' as any)}
      </p>
    </main>
  );
};
