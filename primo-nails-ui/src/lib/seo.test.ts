import { describe, it, expect } from 'vitest';
import { toMetaDescription } from './seo';

describe('toMetaDescription', () => {
  it('decodes named HTML entities', () => {
    expect(toMetaDescription('Gel &amp; Polish')).toBe('Gel & Polish');
    expect(toMetaDescription('&lt;b&gt; is bold')).toBe('<b> is bold');
    expect(toMetaDescription('She said &quot;hi&quot;')).toBe('She said "hi"');
  });

  it('decodes numeric and hex entities', () => {
    expect(toMetaDescription('it&#39;s here')).toBe("it's here");
    expect(toMetaDescription('it&#x27;s here')).toBe("it's here");
  });

  it('decodes &nbsp; and collapses whitespace', () => {
    expect(toMetaDescription('a&nbsp;&nbsp;b')).toBe('a b');
  });

  it('strips tags before decoding so entities do not become tags', () => {
    expect(toMetaDescription('a &lt;script&gt; b')).toBe('a <script> b');
  });

  it('leaves unknown entities untouched', () => {
    expect(toMetaDescription('a &unknownent; b')).toBe('a &unknownent; b');
  });
});
