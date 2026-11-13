import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedDismissedChrome } from './support/stabilize';

// ─────────────────────────────────────────────────────────────────────────────
// Full-site accessibility audit (dev tooling — removed after the redesign).
//
// Runs the axe WCAG 2.0/2.1 A + AA ruleset over every key storefront route and
// gates ONLY on `serious` + `critical` violations. Moderate / minor findings are
// collected and printed per-route so they can inform polish, but never fail.
//
// Runs at the `desktop` project only: these WCAG rules are viewport-independent,
// so one pass keeps the suite fast. (Guarded via testInfo.project.name.)
// ─────────────────────────────────────────────────────────────────────────────

const ROUTES: { path: string; label: string }[] = [
  { path: '/', label: 'home' },
  { path: '/tutti-prodotti', label: 'all products' },
  { path: '/semipermanente', label: 'semipermanente (category)' },
  { path: '/product/cleaner-emotion-1000ml', label: 'product detail' },
  { path: '/corsi', label: 'courses list' },
  { path: '/corsi/ricostruzione-base', label: 'course detail' },
  { path: '/about-us', label: 'about us' },
  { path: '/nail-art', label: 'nail art' },
  { path: '/care', label: 'care' },
  { path: '/termini', label: 'terms' },
  { path: '/privacy', label: 'privacy' },
  { path: '/spedizioni', label: 'shipping' },
  { path: '/this-page-404', label: '404 not found' },
];

test.describe('site-wide accessibility', () => {
  for (const { path, label } of ROUTES) {
    test(`no serious/critical axe violations: ${label} (${path})`, async ({ page }, testInfo) => {
      // Viewport-independent rules — only run the desktop project.
      test.skip(
        testInfo.project.name !== 'desktop',
        'a11y rules are viewport-independent; desktop project only',
      );

      // Suppress the newsletter modal + pin language BEFORE the app boots.
      await seedDismissedChrome(page);
      await page.addInitScript(() => {
        try {
          window.localStorage.setItem('primo_language', 'it');
        } catch {
          /* ignore */
        }
      });

      const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
      // SPA — the server always returns 200 for the index; a "404" here is an
      // in-app NotFound view, so we don't assert on HTTP status.
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const rank = (impact: string | null | undefined) =>
        impact === 'critical' ? 0 : impact === 'serious' ? 1 : impact === 'moderate' ? 2 : 3;
      const sorted = [...results.violations].sort((a, b) => rank(a.impact) - rank(b.impact));

      // Full, actionable per-route log (all impacts) with selectors.
      if (sorted.length > 0) {
        const summary = sorted
          .map((v) => {
            const nodeLines = v.nodes
              .slice(0, 8)
              .map((n) => `      - ${n.target.join(' , ')}`)
              .join('\n');
            const more = v.nodes.length > 8 ? `\n      … +${v.nodes.length - 8} more node(s)` : '';
            return (
              `  [${(v.impact ?? 'n/a').toUpperCase()}] ${v.id} — ${v.help} (${v.nodes.length} node(s))\n` +
              `    ${v.helpUrl}\n${nodeLines}${more}`
            );
          })
          .join('\n');
        // eslint-disable-next-line no-console
        console.log(
          `\n══════════════════════════════════════════════════════════════\n` +
            `AXE — ${label} [HTTP ${resp?.status() ?? '?'}] ${path}\n` +
            `══════════════════════════════════════════════════════════════\n${summary}\n`,
        );
      } else {
        // eslint-disable-next-line no-console
        console.log(`AXE — ${label} ${path}: no violations at any impact.`);
      }

      const blocking = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );

      expect(
        blocking,
        `serious/critical a11y violations on ${path}:\n${blocking
          .map(
            (v) =>
              `  [${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes
                .map((n) => n.target.join(' , '))
                .join('\n    ')}`,
          )
          .join('\n')}`,
      ).toEqual([]);
    });
  }
});
