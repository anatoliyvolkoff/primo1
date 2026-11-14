/**
 * localStorage wrappers that never throw. In strict private-mode / blocked-
 * storage contexts (Firefox private, Safari ITP, restricted iframes) even
 * reading `localStorage` throws a SecurityError/DOMException — unguarded access
 * at component top level would crash the page render (LB166-2). These degrade
 * gracefully (read → null, write/remove → no-op) so the cart/checkout keep
 * working in-memory for the session instead of white-screening.
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked — ignore */
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage blocked — ignore */
  }
}
