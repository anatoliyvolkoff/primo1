import { motion } from 'motion/react';
import { Truck, Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { formatPrice } from '../../lib/formatPrice';
import { useShippingEstimate } from '../../hooks/useShippingEstimate';

/**
 * Fill colour for the free-shipping progress bar: blends a neutral slate → emerald
 * as the bar fills, so "closer to free = greener" and 100% is fully green. Pure
 * function of pct (0–100); eased slightly so it stays calm early and greens as it
 * nears the threshold rather than looking alarming at low values.
 */
export function freeShipBarColor(pct: number): string {
  const t = Math.pow(Math.max(0, Math.min(1, pct / 100)), 1.2);
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  // slate-400 (148,163,184) → emerald-500 (16,185,129)
  return `rgb(${lerp(148, 16)} ${lerp(163, 185)} ${lerp(184, 129)})`;
}

type Kind = 'remaining' | 'unlocked' | 'rates';

/**
 * Pure, presentational free-shipping nudge — no data fetching, so it's trivial to
 * preview and unit-test. Understated on purpose (it sits under the Shipping line
 * in the checkout summary): a muted label + a thin progress bar that greens as it
 * fills, a green "unlocked" line at 100%, or a quiet rates link when a destination
 * can never ship free.
 */
export function FreeShipNudge({
  kind,
  pct = 0,
  remainingText,
  linkText,
  unlockedText,
  ratesText,
  ratesHref = '/spedizioni',
}: {
  kind: Kind;
  pct?: number;
  remainingText?: string;
  linkText?: string;
  unlockedText?: string;
  ratesText?: string;
  ratesHref?: string;
}) {
  if (kind === 'rates') {
    return (
      <Link
        to={ratesHref}
        className="group mt-2.5 flex items-center justify-between gap-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="inline-flex items-center gap-2">
          <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {ratesText}
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    );
  }

  if (kind === 'unlocked') {
    return (
      <div className="mt-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-success">
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {unlockedText}
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={100} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full w-full rounded-full bg-success" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {remainingText}
        </span>
        <Link
          to={ratesHref}
          className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {linkText}
        </Link>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: freeShipBarColor(pct) }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/**
 * Destination-aware free-shipping nudge shown under the Shipping line in the
 * checkout summary. Reads the live per-zone threshold from the backend estimate
 * (same source as the charged price), so it shows exactly how much more the
 * customer needs to add — or the unlocked state once reached. Islands /
 * free-shipping-off resolve to a quiet rates link instead of a false promise.
 */
export function FreeShippingProgress({
  country,
  province,
  postal,
  subtotal,
}: {
  country?: string;
  province?: string;
  postal?: string;
  subtotal: number;
}) {
  const { t, language } = useLanguage();
  const { data, isPending } = useShippingEstimate({ country, province, postal, subtotal });

  // Nothing to show until we have a destination + a resolved estimate.
  if (!country || isPending || !data) return null;

  if (data.freeThreshold == null) {
    return <FreeShipNudge kind="rates" ratesText={t('checkout.freeShipSeeRates')} />;
  }
  if (data.qualifies) {
    return <FreeShipNudge kind="unlocked" unlockedText={t('checkout.freeShipUnlocked')} />;
  }

  const pct = data.freeThreshold > 0 ? Math.min(100, Math.round((subtotal / data.freeThreshold) * 100)) : 0;
  return (
    <FreeShipNudge
      kind="remaining"
      pct={pct}
      remainingText={t('checkout.freeShipRemaining', { amount: formatPrice(data.remaining ?? 0, language) })}
      linkText={t('checkout.freeShipLink')}
    />
  );
}
