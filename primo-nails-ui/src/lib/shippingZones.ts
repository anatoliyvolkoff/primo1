import { useMemo } from 'react';
import { useStoreSetting } from '../hooks/useStoreContent';
import type { Language } from '../i18n';

/**
 * Storefront view of the admin-editable `shipping_rates` store setting (the same
 * data the GLS provider prices with). The setting holds, per zone, a weight-band
 * price table + a free-shipping threshold. This module normalizes it for display
 * on the Shipping page and derives the lowest "free from €X" figure for banners.
 *
 * Zone LABELS / descriptions live here (presentation) — the numbers always come
 * from the live setting so the page can never drift from what checkout charges.
 * The DEFAULT_RATES fallback mirrors the backend defaults so the page renders
 * before the fetch resolves (or if the setting was never seeded).
 */

export type ZoneKey = 'it_main' | 'it_south' | 'it_sard' | 'eu1' | 'eu2';

export interface RawZone {
  bands: [number, number][];
  freeThreshold: number | null;
}

export const ZONE_ORDER: ZoneKey[] = ['it_main', 'it_south', 'it_sard', 'eu1', 'eu2'];

interface ZoneCopy {
  label: string;
  desc: string;
}

/** Bilingual label + coverage description per zone. */
const ZONE_META: Record<ZoneKey, Record<Language, ZoneCopy>> = {
  it_main: {
    it: { label: 'Italia continentale', desc: 'Tutte le regioni, escluse Sicilia, Calabria, Sardegna e isole minori.' },
    en: { label: 'Italy mainland', desc: 'All regions except Sicily, Calabria, Sardinia and the smaller islands.' },
  },
  it_south: {
    it: { label: 'Sicilia e Calabria', desc: 'Tutte le province di Sicilia e Calabria.' },
    en: { label: 'Sicily & Calabria', desc: 'All provinces of Sicily and Calabria.' },
  },
  it_sard: {
    it: { label: 'Sardegna', desc: 'Tutte le province della Sardegna.' },
    en: { label: 'Sardinia', desc: 'All provinces of Sardinia.' },
  },
  eu1: {
    it: { label: 'Europa · Zona 1', desc: 'Austria, Belgio, Croazia, Danimarca, Francia, Germania, Lussemburgo, Paesi Bassi, Polonia, Portogallo, Repubblica Ceca, Romania, Slovacchia, Slovenia, Spagna, Ungheria.' },
    en: { label: 'Europe · Zone 1', desc: 'Austria, Belgium, Croatia, Czechia, Denmark, France, Germany, Hungary, Luxembourg, Netherlands, Poland, Portugal, Romania, Slovakia, Slovenia, Spain.' },
  },
  eu2: {
    it: { label: 'Europa · Zona 2', desc: 'Bulgaria, Estonia, Grecia, Irlanda, Lettonia, Lituania, Svezia.' },
    en: { label: 'Europe · Zone 2', desc: 'Bulgaria, Estonia, Greece, Ireland, Latvia, Lithuania, Sweden.' },
  },
};

// Fallback mirror of the backend DEFAULT_ZONE_RATES (GLS-TARIFF-2026-09). Only
// used before the live setting resolves / if it was never seeded — the setting
// is the source of truth at runtime.
const DEFAULT_RATES: Record<ZoneKey, RawZone> = {
  it_main: { bands: [[3, 7], [5, 7], [10, 10], [25, 15], [50, 20], [100, 35]], freeThreshold: 99 },
  it_south: { bands: [[3, 8], [5, 10], [10, 12], [25, 17], [50, 23], [100, 38]], freeThreshold: 99 },
  it_sard: { bands: [[3, 16], [5, 18], [10, 20], [25, 25], [50, 32], [100, 45]], freeThreshold: 199 },
  eu1: { bands: [[3, 16], [5, 18], [10, 20], [15, 23], [20, 25], [25, 27], [40, 33]], freeThreshold: 199 },
  eu2: { bands: [[3, 20], [5, 23], [10, 26], [15, 29], [20, 33], [25, 36], [40, 45]], freeThreshold: 299 },
};

export interface DisplayZone {
  key: ZoneKey;
  label: string;
  desc: string;
  bands: { maxKg: number; price: number }[];
  freeThreshold: number | null;
}

function coerceZone(raw: unknown, fallback: RawZone): RawZone {
  if (!raw || typeof raw !== 'object') return fallback;
  const z = raw as Record<string, unknown>;
  const bands = Array.isArray(z.bands)
    ? z.bands.filter(
        (b): b is [number, number] =>
          Array.isArray(b) && b.length === 2 && typeof b[0] === 'number' && typeof b[1] === 'number'
      )
    : [];
  const t = z.freeThreshold;
  const freeThreshold = t === null ? null : typeof t === 'number' && Number.isFinite(t) ? t : fallback.freeThreshold;
  return { bands: bands.length ? bands : fallback.bands, freeThreshold };
}

/** Normalized, display-ready zones from the live `shipping_rates` setting. */
export function useShippingRates(language: Language): DisplayZone[] {
  const raw = useStoreSetting<Record<string, unknown>>('shipping_rates', {});
  return useMemo(() => {
    const zones = (raw && typeof raw === 'object' && 'zones' in raw ? (raw as any).zones : raw) as
      | Record<string, unknown>
      | undefined;
    return ZONE_ORDER.map((key) => {
      const z = coerceZone(zones?.[key], DEFAULT_RATES[key]);
      const meta = ZONE_META[key][language];
      return {
        key,
        label: meta.label,
        desc: meta.desc,
        bands: z.bands.map(([maxKg, price]) => ({ maxKg, price })),
        freeThreshold: z.freeThreshold,
      };
    });
  }, [raw, language]);
}

/** Lowest per-zone free-shipping threshold (for the "free from €X" banner).
 *  Null-threshold (never-free) zones are ignored. Returns null if none qualify. */
export function useMinFreeThreshold(): number | null {
  const raw = useStoreSetting<Record<string, unknown>>('shipping_rates', {});
  return useMemo(() => {
    const zones = (raw && typeof raw === 'object' && 'zones' in raw ? (raw as any).zones : raw) as
      | Record<string, unknown>
      | undefined;
    const thresholds = ZONE_ORDER.map((key) => coerceZone(zones?.[key], DEFAULT_RATES[key]).freeThreshold).filter(
      (t): t is number => typeof t === 'number'
    );
    return thresholds.length ? Math.min(...thresholds) : null;
  }, [raw]);
}
