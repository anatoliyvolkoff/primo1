import React from 'react';
import { motion } from 'motion/react';
import { Truck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useStoreSetting } from '../../hooks/useStoreContent';
import { useMinFreeThreshold } from '../../lib/shippingZones';

interface RunningBannerProps {
  text?: string;
  highlight?: string;
  Icon?: React.ElementType;
  direction?: 'left' | 'right';
  /** Extra classes for the highlighted word (e.g. the green "FREE" accent). */
  highlightClassName?: string;
  /**
   * Hide the whole bar below the `sm` breakpoint. Used to drop the
   * free-shipping running line on mobile while keeping the TPO & HEMA one.
   */
  hideOnMobile?: boolean;
  /**
   * Desktop-only strip, matching the prototype's `.marquee.d-only`
   * (`display:none` below the `lg` breakpoint). Opt-in so existing call
   * sites — the TPO & HEMA line, which the prototype shows at every
   * breakpoint — keep rendering on mobile. New Home `d-only` free-shipping
   * strips pass `desktopOnly` to hide below `lg`.
   */
  desktopOnly?: boolean;
  /** Primo1 `.marquee.m-only`: phones/tablets only (hidden from `lg`). */
  mobileOnly?: boolean;
}

function formatThreshold(amount: number): string {
  return `€${amount}`;
}

export const RunningBanner = ({
  text,
  highlight,
  Icon = Truck,
  direction = 'left',
  highlightClassName,
  hideOnMobile = false,
  desktopOnly = false,
  mobileOnly = false,
}: RunningBannerProps) => {
  const { t } = useLanguage();
  // Free shipping is now per-zone (`shipping_rates` store setting). The honest
  // headline before we know the destination is the LOWEST threshold across zones
  // ("free from €99"), derived live from the same setting checkout prices with.
  const minThreshold = useMinFreeThreshold();
  const freeShipEnabled = useStoreSetting<boolean>('free_shipping_enabled', true);
  // No custom text = primo1's free-shipping (`ship`) strip; otherwise the `free` style.
  const isShip = text === undefined;
  const resolvedText = text ?? t('banner.freeShippingText');
  const resolvedHighlight =
    highlight ?? (minThreshold != null ? formatThreshold(minThreshold) : '');
  const xValues = direction === 'left' ? [0, -1000] : [-1000, 0];
  // Visibility: `desktopOnly` matches the prototype's `.marquee.d-only`
  // (`display:none` below `lg`/1024px); `hideOnMobile` hides below `sm`.
  // `desktopOnly` is the stricter hide, so it wins when both are set.
  const displayClass = desktopOnly
    ? 'hidden lg:flex'
    : mobileOnly
      ? 'flex lg:hidden'
      : hideOnMobile
      ? 'hidden sm:flex'
      : 'flex';

  // This banner defaults to the free-shipping message; hide the default marquee
  // when free shipping is off in Admin OR no zone offers it — but keep it if a
  // caller passed a custom `text` (i.e. repurposed the banner for something else).
  if ((!freeShipEnabled || minThreshold == null) && text === undefined) return null;

  return (
    <div
      // A thin 31px black marquee strip at every size (prototype `.marquee`).
      className={`bg-black h-[31px] overflow-hidden items-center ${displayClass} whitespace-nowrap`}
    >
      <motion.div
        animate={{ x: xValues }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="flex items-center"
      >
        {Array.from({ length: 15 }).map((_, i) =>
          isShip ? (
            // Primo1 `[data-kind=ship] .mq-item`: 24px orange truck, sentence case, orange amount.
            <div key={i} className="flex items-center gap-[9px] h-[31px] pl-[9px] pr-[112px]">
              <Icon className="w-6 h-6 text-[#ff7812]" strokeWidth={1.5} />
              <span className="text-[11px] font-bold text-white font-sans">
                {resolvedText} <span className="text-[#ff7812]">{resolvedHighlight}</span>
              </span>
            </div>
          ) : (
            // Primo1 `[data-kind=free] .mq-item`: 16px white icon, 6px gap, 128px rhythm.
            <div key={i} className="flex items-center gap-[6px] h-[31px] pr-[128px]">
              <Icon className="w-4 h-4 text-white" strokeWidth={1.6} />
              <span className="text-[11px] font-bold tracking-[0.02em] uppercase text-white font-sans">
                {resolvedText} <span className={`text-[11px]${highlightClassName ? ` ${highlightClassName}` : ''}`}>{resolvedHighlight}</span>
              </span>
            </div>
          ),
        )}
      </motion.div>
    </div>
  );
};
