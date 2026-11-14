import React from 'react';
import { seasonTheme, type ParticleKind } from './seasonCarousel';

interface SeasonParticlesProps {
  /** Active season name (SEASON_ORDER key), or null when nothing is themed. */
  season: string | null;
  /** Whether the field is on-screen + un-blocked — animations pause when false. */
  active: boolean;
  /** Pixel height the particles travel across (the section height). */
  fieldHeight: number;
}

interface Particle {
  x: number; // left, %
  scale: number;
  dur: number; // s
  delay: number; // s (negative → mid-flight on mount)
  sway: number; // px horizontal drift
  r0: number; // start rotation, deg
  r1: number; // end rotation, deg
  o: number; // peak opacity
}

const COUNT: Record<ParticleKind, number> = { leaf: 14, flake: 18, petal: 12, bubble: 12 };

function build(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    scale: 0.6 + Math.random() * 0.8,
    dur: 10 + Math.random() * 8,
    delay: -Math.random() * 18,
    sway: (Math.random() - 0.5) * 140,
    r0: Math.random() * 360,
    r1: Math.random() * 720 - 360,
    o: 0.45 + Math.random() * 0.45,
  }));
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/**
 * Ambient per-season particles (autumn leaves, winter snow, spring petals,
 * summer bubbles) drifting behind the Seasons cards. Decorative only
 * (aria-hidden, pointer-events-none); fully suppressed under
 * prefers-reduced-motion; paused when `active` is false so off-screen /
 * modal-covered fields don't burn CPU.
 */
export const SeasonParticles = ({ season, active, fieldHeight }: SeasonParticlesProps) => {
  const reduced = usePrefersReducedMotion();
  const theme = seasonTheme(season);
  const kind = theme.particle;

  // Regenerate the random field only when the particle KIND changes, so merely
  // toggling `active` (pause/resume) doesn't reshuffle every particle.
  const particles = React.useMemo(() => build(COUNT[kind]), [kind]);

  if (reduced || !season) return null;

  return (
    <div
      aria-hidden
      className={`season-field pointer-events-none absolute inset-0 overflow-hidden ${active ? '' : 'season-field-paused'}`}
      style={{ ['--field-h' as string]: `${Math.max(fieldHeight, 320)}px` }}
    >
      {particles.map((p, i) => (
        <span
          key={`${kind}-${i}`}
          className={`season-particle ${theme.rising ? 'is-rising' : 'is-falling'} sp-${kind}`}
          style={{
            left: `${p.x}%`,
            ['--sp-scale' as string]: p.scale,
            ['--dur' as string]: `${p.dur}s`,
            ['--delay' as string]: `${p.delay}s`,
            ['--sway' as string]: `${p.sway}px`,
            ['--r0' as string]: `${p.r0}deg`,
            ['--r1' as string]: `${p.r1}deg`,
            ['--o' as string]: p.o,
          }}
        />
      ))}
    </div>
  );
};
