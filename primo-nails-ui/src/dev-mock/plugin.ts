// Dev-only: serves fixtures captured from the real store API for /store/*, plus the store's photos
// (./media, referenced by the fixtures as /mock-media/<file>), so the storefront runs with no
// API/Postgres/Redis/S3. Enabled with VITE_MOCK_API=1 (see `pnpm dev:mock`).
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

const load = (n: string) => JSON.parse(fs.readFileSync(path.join(__dirname, `${n}.json`), 'utf8'));
const MEDIA_TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

export function mockApi(): Plugin {
  return {
    name: 'primo-mock-api',
    apply: 'serve',
    configureServer(server) {
      const products = load('products'), regions = load('regions'), content = load('content'),
        courses = load('courses'), categories = load('categories');
      const send = (res: any, body: unknown, code = 200) => {
        res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body));
      };
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '/', 'http://x');
        const p = url.pathname;
        if (p.startsWith('/mock-media/')) {
          const file = path.join(__dirname, 'media', path.basename(decodeURIComponent(p)));
          if (!fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
          res.setHeader('content-type', MEDIA_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
          res.setHeader('cache-control', 'max-age=3600');
          return fs.createReadStream(file).pipe(res);
        }
        if (!p.startsWith('/store/')) return next();
        if (p === '/store/regions') return send(res, regions);
        if (p === '/store/products') {
          const h = url.searchParams.get('handle');
          const list = h ? products.products.filter((x: any) => x.handle === h) : products.products;
          return send(res, { products: list, count: list.length, limit: 200, offset: 0 });
        }
        if (p === '/store/product-categories') return send(res, categories);
        if (p === '/store/content') return send(res, content);
        if (p === '/store/courses') return send(res, courses);
        if (p.startsWith('/store/courses/')) {
          const h = decodeURIComponent(p.split('/').pop() || '');
          const list = courses.courses ?? [];
          const c = list.find((x: any) => x.handle === h);
          return c ? send(res, { course: c }) : send(res, { message: 'not found' }, 404);
        }
        if (p.startsWith('/store/carts')) {
          return send(res, { cart: { id: 'cart_mock', items: [], region_id: regions.regions[0].id, currency_code: 'eur',
            total: 0, subtotal: 0, tax_total: 0, shipping_total: 0, discount_total: 0, item_total: 0, shipping_methods: [] } });
        }
        return send(res, { message: 'mock: not implemented' }, 404);
      });
    },
  };
}
