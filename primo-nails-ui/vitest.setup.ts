import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// VAT is no longer an env var — the rate comes from the `vat_rate_percent` store
// setting (see useVatRatePct). Components read it via useStoreContent, which in
// tests resolves to the 0 (VAT-exempt) fallback, so the IVA line stays hidden.

// ---------------------------------------------------------------------------
// Cross-file global hygiene.
//
// Vitest may run several test files inside the SAME worker (depending on the
// pool, CPU count and scheduling). When a file stubs a global — `fetch`,
// env vars, spies, or (most insidiously) overwrites `window.location` via
// `Object.defineProperty` — and does not fully restore it, the mutated global
// bleeds into every file that subsequently shares that worker. Symptoms:
// suites that pass in isolation / serialized (`--no-file-parallelism`) but
// fail intermittently under the default parallel run, with the failure count
// swinging with worker scheduling.
//
// We snapshot `window.location` once at module load (the real happy-dom
// Location) and restore it after every test, then undo all mocks/stubs/envs.
// This is defence-in-depth: individual files keep their own teardown, but a
// forgotten restore no longer corrupts the shared worker.
// ---------------------------------------------------------------------------

const ORIGINAL_LOCATION = window.location;
const ORIGINAL_LOCATION_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  window,
  'location',
);

afterEach(() => {
  // Unmount anything React Testing Library rendered. RTL registers its own
  // auto-cleanup afterEach when `globals: true`, but a user `afterEach` in a
  // test file (e.g. one that overwrites `window.location`) can throw and abort
  // the remaining afterEach hooks for that test — leaving the previous render
  // mounted in `document.body`. The next test/file then sees duplicate nodes
  // ("Found multiple elements with the text ..."). Calling cleanup() here,
  // first and unconditionally, makes teardown deterministic.
  cleanup();

  // Restore any `window.location` overwrite (tests that assign
  // `window.location.href` for redirect assertions replace the whole object
  // with a bare `{ href: '' }`, dropping pathname/search/reload that other
  // files read).
  if (window.location !== ORIGINAL_LOCATION) {
    if (ORIGINAL_LOCATION_DESCRIPTOR) {
      Object.defineProperty(window, 'location', ORIGINAL_LOCATION_DESCRIPTOR);
    } else {
      // Fallback: reassign the captured original (happy-dom allows this).
      // @ts-expect-error — happy-dom Location is assignable in the test env.
      window.location = ORIGINAL_LOCATION;
    }
  }

  // Undo spies, mock state, global stubs and env stubs so the next file in the
  // worker starts from a clean slate.
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();

  // Reset persisted browser state that app-level singletons read (recent
  // searches, recently-viewed, the cart id, etc.).
  localStorage.clear();
  sessionStorage.clear();
});
