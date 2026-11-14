import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// Phones: a vertical swipe that starts on a horizontal row (product carousel,
// courses, swatches, reviews...) must scroll the page. Two things break that:
//  - `touch-action: pan-x` (Tailwind `touch-pan-x`) tells the browser to ignore
//    vertical pans there, so the page freezes under the finger;
//  - `overflow-x: auto` silently turns `overflow-y` into `auto` too, so a row a
//    few px taller than its box becomes vertically scrollable and "lifts"
//    instead of the page moving. Every horizontal scroller pins overflow-y.
const SRC = path.resolve(__dirname, '..');
const files = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'dev-mock' ? [] : files(p);
    return /\.(tsx|css)$/.test(e.name) && !/\.test\.tsx$/.test(e.name) ? [p] : [];
  });
const sources = files(SRC).map((f) => [path.relative(SRC, f), fs.readFileSync(f, 'utf8')] as const);

describe('touch scrolling on horizontal rows', () => {
  it('never blocks vertical pans with touch-pan-x / touch-action: pan-x', () => {
    const offenders = sources.filter(([, s]) => /touch-pan-x|touch-action:\s*pan-x/.test(s)).map(([f]) => f);
    expect(offenders).toEqual([]);
  });

  it('pins overflow-y on every horizontal scroller', () => {
    const offenders: string[] = [];
    for (const [f, s] of sources) {
      // Tailwind classes: each class string using overflow-x-auto also hides y.
      for (const m of s.matchAll(/["'`][^"'`\n]*\boverflow-x-auto\b[^"'`\n]*["'`]/g)) {
        if (!/\boverflow-y-hidden\b/.test(m[0]) && !/<pre\b/.test(s.slice(Math.max(0, m.index! - 40), m.index))) offenders.push(`${f}: ${m[0].slice(0, 60)}`);
      }
      // Plain CSS rules.
      for (const m of s.matchAll(/\{[^{}]*overflow-x:\s*auto[^{}]*\}/g)) {
        if (!/overflow-y:\s*hidden/.test(m[0])) offenders.push(`${f}: ${m[0].slice(0, 60)}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
