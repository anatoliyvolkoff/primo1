import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The "I Più Venduti" block must show its title on desktop like every other
// rail (same SectionTitle style), not hide it.
describe('Home — I Più Venduti title', () => {
  it('does not hide the best-sellers title', () => {
    const src = readFileSync(resolve(__dirname, 'Home.tsx'), 'utf8');
    const block = src.slice(src.indexOf('id="bestsellers"'), src.indexOf('{marquee(true, true)}'));
    expect(block).toContain("title={t('explore.bestSellers')}");
    expect(block).not.toMatch(/hideTitle/);
  });
});
