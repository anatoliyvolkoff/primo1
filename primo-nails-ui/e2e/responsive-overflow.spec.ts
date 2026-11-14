import { expect, test } from '@playwright/test';
import { seedDismissedChrome } from './support/stabilize';

// ─────────────────────────────────────────────────────────────────────────────
// Responsive horizontal-overflow audit (DEV TOOLING — no app code touched).
//
// For each route × each breakpoint width, set the viewport, navigate, wait for
// fonts + network idle, then assert there is NO horizontal overflow
// (documentElement.scrollWidth must not exceed window.innerWidth by > 2px).
//
// The spec sets its OWN viewport per test via page.setViewportSize, so it wins
// over whatever project viewport the config specifies. Run with a single
// project, e.g. `--project=desktop`.
// ─────────────────────────────────────────────────────────────────────────────

const WIDTHS = [375, 414, 768, 1024, 1280, 1440] as const;
const HEIGHT = 900;
const TOLERANCE = 2; // px, for subpixel rounding

const ROUTES = [
  '/',
  '/tutti-prodotti',
  '/semipermanente',
  '/product/cleaner-emotion-1000ml',
  '/corsi',
  '/corsi/ricostruzione-base',
  '/about-us',
  '/nail-art',
  '/care',
  '/termini',
  '/privacy',
  '/spedizioni',
  '/checkout',
  '/this-page-404',
] as const;

type Offender = { tag: string; cls: string; right: number };

test.describe('responsive overflow audit', () => {
  for (const route of ROUTES) {
    test.describe(`route ${route}`, () => {
      for (const width of WIDTHS) {
        test(`no horizontal overflow @ ${width}px`, async ({ page }) => {
          // The spec's viewport must win over the project viewport.
          await page.setViewportSize({ width, height: HEIGHT });

          // Suppress newsletter popup + set language before app boots.
          await seedDismissedChrome(page);
          await page.addInitScript(() => {
            try {
              window.localStorage.setItem('primo_language', 'it');
            } catch {
              /* ignore */
            }
          });

          await page.goto(route, { waitUntil: 'domcontentloaded' });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForLoadState('networkidle');

          const result = await page.evaluate((tol) => {
            const innerWidth = window.innerWidth;
            const scrollWidth = document.documentElement.scrollWidth;

            const offenders: { tag: string; cls: string; right: number }[] = [];
            const els = Array.from(document.querySelectorAll<HTMLElement>('body *'));
            for (const el of els) {
              const rect = el.getBoundingClientRect();
              // Skip zero-size / hidden elements.
              if (rect.width === 0 && rect.height === 0) continue;
              if (rect.right > innerWidth + tol) {
                const cls =
                  typeof el.className === 'string'
                    ? el.className
                    : ((el.getAttribute('class') ?? '') as string);
                offenders.push({
                  tag: el.tagName.toLowerCase(),
                  cls: cls.trim().slice(0, 120),
                  right: Math.round(rect.right),
                });
              }
            }
            // Sort by how far past the edge they reach, widest first.
            offenders.sort((a, b) => b.right - a.right);
            return { innerWidth, scrollWidth, offenders };
          }, TOLERANCE);

          const over = result.scrollWidth - result.innerWidth;
          if (result.scrollWidth > result.innerWidth + TOLERANCE) {
            const top = (result.offenders as Offender[])
              .slice(0, 8)
              .map((o) => `    - <${o.tag} class="${o.cls}"> right=${o.right}`)
              .join('\n');
            // eslint-disable-next-line no-console
            console.log(
              `OVERFLOW route=${route} width=${width} scrollWidth=${result.scrollWidth} innerWidth=${result.innerWidth} (over by ${over}px)\n` +
                `  offenders (${result.offenders.length} total, top 8):\n${top || '    (none pinpointed — overflow may be from a scroll container / pseudo-element)'}`,
            );
          }

          expect(
            result.scrollWidth,
            `route=${route} width=${width} overflowed by ${over}px (innerWidth=${result.innerWidth}, scrollWidth=${result.scrollWidth})`,
          ).toBeLessThanOrEqual(result.innerWidth + TOLERANCE);
        });
      }
    });
  }
});
