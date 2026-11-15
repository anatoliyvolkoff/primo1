import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { it as itStrings } from './it';
import { en } from './en';

// Site-wide QA sweep (2026-11-15): small copy / a11y regressions.
describe('QA sweep fixes', () => {
  it('has a singular shade-count label (no "1 Colori")', () => {
    expect(itStrings['product.color']).toBe('Colore');
    expect(en['product.color']).toBe('Color');
    const pdp = readFileSync(resolve(__dirname, '../pages/ProductDetail.tsx'), 'utf8');
    expect(pdp).not.toContain("t('product.colors' as any)");
  });

  it('uses correct Italian on checkout and founder copy', () => {
    expect(itStrings['checkout.title']).toBe('Checkout sicuro');
    expect(itStrings['founder.more']).toBe('LEGGI DI PIÙ');
  });

  it('keeps the closed cart drawer out of the tab order', () => {
    const src = readFileSync(resolve(__dirname, '../components/layout/header/CartSidebar.tsx'), 'utf8');
    expect(src).toContain('inert={!isOpen}');
  });
});
