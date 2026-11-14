import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { sdk } from '../lib/medusa';
import { useLanguage } from '../context/LanguageContext';
import { useSeo } from '../lib/useSeo';
import { formatPrice } from '../lib/formatPrice';
import { grossOrderTotal } from '../lib/orderMoney';
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
 * Renders after a successful checkout. Reads the order id from the
 * URL (`/checkout/confirmation/<order_id>`) and pulls the order from
 * Medusa for a definitive receipt — line items, totals, shipping
 * address. The order-placed subscriber on the backend sends the
 * email; this page is the on-page mirror of it.
 *
 * Order rows are public-readable by id post-creation in Medusa v2's
 * Store API. No auth required for the guest checkout flow.
 */
export function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const { t, language } = useLanguage();
  useSeo({ titleKey: 'pageTitle.orderConfirmation', noindex: true });

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Missing order id');
      const res = await (sdk.store as any).order.retrieve(orderId);
      return res.order;
    },
    enabled: !!orderId,
    // A just-placed order can 404 transiently; fail fast instead of the
    // default 3-retry exponential backoff (~14s of silent spinning). (REACT-015)
    retry: 2,
    retryDelay: 1000,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <main className="flex-1 pt-24 sm:pt-28 pb-16 flex items-center justify-center min-h-screen bg-background">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          {t('common.loading' as any)}
        </p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex-1 pt-24 sm:pt-28 pb-16 min-h-screen bg-background">
        <Container>
          <Card radius="lg" className="mx-auto max-w-2xl p-8 sm:p-12 text-center space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-card-foreground">{t('orderConfirmation.notFoundTitle' as any)}</h1>
            <p className="text-muted-foreground">
              {t('orderConfirmation.notFoundBody' as any)}
            </p>
            <Link to="/" className={PRIMARY_PILL_LG}>
              {t('notFound.ctaHome' as any)}
            </Link>
          </Card>
        </Container>
      </main>
    );
  }

  const order = data as any;
  // Medusa v2 returns order amounts in DECIMAL MAJOR UNITS — pass through directly.
  const fmt = (amount: number) => formatPrice(amount, language);

  const items = order.items ?? [];
  const addr = order.shipping_address;
  const orderNumber = order.display_id ? `#${order.display_id}` : order.id;

  return (
    <main className="flex-1 pt-24 sm:pt-28 md:pt-32 pb-16 sm:pb-20 md:pb-24 min-h-screen bg-background">
      <Container>
        <Card radius="lg" className="mx-auto max-w-3xl p-6 sm:p-10 md:p-14 space-y-8">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-success/15 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-card-foreground">
              {t('orderConfirmation.title' as any)}
            </h1>
            <p className="text-muted-foreground">
              {t('orderConfirmation.subtitle' as any, { email: order.email ?? '' } as any)}
            </p>
            <p className="text-sm font-mono text-muted-foreground">
              {t('orderConfirmation.orderNumber' as any)}: <strong className="text-foreground">{orderNumber}</strong>
            </p>
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">
              {t('orderConfirmation.itemsHeader' as any)}
            </h2>
            <ul className="divide-y divide-border">
              {items.map((it: any) => (
                <li key={it.id} className="flex items-center gap-4 py-3">
                  <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
                    {it.thumbnail && (
                      <img src={it.thumbnail} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{it.product_title || it.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.variant_title ? `${it.variant_title} · ` : ''}× {it.quantity}
                    </p>
                  </div>
                  {/* GROSS line total: under tax-inclusive pricing `subtotal` is the
                      NET (pre-VAT) amount, which mismatches the gross grand total.
                      Use `total` (gross) so the line matches cart/checkout + the
                      total. See CartContext for the same rule. */}
                  <p className="text-sm font-medium shrink-0">{fmt(it.total ?? it.unit_price * it.quantity)}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-border pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2 text-sm">
              <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                {t('orderConfirmation.shippingTo' as any)}
              </h2>
              {addr ? (
                <address className="not-italic text-foreground leading-relaxed">
                  {addr.first_name} {addr.last_name}<br />
                  {addr.address_1}<br />
                  {addr.postal_code} {addr.city}
                  {addr.province ? ` (${addr.province})` : ''}
                  <br />
                  {addr.country_code?.toUpperCase()}
                  {addr.phone && <><br />{addr.phone}</>}
                </address>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                {t('orderConfirmation.totals' as any)}
              </h2>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('checkout.subtotal')}</span>
                  {/* GROSS subtotal (VAT-inclusive), matching cart/checkout — NOT
                      `item_subtotal`, which is NET under tax-inclusive pricing and
                      makes Subtotal + Shipping ≠ Total. */}
                  <span>{fmt(order.original_item_total ?? order.item_total ?? order.item_subtotal ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('checkout.shipping')}</span>
                  <span>{order.shipping_total ? fmt(order.shipping_total) : t('checkout.freeShipping')}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-bold">
                  <span>{t('checkout.total')}</span>
                  {/* GROSS grand total. NOT `order.total`, which is amount-
                      OUTSTANDING and becomes 0 once payment captures → would
                      render "€0.00" for a paid order (OA-02). */}
                  <span>{fmt(grossOrderTotal(order))}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {t('orderConfirmation.emailSentNote' as any)}
            </p>
            <Link to="/" className={PRIMARY_PILL_LG}>
              {t('orderConfirmation.continueShopping' as any)}
            </Link>
          </div>
        </Card>
      </Container>
    </main>
  );
}
