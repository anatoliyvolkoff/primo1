import React from 'react';
import { cn } from './cn';

/**
 * Glossy nail-shape colour swatch — the single source of truth for the painted
 * nail-tip look shared by the Home "Shop by colour" palette
 * (`collections/ShopByColor`) and the header search overlay's "Cerca per colore"
 * grid (`layout/header/SearchOverlay`).
 *
 * Two render branches, matching the catalogue data:
 *  • A swatch WITH a `moodPhoto` renders that painted nail-tip photo directly.
 *  • A swatch WITHOUT one falls back to the CSS nail shape — a `50% / 50%`
 *    ellipse filled with the swatch `color`, the inset gloss shadow
 *    (`PILL_INSET_SHADOW`), an optional glitter-noise overlay, and three blurred
 *    white highlight layers.
 *
 * PURELY VISUAL: no motion, no `<Link>`, no selection ring, no tutorial tooltip —
 * those stay on the consumer's interactive wrapper. The swatch fills its parent
 * (`w-full h-full`), so the wrapper owns the responsive box size.
 */

// Glitter grain overlaid on glittery CSS-fallback swatches (single source).
export const GLITTER_NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5' mix-blend-mode='overlay'/%3E%3C/svg%3E")`;

// Inset gloss on the CSS-fallback nail — only the inset highlights, no outer
// drop shadow (that showed as a faint grey box behind dark/light swatches on the
// white palette). Single source for both consumers.
export const PILL_INSET_SHADOW = `inset -4px -6px 12px rgba(0,0,0,0.35), inset 4px 4px 12px rgba(255,255,255,0.45)`;

export interface NailSwatchColor {
  /** CSS background — solid colour, gradient, or solid + glitter overlay. */
  color: string;
  isGlitter?: boolean;
  /** Painted nail-tip photo path; when present the photo branch renders. */
  moodPhoto?: string;
}

/**
 * Size presets encode the small per-consumer photo nuances so the two call
 * sites stay pixel-identical to how they rendered inline:
 *  • `palette` (Home ShopByColor): photo fills the wrapper + soft drop shadow.
 *  • `grid` (search overlay): fixed 26×62 photo with a hover lift (the lift is
 *    the row's existing `group-hover` affordance, kept here so the photo and the
 *    CSS fallback animate identically).
 */
type NailSwatchSize = 'palette' | 'grid';

export interface NailSwatchProps {
  swatch: NailSwatchColor;
  size?: NailSwatchSize;
  /** Alt text for the photo branch (decorative swatches pass ""). */
  alt?: string;
  /** Extra classes for the root element (consumer owns box size / hover). */
  className?: string;
}

export const NailSwatch: React.FC<NailSwatchProps> = ({
  swatch,
  size = 'palette',
  alt = '',
  className,
}) => {
  const hasMoodPhoto = !!swatch.moodPhoto;

  if (hasMoodPhoto) {
    return (
      <img
        src={swatch.moodPhoto}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          size === 'palette'
            ? 'w-full h-full object-contain drop-shadow-[0_6px_6px_rgba(0,0,0,0.1)]'
            : 'w-[26px] h-[62px] object-contain transition-transform group-hover:-translate-y-[3px]',
          className,
        )}
      />
    );
  }

  // CSS fallback — the glossy `50% / 50%` nail shape. For B&W / y-o the `color`
  // is a linear-gradient carried via the `background` shorthand; only glitter
  // swatches add `backgroundImage` (an explicit `none` would wipe the gradient).
  const shapeStyle: React.CSSProperties = {
    borderRadius: '50% / 50%',
    background: swatch.color,
    boxShadow: PILL_INSET_SHADOW,
    ...(swatch.isGlitter && { backgroundImage: GLITTER_NOISE }),
  };

  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block',
        size === 'grid'
          ? 'w-[26px] h-[62px] transition-transform duration-200 group-hover:-translate-y-[3px] group-active:scale-[0.92] group-active:duration-100'
          : 'w-full h-full',
        className,
      )}
      style={shapeStyle}
    >
      <span
        className="absolute top-[3%] left-[10%] w-[35%] h-[45%] opacity-90 pointer-events-none"
        style={{
          borderRadius: '50% / 50%',
          background:
            'linear-gradient(105deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)',
          transform: 'rotate(-8deg)',
          filter: 'blur(0.5px)',
        }}
      />
      <span
        className="absolute top-[10%] right-[5%] w-[15%] h-[60%] opacity-50 pointer-events-none"
        style={{
          borderRadius: '50% / 50%',
          background:
            'linear-gradient(270deg, rgba(255,255,255,0.7) 0%, transparent 100%)',
          filter: 'blur(1px)',
        }}
      />
      <span
        className="absolute bottom-[2%] left-[20%] w-[60%] h-[15%] opacity-30 pointer-events-none"
        style={{
          borderRadius: '50% / 50%',
          background:
            'linear-gradient(0deg, rgba(255,255,255,0.5) 0%, transparent 100%)',
          filter: 'blur(1.5px)',
        }}
      />
    </span>
  );
};
