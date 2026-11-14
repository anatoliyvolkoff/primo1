/**
 * Component tests for the checkout free-shipping nudge.
 *
 * Two layers:
 *  - freeShipBarColor(pct): pure slate→emerald lerp used by the progress bar.
 *  - FreeShippingProgress: destination-aware wrapper that reads the live per-zone
 *    estimate (same source as the charged price) and renders one of three
 *    states — "€X remaining" (with a % bar), "unlocked" at/over threshold, or a
 *    quiet rates link when a destination can never ship free (islands / off).
 *    This is money-adjacent guidance: it must never promise free shipping a zone
 *    can't give, and the % must clamp to 0–100.
 */
import { render, screen } from '@testing-library/react';
import {
  freeShipBarColor,
  FreeShipNudge,
  FreeShippingProgress,
} from './FreeShippingProgress';

vi.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, vars?: Record<string, string | number>) =>
      vars?.amount != null ? `${k}:${vars.amount}` : k,
    language: 'it',
  }),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

// Controllable estimate hook — the single source of destination/threshold data.
const estimate = { data: null as any, isPending: false };
vi.mock('../../hooks/useShippingEstimate', () => ({
  useShippingEstimate: () => estimate,
}));

beforeEach(() => {
  estimate.data = null;
  estimate.isPending = false;
});

// ── freeShipBarColor: pure colour lerp ─────────────────────────────────────
describe('freeShipBarColor', () => {
  it('is slate at 0% (far from free)', () => {
    expect(freeShipBarColor(0)).toBe('rgb(148 163 184)');
  });

  it('is emerald at 100% (threshold reached)', () => {
    expect(freeShipBarColor(100)).toBe('rgb(16 185 129)');
  });

  it('clamps out-of-range input (>100 → emerald, <0 → slate)', () => {
    expect(freeShipBarColor(250)).toBe('rgb(16 185 129)');
    expect(freeShipBarColor(-40)).toBe('rgb(148 163 184)');
  });

  it('produces an intermediate colour between the endpoints at 50%', () => {
    const mid = freeShipBarColor(50);
    expect(mid).not.toBe(freeShipBarColor(0));
    expect(mid).not.toBe(freeShipBarColor(100));
    expect(mid).toMatch(/^rgb\(\d+ \d+ \d+\)$/);
  });
});

// ── FreeShipNudge: presentational states ───────────────────────────────────
describe('FreeShipNudge', () => {
  it('renders a progressbar with the given pct in the remaining state', () => {
    render(<FreeShipNudge kind="remaining" pct={40} remainingText="40 to go" linkText="rates" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('40');
    expect(screen.getByText('40 to go')).toBeTruthy();
  });

  it('renders a full (100%) progressbar in the unlocked state', () => {
    render(<FreeShipNudge kind="unlocked" unlockedText="free!" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    expect(screen.getByText('free!')).toBeTruthy();
  });

  it('renders a rates link (no progressbar) in the rates state', () => {
    render(<FreeShipNudge kind="rates" ratesText="see rates" />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByText('see rates')).toBeTruthy();
  });
});

// ── FreeShippingProgress: threshold wiring ─────────────────────────────────
describe('FreeShippingProgress', () => {
  it('renders nothing when no country is set', () => {
    const { container } = render(<FreeShippingProgress subtotal={50} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing while the estimate is pending', () => {
    estimate.isPending = true;
    const { container } = render(<FreeShippingProgress country="it" subtotal={50} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the quiet rates link when the destination can never ship free (freeThreshold null)', () => {
    estimate.data = { freeThreshold: null, qualifies: false, remaining: null };
    render(<FreeShippingProgress country="it" province="it-ca" postal="09100" subtotal={300} />);
    // Islands/off → rates link, NOT a false "€X to free" promise.
    expect(screen.getByText('checkout.freeShipSeeRates')).toBeTruthy();
    expect(screen.queryByText(/checkout\.freeShipRemaining/)).toBeNull();
  });

  it('shows the unlocked state when the subtotal qualifies', () => {
    estimate.data = { freeThreshold: 199, qualifies: true, remaining: 0 };
    render(<FreeShippingProgress country="it" subtotal={250} />);
    expect(screen.getByText('checkout.freeShipUnlocked')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('shows the remaining amount + a proportional % bar below threshold', () => {
    estimate.data = { freeThreshold: 200, qualifies: false, remaining: 100 };
    // subtotal 100 of 200 → 50%.
    render(<FreeShippingProgress country="it" subtotal={100} />);
    expect(screen.getByText(/checkout\.freeShipRemaining/)).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
  });

  it('clamps the bar to 100% even if the subtotal overshoots a non-qualifying threshold', () => {
    // Defensive: data says not-yet-qualified but subtotal already exceeds the
    // threshold (rounding/timing) — the bar must still cap at 100, never >100.
    estimate.data = { freeThreshold: 100, qualifies: false, remaining: 0 };
    render(<FreeShippingProgress country="it" subtotal={500} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('handles a zero threshold without dividing by zero (0%)', () => {
    estimate.data = { freeThreshold: 0, qualifies: false, remaining: 0 };
    render(<FreeShippingProgress country="it" subtotal={50} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  });
});
