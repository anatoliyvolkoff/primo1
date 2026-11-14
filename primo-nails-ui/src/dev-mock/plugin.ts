// Dev-only host for the pretend backend (store.ts): answers /store/* from fixtures captured from the
// real store API, and serves the store's photos (./media, referenced by the fixtures as
// /mock-media/<file>), so the storefront runs with no API/Postgres/Redis/S3. Carts and orders live in
// this server's memory and reset when it restarts. Enabled with VITE_MOCK_API=1 (see `pnpm dev:mock`).
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { emptyState, handle } from './store';

const load = (n: string) => JSON.parse(fs.readFileSync(path.join(__dirname, `${n}.json`), 'utf8'));
const MEDIA_TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

export function mockApi(): Plugin {
  return {
    name: 'primo-mock-api',
    apply: 'serve',
    configureServer(server) {
      const data = { products: load('products'), regions: load('regions'), content: load('content'),
        courses: load('courses'), categories: load('categories') };
      const state = emptyState();
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
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          let body: unknown;
          try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined; } catch { body = undefined; }
          const out = handle({ method: (req.method || 'GET').toUpperCase(), path: p, query: url.searchParams, body }, data, state);
          res.statusCode = out.status;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(out.body));
        });
      });
    },
  };
}
