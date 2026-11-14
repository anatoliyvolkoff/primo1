// Central SEO config + JSON-LD builders.
//
// This is a pure-CSR SPA, so all of this runs client-side after render.
// Google executes JS and reads it; non-JS crawlers / social scrapers see only
// the static baseline in index.html (until/unless prerendering is added later).

/** Absolute site origin, no trailing slash. Override per-env via VITE_SITE_URL. */
export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, '') ||
  'https://primonails.it'
);

export const SITE_NAME = 'PriMo Nails';

/** Default share image (per-page SEO overrides this where it has a better one). */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/banner.png`;

/** Make a path absolute against SITE_URL. Pass-through if already absolute. */
export function absUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return SITE_URL;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}/${pathOrUrl.replace(/^\/+/, '')}`;
}

/** Named HTML entities we expect to see in product/course copy. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * Decode common HTML entities to their characters. Pure string decode (no DOMParser)
 * so it stays deterministic and works in any context. Handles the named entities above
 * plus numeric (`&#39;`) and hex (`&#x27;`) references.
 */
function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X';
      const code = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (Number.isNaN(code)) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named !== undefined ? named : match;
  });
}

/** Strip HTML tags, decode entities, collapse whitespace, then clamp to `max` chars. */
export function toMetaDescription(input: string | undefined | null, max = 160): string {
  if (!input) return '';
  const text = decodeHtmlEntities(input.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export const ogLocale = (language: string): string =>
  language === 'en' ? 'en_US' : 'it_IT';

// ── JSON-LD builders ───────────────────────────────────────────────────────
// Each returns a plain object; the consuming page passes it to useSeo({ jsonLd }).

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/brand%20image.png`,
    sameAs: [] as string[],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export interface BreadcrumbItem {
  name: string;
  /** Path or absolute URL. */
  url: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absUrl(item.url),
    })),
  };
}

export interface ProductJsonLdInput {
  name: string;
  description?: string;
  image?: string;
  url: string;
  price?: number | string;
  currency?: string;
  inStock?: boolean;
  sku?: string;
  brand?: string;
}

export function productJsonLd(p: ProductJsonLdInput) {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    url: absUrl(p.url),
    brand: { '@type': 'Brand', name: p.brand || SITE_NAME },
  };
  if (p.description) ld.description = p.description;
  if (p.image) ld.image = absUrl(p.image);
  if (p.sku) ld.sku = p.sku;
  if (p.price != null) {
    ld.offers = {
      '@type': 'Offer',
      // schema.org wants a plain 2-decimal price string ("17.00", not "17" or
      // a float artifact like "12.3000001") (LB189-2).
      price: Number.isFinite(Number(p.price)) ? Number(p.price).toFixed(2) : String(p.price),
      priceCurrency: p.currency || 'EUR',
      availability: p.inStock === false
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      url: absUrl(p.url),
    };
  }
  return ld;
}

export interface CourseJsonLdInput {
  name: string;
  description?: string;
  url: string;
}

export function courseJsonLd(c: CourseJsonLdInput) {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: c.name,
    url: absUrl(c.url),
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      sameAs: SITE_URL,
    },
  };
  if (c.description) ld.description = c.description;
  return ld;
}
