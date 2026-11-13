/**
 * One-shot cleanup of orphaned localStorage keys left over from earlier
 * branches of the storefront. Safe to run on every load — keys are
 * either present (and we remove them) or absent (no-op).
 *
 * Tracked in docs/UI-CODE-ASSESSMENT-2026-05-25.md §3.
 */

const ORPHAN_KEYS = [
  // Legacy cookie-consent banner that no longer exists in source.
  "cookie-consent",
  // Pre-branch internal dev-flags bag; nothing reads it anymore.
  "aidreptate_dev_flags",
]

export function migrateLocalStorage(): void {
  if (typeof window === "undefined") return
  // Wrap the whole body — even reading `window.localStorage` can throw a
  // SecurityError (e.g. blocked storage / private-browsing), which would
  // otherwise crash the app at boot. `removeItem` on a missing key is a
  // no-op, so we can skip the `getItem` existence check entirely.
  try {
    for (const key of ORPHAN_KEYS) {
      window.localStorage.removeItem(key)
    }
  } catch {
    // localStorage can throw in private-browsing / blocked-storage modes; ignore.
  }
}
