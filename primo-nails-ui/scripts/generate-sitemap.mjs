#!/usr/bin/env node
/**
 * Generates public/sitemap.xml from the live Medusa Store API.
 *
 * Run ON DEMAND — this is intentionally NOT wired into `pnpm build`, so it
 * never touches the deploy pipeline or requires the API to be reachable at
 * build time. Run it locally (or in a job) whenever the catalogue changes:
 *
 *     pnpm seo:sitemap
 *
 * Config (read from .env, overridable via real env vars):
 *   VITE_MEDUSA_BACKEND_URL      e.g. http://localhost:9000
 *   VITE_MEDUSA_PUBLISHABLE_KEY  pk_...
 *   VITE_SITE_URL                public origin (default https://primonails.it)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── Minimal .env loader (no dependency) ─────────────────────────────────────
function loadEnv() {
  const env = { ...process.env };
  const envPath = resolve(root, '.env');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

const env = loadEnv();
const BACKEND = (env.VITE_MEDUSA_BACKEND_URL || 'http://localhost:9000').replace(/\/+$/, '');
const KEY = env.VITE_MEDUSA_PUBLISHABLE_KEY || '';
const SITE_URL = (env.VITE_SITE_URL || 'https://primonails.it').replace(/\/+$/, '');

const headers = { 'Content-Type': 'application/json' };
if (KEY) headers['x-publishable-api-key'] = KEY;

async function getJson(path) {
  const res = await fetch(`${BACKEND}${path}`, { headers });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

async function fetchAllProducts() {
  const out = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const data = await getJson(`/store/products?limit=${limit}&offset=${offset}&fields=handle,status`);
    const batch = data.products || [];
    out.push(...batch);
    if (batch.length < limit || out.length >= (data.count ?? out.length)) break;
  }
  return out
    .filter((p) => p.status === undefined || p.status === 'published')
    .map((p) => p.handle)
    .filter(Boolean);
}

async function fetchCategories() {
  try {
    const data = await getJson('/store/product-categories?limit=200&fields=handle');
    return (data.product_categories || []).map((c) => c.handle).filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchCourses() {
  try {
    const data = await getJson('/store/courses');
    const list = Array.isArray(data) ? data : data.courses || [];
    return list.map((c) => c.handle || c.id).filter(Boolean);
  } catch {
    return [];
  }
}

// Stable routes that always exist in the SPA.
const STATIC_PATHS = ['/', '/shop', '/tutti-prodotti', '/nail-art', '/care', '/corsi', '/about-us'];

function xmlEscape(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(path, priority) {
  return `  <url>\n    <loc>${xmlEscape(SITE_URL + path)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function main() {
  console.log(`[sitemap] backend=${BACKEND} site=${SITE_URL}`);
  let products = [];
  let categories = [];
  let courses = [];
  try {
    [products, categories, courses] = await Promise.all([
      fetchAllProducts(),
      fetchCategories(),
      fetchCourses(),
    ]);
  } catch (err) {
    console.error(`[sitemap] could not reach the API (${err.message}).`);
    console.error('[sitemap] Make sure the Medusa API is running, or set VITE_MEDUSA_BACKEND_URL.');
    process.exit(1);
  }

  const candidates = [
    ...STATIC_PATHS.map((p) => ({ path: p, priority: p === '/' ? '1.0' : '0.8' })),
    ...categories.map((h) => ({ path: `/${encodeURIComponent(h)}`, priority: '0.7' })),
    ...products.map((h) => ({ path: `/product/${encodeURIComponent(h)}`, priority: '0.6' })),
    ...courses.map((h) => ({ path: `/corsi/${encodeURIComponent(h)}`, priority: '0.5' })),
  ];

  // Dedup by path — a category handle can collide with a reserved static
  // route (e.g. `/care`); the static entry (listed first) wins.
  const seen = new Set();
  const entries = [];
  for (const { path, priority } of candidates) {
    if (seen.has(path)) continue;
    seen.add(path);
    entries.push(urlEntry(path, priority));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
  const outPath = resolve(root, 'public', 'sitemap.xml');
  writeFileSync(outPath, xml, 'utf8');
  console.log(
    `[sitemap] wrote ${outPath} — ${STATIC_PATHS.length} static, ${categories.length} categories, ${products.length} products, ${courses.length} courses.`,
  );
}

main();
