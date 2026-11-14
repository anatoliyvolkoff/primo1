/**
 * Sentry initialization for the storefront.
 *
 * Errors + tracing only — no session replay per project policy. EU
 * data region (the DSN host ends in `ingest.de.sentry.io`).
 *
 * DSN is shipped in the bundle (public-by-design for Sentry browser
 * SDKs). The auth token / org slug used for source-map upload live
 * only in the build environment — they never touch the client.
 */

import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const release = import.meta.env.VITE_SENTRY_RELEASE as string | undefined;
const environment = (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ?? import.meta.env.MODE;
// Default tracing sample rate: 10% in prod, 100% in dev to make
// local debugging easy. Override at build time via env if needed.
// A non-numeric/empty env value would make parseFloat return NaN, which
// Sentry rejects — so we clamp to [0,1] and fall back to the default.
const rawTracesSampleRate = import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string | undefined;
const parsedTracesSampleRate = parseFloat(rawTracesSampleRate ?? '');
const tracesSampleRate = Number.isFinite(parsedTracesSampleRate)
  ? Math.min(Math.max(parsedTracesSampleRate, 0), 1)
  : (import.meta.env.PROD ? 0.1 : 1.0);

export function initSentry(): void {
  if (!dsn) {
    // No DSN configured — silently skip. Useful for local dev where
    // we don't want to spam Sentry with noisy localhost errors.
    return;
  }
  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [
      // Auto-instrument fetch + xhr + history navigations. Matches the
      // routes regex against React Router v7 so transactions get
      // named after the route, not the URL.
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate,
    // Strip URL search params + hashes from breadcrumbs by default to
    // keep PII (like one-time order IDs) out of unrelated events.
    sendDefaultPii: false,
    // Quiet some common, harmless errors that drown the inbox.
    ignoreErrors: [
      // Browsers throw this when an extension or ad-blocker cancels a
      // fetch — not actionable from our side.
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications.',
      // Network errors from offline users / fetch abort.
      'Failed to fetch',
      'NetworkError when attempting to fetch resource.',
      'AbortError',
    ],
  });
}

export { Sentry };
