import React from 'react';
import { computeSalePercent } from '../../lib/sale';
import { Badge } from './Badge';

/**
 * Red "N%" sale pill (prototype's `.p-badge`). Pairs with `computeSalePercent`
 * so callers pass raw major-unit price strings and the pill renders NOTHING
 * when there is no genuine discount (null → no element). This is the single
 * source for the B6 fix: ProductCard and QuickView previously reimplemented the
 * raw `Math.round((1 - price/original)*100)` formula inline and could render a
 * bogus "0%"/"-5%"/"NaN%" for equal/lower/zero/malformed originals.
 *
 * Each call-site's historical RED + markup is preserved VERBATIM behind a
 * `variant` (the user explicitly declined red/markup consolidation):
 *  - `pdp`   — ProductDetail's `bg-[#ff4040] rounded-[13px]` block, 25.1px tall.
 *  - `modal` — QuickViewModal's `bg-[#ff4040] rounded-[13px]` grid, 25px tall.
 *  - `card`  — ProductCard's `Badge variant="sale"` (`--badge-sale` token).
 *
 * `className` is appended so each call-site keeps its exact spacing/overrides.
 */
export type SalePillVariant = 'pdp' | 'modal' | 'card';

export interface SalePillProps {
  /** Current (selected) price — formatted major-unit string, e.g. "8.00". */
  current: string | null | undefined;
  /** Original / compare-at price — formatted major-unit string, e.g. "10.00". */
  original: string | null | undefined;
  /** Which call-site's historical markup/red to render. */
  variant: SalePillVariant;
  /** Extra classes appended to the pill (spacing/overrides per call-site). */
  className?: string;
}

const PDP_CLASS =
  'inline-grid place-items-center font-sans font-bold text-white bg-[#ff4040] rounded-[13px] w-fit min-w-[59.4px] px-3 h-[25.1px] text-[14px] leading-none';

const MODAL_CLASS =
  'grid h-[25px] min-w-[59px] place-items-center rounded-[13px] bg-[#ff4040] px-2 text-[15px] font-bold leading-none text-white md:h-[25px] md:text-[14px]';

export const SalePill: React.FC<SalePillProps> = ({ current, original, variant, className }) => {
  const percent = computeSalePercent(current, original);
  if (percent === null) return null;

  if (variant === 'card') {
    return (
      <Badge variant="sale" className={className}>
        {percent}%
      </Badge>
    );
  }

  const base = variant === 'pdp' ? PDP_CLASS : MODAL_CLASS;
  return <span className={className ? `${base} ${className}` : base}>{percent}%</span>;
};
