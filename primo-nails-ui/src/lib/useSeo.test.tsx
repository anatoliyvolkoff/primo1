import { render } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext';
import { useSeo, type SeoOptions } from './useSeo';

// Thin test harness: mounts useSeo inside a LanguageProvider so it can read
// `t` / `language`, and re-renders with new options to simulate navigation.
function Harness({ options }: { options: SeoOptions }) {
  useSeo(options);
  return null;
}

function renderSeo(options: SeoOptions) {
  return render(
    <LanguageProvider>
      <Harness options={options} />
    </LanguageProvider>
  );
}

const JSONLD_ID = 'seo-jsonld';
const jsonLdNodes = () =>
  Array.from(document.querySelectorAll(`#${JSONLD_ID}`));
const jsonLdText = () =>
  document.getElementById(JSONLD_ID)?.textContent ?? null;

const descContent = () =>
  document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? null;
const ogDescContent = () =>
  document.head.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? null;
const twitterDescContent = () =>
  document.head.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ?? null;

describe('useSeo — description reconciliation (LB190-1)', () => {
  afterEach(() => {
    // Start each test with a clean <head> so leftover tags can't leak between tests.
    document.head.querySelectorAll('meta, link, script').forEach((el) => el.remove());
    document.title = '';
  });

  it('writes description / og:description / twitter:description when a description is given', () => {
    renderSeo({ description: 'A' });
    expect(descContent()).toBe('A');
    expect(ogDescContent()).toBe('A');
    expect(twitterDescContent()).toBe('A');
  });

  it('clears the previous description when navigating to a page without one', () => {
    const { rerender } = renderSeo({ description: 'A' });
    expect(descContent()).toBe('A');
    expect(ogDescContent()).toBe('A');
    expect(twitterDescContent()).toBe('A');

    // Simulate navigating to a page (404 / checkout / payment-return) that sets
    // no description at all.
    rerender(
      <LanguageProvider>
        <Harness options={{}} />
      </LanguageProvider>
    );

    // The stale 'A' must NOT persist on any of the three description tags.
    expect(descContent()).not.toBe('A');
    expect(ogDescContent()).not.toBe('A');
    expect(twitterDescContent()).not.toBe('A');
  });

  it('leaves unrelated meta tags intact when clearing the description', () => {
    renderSeo({ description: 'A' });
    // og:title is always managed and unrelated to the description.
    const ogTitleBefore = document.head
      .querySelector('meta[property="og:title"]')
      ?.getAttribute('content');
    expect(ogTitleBefore).toBeTruthy();

    renderSeo({});
    const ogTitleAfter = document.head.querySelector('meta[property="og:title"]');
    expect(ogTitleAfter).not.toBeNull();
  });
});

const productLd = { '@context': 'https://schema.org', '@type': 'Product', name: 'Gel A' };
const articleLd = { '@context': 'https://schema.org', '@type': 'Article', name: 'Post B' };

describe('useSeo — JSON-LD cleanup on route swap (LB190-2)', () => {
  afterEach(() => {
    document.querySelectorAll('meta, link, script').forEach((el) => el.remove());
    document.title = '';
  });

  it('emits a single JSON-LD script when a page has structured data', () => {
    renderSeo({ jsonLd: productLd });
    expect(jsonLdNodes()).toHaveLength(1);
    expect(jsonLdText()).toBe(JSON.stringify(productLd));
  });

  it('keeps the new page JSON-LD when unmounting the old route AFTER the new one mounts', () => {
    // Reproduces the ordering hazard: the incoming route's effect (re)creates
    // the shared-id node, THEN the outgoing route's cleanup fires. A teardown
    // cleanup would delete the node the new page just installed.
    const first = renderSeo({ jsonLd: productLd });
    expect(jsonLdText()).toBe(JSON.stringify(productLd));

    // Incoming route mounts (its effect reconciles the shared node)...
    const second = renderSeo({ jsonLd: articleLd });
    expect(jsonLdText()).toBe(JSON.stringify(articleLd));

    // ...and only THEN does the outgoing route unmount.
    first.unmount();

    // The new page's structured data must survive the old route's cleanup.
    expect(jsonLdNodes()).toHaveLength(1);
    expect(jsonLdText()).toBe(JSON.stringify(articleLd));

    second.unmount();
  });

  it('does not accumulate duplicate JSON-LD nodes across route swaps', () => {
    const { rerender } = renderSeo({ jsonLd: productLd });
    rerender(
      <LanguageProvider>
        <Harness options={{ jsonLd: articleLd }} />
      </LanguageProvider>
    );
    rerender(
      <LanguageProvider>
        <Harness options={{ jsonLd: productLd }} />
      </LanguageProvider>
    );
    expect(jsonLdNodes()).toHaveLength(1);
    expect(jsonLdText()).toBe(JSON.stringify(productLd));
  });

  it('removes the JSON-LD script when navigating to a page with no structured data', () => {
    const { rerender } = renderSeo({ jsonLd: productLd });
    expect(jsonLdNodes()).toHaveLength(1);

    // Navigate to a page that sets no JSON-LD at all (e.g. 404 / checkout).
    rerender(
      <LanguageProvider>
        <Harness options={{}} />
      </LanguageProvider>
    );

    expect(jsonLdNodes()).toHaveLength(0);
  });
});
