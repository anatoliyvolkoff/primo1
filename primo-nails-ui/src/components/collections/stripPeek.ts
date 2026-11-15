/** Dot size + edge padding of the scrolling row (w-7, px-2). */
const DOT = 28;
const PAD = 8;
/** How much of the last dot should peek in at the right edge on load. */
const PEEK_MIN = 12;
const PEEK_MAX = 20;
/** Session flag: the "there's more" nudge plays once per visit. */
export const NUDGE_KEY = 'pm-strip-nudged';

/**
 * Pick a gap (close to the design's 16px) that leaves the last visible dot cut
 * off mid-way at the right edge — a half dot reads as "swipe for more", a dot
 * that ends flush with the edge reads as "that's all". Null = keep gap-4.
 */
export function peekGap(width: number, dots: number): number | null {
  const fitsAll = PAD * 2 + dots * DOT + (dots - 1) * 16 <= width;
  if (fitsAll) return null;
  let best: number | null = null;
  for (let k = 1; k < dots; k++) {
    // Dot k starts at PAD + k*(DOT+g). Any start PEEK_MIN..PEEK_MAX px before
    // the edge is a good cut; take the gap in that window closest to 16px.
    const lo = (width - PEEK_MAX - PAD) / k - DOT;
    const hi = (width - PEEK_MIN - PAD) / k - DOT;
    const g = Math.min(hi, Math.max(lo, 16));
    if (g < 12 || g > 22) continue;
    if (best === null || Math.abs(g - 16) < Math.abs(best - 16)) best = g;
  }
  return best === null ? null : Math.round(best * 10) / 10;
}
