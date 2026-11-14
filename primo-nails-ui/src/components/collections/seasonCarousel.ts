// Pure, framework-free helpers + per-season theming for the "Le Stagioni"
// carousel. Kept separate from the component so the scroll-math and the theme
// lookup can be unit-tested without a DOM (see seasonCarousel.test.ts).

export type ParticleKind = 'leaf' | 'flake' | 'petal' | 'bubble';

export interface SeasonTheme {
  /** Accent used for the focal/active card border, dots and the ambient glow. */
  accent: string;
  /** Full-section background gradient that cross-fades in for the active season. */
  gradient: string;
  /** Subtle tint applied to the section CTA while this season is active. */
  ctaBg: string;
  /** Which particle system drifts behind the cards. */
  particle: ParticleKind;
  /** Bubbles float up; leaves/flakes/petals fall down. */
  rising: boolean;
}

// Accents + gradients mirror the client's mobile prototype (anatoliyvolkoff/
// primo1 → app.js SEASONS + styles.css panels), re-expressed as CSS gradients.
// Keyed by the season `name` used throughout the storefront (SEASON_ORDER).
export const SEASON_THEME: Record<string, SeasonTheme> = {
  AUTUMN: {
    accent: '#c8742d',
    gradient: 'linear-gradient(180deg,#fdf6ee 0%,#f8e3c8 52%,#f1b76e 100%)',
    ctaBg: '#fcf5eb',
    particle: 'leaf',
    rising: false,
  },
  WINTER: {
    accent: '#2f80e9',
    gradient: 'linear-gradient(180deg,#ffffff 0%,#eef2f8 52%,#cdd8ea 100%)',
    ctaBg: '#f2f3f7',
    particle: 'flake',
    rising: false,
  },
  SPRING: {
    accent: '#e5668f',
    gradient: 'linear-gradient(180deg,#fff6f9 0%,#fde1ec 52%,#f7c2d8 100%)',
    ctaBg: '#fdf1f5',
    particle: 'petal',
    rising: false,
  },
  SUMMER: {
    accent: '#44c232',
    gradient: 'linear-gradient(180deg,#f7fff0 0%,#e3f7d6 52%,#bfe9a8 100%)',
    ctaBg: '#f2fdec',
    particle: 'bubble',
    rising: true,
  },
};

const FALLBACK_THEME: SeasonTheme = {
  accent: '#1d1d1f',
  gradient: 'linear-gradient(180deg,#ffffff 0%,#f6f6f6 100%)',
  ctaBg: '#f5f5f5',
  particle: 'petal',
  rising: false,
};

export function seasonTheme(name: string | null | undefined): SeasonTheme {
  return (name && SEASON_THEME[name]) || FALLBACK_THEME;
}

/**
 * Normalised distance (0 → 1) of a card from the carousel's focal centre, used
 * to drive the scroll-coupled scale/opacity fall-off. 0 = dead-centre (full
 * size), 1 = a full card-pitch away or further (most shrunk/faded). Clamped.
 */
export function falloffT(distanceFromCenter: number, pitch: number): number {
  if (!(pitch > 0)) return 0;
  const t = Math.abs(distanceFromCenter) / pitch;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * Index of the card whose centre is nearest the viewport centre — the "active"
 * (focal) card that drives the section re-theme. Ties resolve to the lower
 * index. Returns -1 for an empty list.
 */
export function nearestCenterIndex(viewportCenter: number, cardCenters: number[]): number {
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < cardCenters.length; i++) {
    const d = Math.abs(cardCenters[i] - viewportCenter);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Scale for a card at fall-off `t` — centre 1.0, edge ~0.917 (prototype: 1 - .083t). */
export function cardScale(t: number): number {
  return 1 - 0.083 * t;
}

/** Opacity for a card at fall-off `t` — centre 1.0, edge 0.5 (prototype: 1 - .5t). */
export function cardOpacity(t: number): number {
  return 1 - 0.5 * t;
}
