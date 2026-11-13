import { useSyncExternalStore } from 'react';
import type { Product } from '../types';

const STORAGE_KEY = 'recentlyViewed';
// Keep the 20 most-recently-viewed products. addToRecentlyViewed prepends the
// newest and slices to this cap, so a 21st view drops the oldest entry.
const MAX_ITEMS = 20;

// We persist only product IDs (not whole product objects). Consumers resolve
// them against the live product list, so the widget always shows current
// price/stock/name — and localStorage stays tiny.
let ids: string[] = readFromStorage();
const EMPTY: string[] = [];
const subscribers = new Set<() => void>();

function readFromStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    // Accept the new id-array format AND migrate the legacy full-object
    // format (each entry was a Product) by pulling out its id.
    const ids = parsed
      .map((entry) => (typeof entry === 'string' ? entry : entry?.id))
      .filter((id): id is string => typeof id === 'string')
      .slice(0, MAX_ITEMS);
    // Persist the migrated (id-only) form back immediately, so legacy
    // full-object blobs don't linger in localStorage until the next view.
    const wasLegacy = parsed.some((entry) => typeof entry !== 'string');
    if (wasLegacy) writeToStorage(ids);
    return ids;
  } catch {
    return [];
  }
}

function writeToStorage(next: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
}

function emit() {
  subscribers.forEach((fn) => fn());
}

function onStorage(e: StorageEvent) {
  // Another tab updated the list — re-read and notify this tab's subscribers.
  // A null key means the other tab called localStorage.clear(), so treat it as
  // a global reset and re-read (which yields an empty list) too.
  if (e.key === STORAGE_KEY || e.key === null) {
    ids = readFromStorage();
    emit();
  }
}

function subscribe(listener: () => void) {
  subscribers.add(listener);
  if (subscribers.size === 1 && typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    subscribers.delete(listener);
    if (subscribers.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

function getSnapshot(): string[] {
  return ids;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

export function addToRecentlyViewed(product: Product) {
  if (!product?.id) return;
  const filtered = ids.filter((id) => id !== product.id);
  ids = [product.id, ...filtered].slice(0, MAX_ITEMS);
  writeToStorage(ids);
  emit();
}

export function useRecentlyViewed() {
  const recentlyViewedIds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { recentlyViewedIds, addToRecentlyViewed };
}
