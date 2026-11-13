import { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../i18n';
import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  absUrl,
  ogLocale,
} from './seo';

type Vars = Record<string, string | number>;

export interface SeoOptions {
  /** Document title (already localized). Use this OR titleKey. */
  title?: string;
  /** Translation key for the title (resolved internally), like usePageTitle. */
  titleKey?: TranslationKey;
  titleVars?: Vars;
  /** Meta description (already localized + clamped). Use this OR descriptionKey. */
  description?: string;
  /** Translation key for the meta description. */
  descriptionKey?: TranslationKey;
  descriptionVars?: Vars;
  /**
   * Canonical / og:url. Path ("/shop") or absolute URL. Defaults to the
   * current pathname (query string dropped) when omitted.
   */
  canonicalPath?: string;
  /** Share image — path or absolute URL. Falls back to the default OG image. */
  image?: string;
  /** og:type. Defaults to 'website'. */
  type?: 'website' | 'product' | 'article';
  /** When true, emits robots noindex,nofollow (checkout, 404, etc.). */
  noindex?: boolean;
  /** One JSON-LD object or an array of them. */
  jsonLd?: object | object[] | null;
}

const JSONLD_ID = 'seo-jsonld';

/**
 * Serialize JSON-LD for the managed <script>. Multiple nodes are wrapped in a
 * single root object with `@graph` rather than emitted as a top-level JSON
 * array. Both are valid schema.org, but a top-level array has no `@context` at
 * the root — and naive structured-data readers (shopping/SEO browser
 * extensions) do `JSON.parse(script)['@context'].toLowerCase()`, which throws
 * "undefined is not an object" on an array and surfaces in our Sentry inbox.
 * The `@graph` form keeps the root `@context` a string, so those readers don't
 * crash on our pages.
 */
function serializeJsonLd(jsonLd: object | object[] | null | undefined): string {
  if (!jsonLd) return '';
  if (Array.isArray(jsonLd)) {
    return JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': jsonLd.map((node) => {
        if (node && typeof node === 'object' && '@context' in node) {
          // Hoisted to the root — drop the now-redundant per-node context.
          const { ['@context']: _omit, ...rest } = node as Record<string, unknown>;
          return rest;
        }
        return node;
      }),
    });
  }
  return JSON.stringify(jsonLd);
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attr: 'name' | 'property', key: string) {
  document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)?.remove();
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Imperatively manages the document <head> for the current page: title,
 * description, canonical, Open Graph, Twitter card, robots, <html lang>, and
 * optional JSON-LD. Every public page should call this so navigation always
 * reconciles the head (no stale tags carried between routes).
 */
export function useSeo(options: SeoOptions) {
  const { t, language } = useLanguage();
  const {
    title,
    titleKey,
    titleVars,
    description,
    descriptionKey,
    descriptionVars,
    canonicalPath,
    image,
    type = 'website',
    noindex = false,
    jsonLd,
  } = options;

  const resolvedTitle = title ?? (titleKey ? t(titleKey, titleVars) : SITE_NAME);
  const resolvedDescription =
    description ?? (descriptionKey ? t(descriptionKey, descriptionVars) : undefined);

  const ldString = serializeJsonLd(jsonLd);

  useEffect(() => {
    const title = resolvedTitle;
    const description = resolvedDescription;
    document.title = title;
    document.documentElement.lang = language;

    const url = canonicalPath
      ? absUrl(canonicalPath)
      : `${SITE_URL}${window.location.pathname}`;
    const imageUrl = image ? absUrl(image) : DEFAULT_OG_IMAGE;

    upsertLink('canonical', url);

    upsertMeta(
      'name',
      'robots',
      noindex ? 'noindex,nofollow' : 'index,follow',
    );

    // Always reconcile the description tags: pages that omit a description
    // (404, checkout, payment-return) must clear any value left by the prior
    // route, not inherit it — otherwise link previews/SEO snippets go stale.
    if (description) {
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:description', description);
      upsertMeta('name', 'twitter:description', description);
    } else {
      removeMeta('name', 'description');
      removeMeta('property', 'og:description');
      removeMeta('name', 'twitter:description');
    }

    // Open Graph
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:locale', ogLocale(language));

    // Twitter
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:image', imageUrl);

    // JSON-LD (single managed <script>). Reconcile like the meta tags above:
    // upsert when present, remove when this page has none. We deliberately do
    // NOT remove the node on effect cleanup — on a route swap React can run the
    // outgoing route's cleanup *after* the incoming route's effect has already
    // (re-)created the shared-id node, so an unmount-time remove() would delete
    // the next page's structured data. The next mount's reconcile owns removal:
    // a page with no JSON-LD hits the empty-`ldString` branch and clears it.
    const existing = document.getElementById(JSONLD_ID);
    if (ldString) {
      const script = (existing as HTMLScriptElement | null) ?? document.createElement('script');
      script.id = JSONLD_ID;
      script.setAttribute('type', 'application/ld+json');
      script.textContent = ldString;
      if (!existing) document.head.appendChild(script);
    } else if (existing) {
      existing.remove();
    }
  }, [resolvedTitle, resolvedDescription, canonicalPath, image, type, noindex, language, ldString]);
}
