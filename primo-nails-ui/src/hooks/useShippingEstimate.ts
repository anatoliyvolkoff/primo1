import { useEffect, useState } from 'react';
import { sdk } from '../lib/medusa';

export interface ShippingEstimate {
  zoneKey: string;
  zoneLabel: string;
  freeShippingEnabled: boolean;
  /** Threshold for this destination; null = never free (islands / disabled). */
  freeThreshold: number | null;
  /** EUR still needed to reach free shipping; 0 once reached; null = never free. */
  remaining: number | null;
  qualifies: boolean;
}

/**
 * Destination-aware free-shipping estimate ("€X to free shipping"). Hits the
 * backend `/store/shipping-estimate`, which reuses the SAME zone resolution +
 * admin `shipping_rates` the checkout prices with, so the figure shown can never
 * disagree with what's charged.
 *
 * Plain useState/useEffect (not React Query) so it's self-contained — the
 * checkout renders it without needing a QueryClient in the surrounding tree.
 * Re-fetches whenever the destination or subtotal changes; a superseded response
 * is ignored so out-of-order replies can't flash a stale figure.
 */
export function useShippingEstimate(params: {
  country?: string;
  province?: string;
  postal?: string;
  subtotal: number;
}) {
  const { country, province, postal, subtotal } = params;
  const [data, setData] = useState<ShippingEstimate | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!country) {
      setData(null);
      return;
    }
    let active = true;
    setIsPending(true);
    const qs = new URLSearchParams();
    qs.set('country', country);
    if (province) qs.set('province', province);
    if (postal) qs.set('postal', postal);
    qs.set('subtotal', String(subtotal));
    // Deferred via Promise.resolve so a synchronous throw (e.g. an SDK mock
    // without client.fetch in tests) surfaces as a caught rejection, not a
    // render crash.
    Promise.resolve()
      .then(() => (sdk.client.fetch as any)(`/store/shipping-estimate?${qs.toString()}`, { method: 'GET' }))
      .then((res: ShippingEstimate) => {
        if (active) {
          setData(res);
          setIsPending(false);
        }
      })
      .catch(() => {
        // Estimate is a non-critical nudge — on failure show nothing rather than
        // an error (checkout pricing is unaffected).
        if (active) {
          setData(null);
          setIsPending(false);
        }
      });
    return () => {
      active = false;
    };
  }, [country, province, postal, subtotal]);

  return { data, isPending };
}
