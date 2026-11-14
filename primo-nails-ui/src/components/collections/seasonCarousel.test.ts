import { describe, it, expect } from 'vitest';
import {
  falloffT,
  nearestCenterIndex,
  cardScale,
  cardOpacity,
  seasonTheme,
  SEASON_THEME,
} from './seasonCarousel';

describe('falloffT', () => {
  it('is 0 at dead centre', () => {
    expect(falloffT(0, 277)).toBe(0);
  });
  it('is symmetric for +/- distance', () => {
    expect(falloffT(100, 277)).toBeCloseTo(falloffT(-100, 277));
  });
  it('clamps to 1 beyond a full pitch', () => {
    expect(falloffT(500, 277)).toBe(1);
    expect(falloffT(-9999, 277)).toBe(1);
  });
  it('is 0 for a non-positive pitch (avoids divide-by-zero)', () => {
    expect(falloffT(100, 0)).toBe(0);
    expect(falloffT(100, -5)).toBe(0);
  });
});

describe('nearestCenterIndex', () => {
  it('returns -1 for an empty list', () => {
    expect(nearestCenterIndex(100, [])).toBe(-1);
  });
  it('picks the closest card centre', () => {
    expect(nearestCenterIndex(300, [50, 280, 560, 840])).toBe(1);
    expect(nearestCenterIndex(600, [50, 280, 560, 840])).toBe(2);
  });
  it('resolves ties to the lower index', () => {
    // 150 is equidistant from 100 and 200 → lower index wins.
    expect(nearestCenterIndex(150, [100, 200])).toBe(0);
  });
});

describe('cardScale / cardOpacity', () => {
  it('are full at centre', () => {
    expect(cardScale(0)).toBe(1);
    expect(cardOpacity(0)).toBe(1);
  });
  it('shrink and fade at the edge (matches prototype)', () => {
    expect(cardScale(1)).toBeCloseTo(0.917);
    expect(cardOpacity(1)).toBeCloseTo(0.5);
  });
});

describe('seasonTheme', () => {
  it('returns a distinct theme per known season', () => {
    const names = Object.keys(SEASON_THEME);
    const accents = new Set(names.map((n) => seasonTheme(n).accent));
    expect(accents.size).toBe(names.length);
  });
  it('bubbles rise, everything else falls', () => {
    expect(seasonTheme('SUMMER').rising).toBe(true);
    expect(seasonTheme('AUTUMN').rising).toBe(false);
  });
  it('falls back safely for unknown / null season', () => {
    expect(seasonTheme(null).accent).toBeTruthy();
    expect(seasonTheme('NOPE').gradient).toContain('gradient');
  });
});
