/**
 * Accepted payment methods shown in the footer. These are the methods Nexi
 * XPay handles for this store (see docs/NEXI-XPAY-INTEGRATION.md): major cards
 * (Visa, Mastercard, American Express) plus Apple Pay and Google Pay.
 *
 * Marks are lightweight inline SVG/CSS (no image assets, crisp at any DPI).
 *
 * Layout mirrors the client prototype's `.pay span` chip (css/site.css): a
 * fixed 40x26 white chip that centers its mark with `display:grid;
 * place-items:center`. The inner mark sizes to its own text and uses
 * `white-space:nowrap`, so wordmarks like "G Pay" render centered and fully
 * visible — no overflow-hidden clipping of an over-wide fixed-width span.
 */
import type { ReactNode } from 'react';

function Chip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className="h-6 w-10 rounded bg-white border border-black/10 grid place-items-center shadow-sm"
    >
      {children}
    </div>
  );
}

export function PaymentMethods() {
  return (
    <div className="flex items-center gap-2 sm:gap-2.5" aria-label="Accepted payment methods">
      <Chip label="Visa">
        <span className="text-[10px] font-black italic tracking-tight text-[#1434CB] whitespace-nowrap">
          VISA
        </span>
      </Chip>

      <Chip label="Mastercard">
        <svg viewBox="0 0 32 20" className="h-3.5" aria-hidden="true">
          <circle cx="13" cy="10" r="6.5" fill="#EB001B" />
          <circle cx="19" cy="10" r="6.5" fill="#F79E1B" fillOpacity="0.9" />
        </svg>
      </Chip>

      <Chip label="American Express">
        <span className="grid place-items-center h-4 w-7 rounded-[2px] bg-[#1F72CD]">
          <span className="text-[5.5px] font-bold text-white leading-none tracking-tight whitespace-nowrap">
            AMEX
          </span>
        </span>
      </Chip>

      <Chip label="Apple Pay">
        <span className="flex items-center gap-[1px] text-[8.5px] font-semibold text-black whitespace-nowrap">
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 shrink-0" fill="currentColor" aria-hidden="true">
            <path d="M17.54 12.9c-.02-2.39 1.95-3.54 2.04-3.6-1.11-1.63-2.85-1.85-3.47-1.87-1.47-.15-2.88.87-3.63.87-.75 0-1.9-.85-3.13-.83-1.6.03-3.09.94-3.92 2.38-1.68 2.9-.43 7.19 1.2 9.55.8 1.15 1.74 2.44 2.99 2.4 1.2-.05 1.65-.78 3.1-.78 1.45 0 1.86.78 3.13.75 1.29-.02 2.11-1.18 2.9-2.33.91-1.34 1.29-2.63 1.31-2.7-.03-.01-2.52-.97-2.54-3.84zM15.14 5.32c.66-.8 1.11-1.91.99-3.02-.95.04-2.1.63-2.78 1.43-.61.71-1.15 1.84-1 2.93 1.06.08 2.14-.54 2.8-1.34z" />
          </svg>
          Pay
        </span>
      </Chip>

      <Chip label="Google Pay">
        <span className="text-[8.5px] font-medium text-[#5F6368] whitespace-nowrap leading-none">
          <span className="text-[#4285F4] font-bold mr-px">G</span> Pay
        </span>
      </Chip>
    </div>
  );
}
