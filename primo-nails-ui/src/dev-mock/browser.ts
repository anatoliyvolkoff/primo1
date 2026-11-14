// Static-site host for the pretend backend (store.ts): answers the storefront's API calls inside the
// browser, so a plain static build (GitHub Pages) runs with no backend at all. Carts and orders are
// kept in localStorage, so they survive a refresh but never leave the visitor's browser. Only bundled
// by `pnpm build:pages` (vite.pages.config.ts prepends the import to main.tsx); never in the real build.
import products from './products.json';
import regions from './regions.json';
import content from './content.json';
import courses from './courses.json';
import categories from './categories.json';
import { emptyState, handle, type MockState } from './store';

const API_ORIGIN = new URL(import.meta.env.VITE_MEDUSA_BACKEND_URL || 'https://mock.invalid').origin;
const STATE_KEY = 'primo_mock_state';
const data = { products, regions, content, courses, categories };

function loadState(): MockState {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STATE_KEY) || 'null');
    if (saved?.carts && saved?.orders) return saved;
  } catch { /* blocked or corrupt storage → start empty */ }
  return emptyState();
}
const state = loadState();
function saveState() {
  try { window.localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* in-memory only this visit */ }
}

const realFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = input instanceof Request ? input : null;
  const url = new URL(request ? request.url : String(input), window.location.href);
  if (url.origin !== API_ORIGIN) return realFetch(input, init);

  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
  const rawBody = init?.body ?? (request && method !== 'GET' ? await request.clone().text() : undefined);
  let body: unknown;
  try { body = typeof rawBody === 'string' && rawBody ? JSON.parse(rawBody) : undefined; } catch { body = undefined; }

  const res = handle({ method, path: url.pathname, query: url.searchParams, body }, data, state);
  if (method !== 'GET') saveState();
  return new Response(JSON.stringify(res.body), { status: res.status, headers: { 'content-type': 'application/json' } });
};
