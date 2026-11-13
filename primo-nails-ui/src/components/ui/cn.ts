/**
 * Tiny classname joiner for the UI primitive set. Filters out falsy values so
 * conditional class expressions (`cond && 'x'`) stay readable. No dependency —
 * intentionally lighter than clsx/tailwind-merge since these primitives own
 * their own class strings and don't need conflict resolution.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
