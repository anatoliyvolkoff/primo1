import type { Page } from '@playwright/test';

// Neutralise non-deterministic chrome so visual baselines are stable.
//
// 1. Set the newsletter dismissal flag in localStorage BEFORE the app boots so
//    the NewsletterPopup never arms (see src/components/NewsletterPopup.tsx —
//    it early-returns when `newsletter_dismissed` is set).
// 2. After navigation, wait for fonts + network idle and belt-and-braces hide
//    the popup / toasts via CSS in case anything slips through.
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8000';

export async function seedDismissedChrome(page: Page): Promise<void> {
  // addInitScript runs before any app script on every navigation in this
  // context, so the flag is present when NewsletterPopup's effect first runs.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('newsletter_dismissed', 'true');
    } catch {
      /* localStorage may be unavailable in some contexts — ignore */
    }
  });
}

export async function stabilizeForScreenshot(page: Page): Promise<void> {
  // Fonts settled — avoids a FOUT diff between baseline and run.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');

  // Defensive: hide any newsletter popup / toast overlay that may still be
  // present, without touching app code or behaviour (purely visual).
  await page.addStyleTag({
    content: `
      [role="dialog"][aria-modal="true"],
      [data-testid="toast"],
      [aria-live="polite"],
      [aria-live="assertive"] { display: none !important; }
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
        caret-color: transparent !important;
      }
    `,
  });
}

export { BASE_URL };
