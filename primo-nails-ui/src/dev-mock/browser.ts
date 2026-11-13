// Static-site twin of plugin.ts: answers the storefront's API calls from the same fixtures, but in
// the browser, so a plain static build (GitHub Pages) runs with no backend at all. Only bundled by
// `pnpm build:pages` (vite.pages.config.ts prepends the import to main.tsx); never in the real build.
import products from './products.json';
import regions from './regions.json';
import content from './content.json';
import courses from './courses.json';
import categories from './categories.json';

const API_ORIGIN = new URL(import.meta.env.VITE_MEDUSA_BACKEND_URL || 'https://mock.invalid').origin;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function answer(url: URL): Response {
  const p = url.pathname;
  if (p === '/store/regions') return json(regions);
  if (p === '/store/products') {
    const h = url.searchParams.get('handle');
    const all = (products as any).products as any[];
    const list = h ? all.filter((x) => x.handle === h) : all;
    return json({ products: list, count: list.length, limit: 200, offset: 0 });
  }
  if (p === '/store/product-categories') return json(categories);
  if (p === '/store/content') return json(content);
  if (p === '/store/courses') return json(courses);
  if (p.startsWith('/store/courses/')) {
    const h = decodeURIComponent(p.split('/').pop() || '');
    const c = ((courses as any).courses ?? []).find((x: any) => x.handle === h);
    return c ? json({ course: c }) : json({ message: 'not found' }, 404);
  }
  if (p.startsWith('/store/carts')) {
    return json({ cart: { id: 'cart_mock', items: [], region_id: (regions as any).regions[0].id, currency_code: 'eur',
      total: 0, subtotal: 0, tax_total: 0, shipping_total: 0, discount_total: 0, item_total: 0, shipping_methods: [] } });
  }
  return json({ message: 'mock: not implemented' }, 404);
}

const realFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(href, window.location.href);
  return url.origin === API_ORIGIN ? answer(url) : realFetch(input, init);
};
