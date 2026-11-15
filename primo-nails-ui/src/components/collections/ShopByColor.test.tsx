import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NAIL_SWATCHES } from '../../data/swatches';

// ── Mocks ──────────────────────────────────────────────────────────────────
// i18n: echo the key so swatch labels / headings are assertable by key.
vi.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

// motion/react → plain nodes; strip motion-only props so they don't leak to the
// DOM. motion(Link) must forward `to`/children so the nav-mode <a> still works.
vi.mock('motion/react', () => {
  const strip = (props: any) => {
    const {
      initial: _i, animate: _a, exit: _e, transition: _t,
      whileHover: _wh, whileTap: _wt, ...rest
    } = props;
    return rest;
  };
  const motion = ((Comp: any) => (props: any) => {
    const { children, ...rest } = strip(props);
    return <Comp {...rest}>{children}</Comp>;
  }) as any;
  motion.div = (props: any) => {
    const { children, ...rest } = strip(props);
    return <div {...rest}>{children}</div>;
  };
  motion.button = (props: any) => {
    const { children, ...rest } = strip(props);
    return <button {...rest}>{children}</button>;
  };
  return { motion, AnimatePresence: ({ children }: any) => <>{children}</> };
});

import { ShopByColor } from './ShopByColor';

const renderNav = () =>
  render(
    <MemoryRouter>
      <ShopByColor />
    </MemoryRouter>,
  );

describe('ShopByColor — nav mode (Home discovery widget)', () => {
  it('renders one swatch per NAIL_SWATCHES entry, each linking to /semipermanente?color=<slug>', () => {
    renderNav();
    for (const swatch of NAIL_SWATCHES) {
      const link = screen.getByRole('link', { name: swatch.i18nKey });
      expect(link).toHaveAttribute('href', `/semipermanente?color=${swatch.slug}`);
    }
    // No buttons in nav mode — swatches and both CTAs are links.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('phone "see all" pill is a link to the Gel Polish catalogue (/semipermanente)', () => {
    renderNav();
    expect(screen.getByRole('link', { name: 'shop.seeAll' })).toHaveAttribute('href', '/semipermanente');
  });

  it('shows the "Show All" CTA linking to /semipermanente (nav mode only)', () => {
    renderNav();
    expect(screen.getByRole('link', { name: 'shop.showAll' })).toHaveAttribute('href', '/semipermanente');
  });

  it('renders mood-photo swatches as <img> and the y+o split as a CSS fallback', () => {
    const { container } = renderNav();

    // Every swatch WITH a moodPhoto renders that image at its path.
    for (const swatch of NAIL_SWATCHES.filter((s) => s.moodPhoto)) {
      expect(container.querySelector(`img[src="${swatch.moodPhoto}"]`)).toBeTruthy();
    }

    // The combined y+o swatch intentionally has NO mood photo → it must render
    // the CSS split-gradient fallback (glossy ellipse), not an <img>.
    const yo = NAIL_SWATCHES.find((s) => s.slug === 'y-o')!;
    expect(yo.moodPhoto).toBeUndefined();
    const yoLink = screen.getByRole('link', { name: yo.i18nKey });
    // Its interactive wrapper contains the CSS shape, no photo.
    expect(yoLink.querySelector('img')).toBeNull();
    const shape = yoLink.querySelector('span[aria-hidden="true"]') as HTMLElement | null;
    expect(shape).toBeTruthy();
    expect(shape).toHaveStyle({ background: yo.color });
  });
});

describe('ShopByColor — filter mode (category page control)', () => {
  const renderFilter = (selected: string[], onToggle = vi.fn()) =>
    render(
      <MemoryRouter>
        <ShopByColor selectedColors={selected} onToggle={onToggle} />
      </MemoryRouter>,
    );

  it('renders swatches as buttons (not links) and hides the explore CTA', () => {
    renderFilter([]);
    // Swatches are now buttons.
    expect(screen.getAllByRole('button').length).toBe(NAIL_SWATCHES.length);
    expect(screen.queryByRole('link')).toBeNull();
    // The bottom explore CTA is suppressed in filter mode.
    expect(screen.queryByText('shop.showAll')).toBeNull();
  });

  it('marks the selected swatch aria-pressed and fires onToggle with the swatch NAME', () => {
    const onToggle = vi.fn();
    const rosso = NAIL_SWATCHES.find((s) => s.slug === 'rosso')!;
    renderFilter([rosso.name], onToggle);

    const btn = screen.getByRole('button', { name: rosso.i18nKey });
    expect(btn).toHaveAttribute('aria-pressed', 'true');

    const nude = NAIL_SWATCHES.find((s) => s.slug === 'nude')!;
    const nudeBtn = screen.getByRole('button', { name: nude.i18nKey });
    expect(nudeBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(nudeBtn);
    // Toggles by the internal NAME token (not the slug / i18n label).
    expect(onToggle).toHaveBeenCalledWith(nude.name);
  });
});

describe('ShopByColor — swatch label rendering', () => {
  it('labels every swatch with its i18n key', () => {
    const { container } = renderNav();
    // Each column carries the label span; count the distinct labels present.
    for (const swatch of NAIL_SWATCHES) {
      // Labels are inside the column; the link also has the aria-label, so scope
      // the assertion to the column text.
      expect(within(container as HTMLElement).getAllByText(swatch.i18nKey).length).toBeGreaterThan(0);
    }
  });
});
