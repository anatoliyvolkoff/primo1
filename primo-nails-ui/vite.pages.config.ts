// GitHub Pages demo build (`pnpm build:pages`): a static, backend-free copy of the storefront served
// from https://<user>.github.io/primo1/ui/. Everything Pages-specific lives here so the app source
// stays identical to the real store:
//   - assets + router are re-based onto the /primo1/ui/ sub-path,
//   - API calls are answered in the browser from src/dev-mock fixtures (real data + photos),
//   - every known route gets its own .html copy so deep links / refresh work without a server.
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

const BASE = '/primo1/ui/';
const OUT_DIR = path.resolve(__dirname, '../ui');
const SRC_DIR = path.resolve(__dirname, 'src') + path.sep;

const readJson = (n: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, 'src/dev-mock', `${n}.json`), 'utf8'));
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function pagesBuild(): Plugin {
  // Root-absolute references to files in public/ ("/moods/x.webp", "/logo.png") are plain strings
  // Vite never re-bases, so prefix them here. Folders need the trailing slash, which keeps routes
  // such as "/about-us" apart from the "/about/" folder.
  const entries = fs.readdirSync(path.resolve(__dirname, 'public'), { withFileTypes: true });
  // "mock-media" = the store photos the fixtures point at (copied into the build in closeBundle).
  const dirs = [...entries.filter((e) => e.isDirectory()).map((e) => escapeRe(e.name)), 'mock-media'];
  const files = entries.filter((e) => e.isFile()).map((e) => escapeRe(e.name));
  const publicRef = new RegExp(`(["'\`])/((?:${dirs.join('|')})/|(?:${files.join('|')})(?=["'\`?#]))`, 'g');

  return {
    name: 'primo-pages-build',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0];
      if (!file.startsWith(SRC_DIR) || !/\.(tsx?|json)$/.test(file)) return null;
      let out = code.replace(publicRef, `$1${BASE}$2`);
      if (file === SRC_DIR + 'App.tsx') {
        if (!out.includes('<BrowserRouter>')) this.error('pages build: <BrowserRouter> not found in App.tsx');
        out = out.replace('<BrowserRouter>', `<BrowserRouter basename="${BASE.slice(0, -1)}">`);
      }
      if (file === SRC_DIR + 'main.tsx') out = `import './dev-mock/browser';\n${out}`;
      return out === code ? null : { code: out, map: null };
    },
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex' }, injectTo: 'head' }];
    },
    // GitHub Pages serves /foo from foo.html, so copy the SPA shell to every known route.
    closeBundle() {
      fs.cpSync(path.resolve(__dirname, 'src/dev-mock/media'), path.join(OUT_DIR, 'mock-media'), { recursive: true });
      const shell = fs.readFileSync(path.join(OUT_DIR, 'index.html'));
      const handles = (list: any[]) => (list ?? []).map((x) => x.handle).filter(Boolean);
      const routes = [
        'tutti-prodotti', 'checkout', 'about-us', 'corsi', 'termini', 'termini-e-condizioni', 'privacy',
        'privacy-policy', 'spedizioni', 'spedizioni-e-resi',
        ...handles(readJson('categories').product_categories),
        ...handles(readJson('products').products).map((h) => `product/${h}`),
        ...handles(readJson('courses').courses).map((h) => `corsi/${h}`),
      ];
      for (const r of routes) {
        const target = path.join(OUT_DIR, `${r}.html`);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, shell);
      }
    },
  };
}

export default defineConfig({
  appType: 'spa',
  base: BASE,
  plugins: [pagesBuild(), react(), tailwindcss()],
  build: { outDir: OUT_DIR, emptyOutDir: true, sourcemap: false },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
