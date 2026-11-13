import React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useProducts } from '../../context/ProductContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { QuickViewModal } from '../QuickViewModal';
import { SEASON_META, SEASON_GLOW } from './seasonMeta';
import type { Product } from '../../types';
import { falloffT, nearestCenterIndex } from './seasonCarousel';
import { useSeasons } from '../../hooks/useSeasons';
import './seasons.css';

// Primo1 "The Seasons": card order, accent colour, CTA tint and photo per season.
const LOOK: { name: string; id: string; color: string; cta: string; isNew: boolean }[] = [
  { name: 'AUTUMN', id: 'autumn', color: SEASON_GLOW.autumn, cta: '#fcf5eb', isNew: false },
  { name: 'WINTER', id: 'winter', color: SEASON_GLOW.winter, cta: '#f2f3f7', isNew: false },
  { name: 'SPRING', id: 'spring', color: SEASON_GLOW.spring, cta: '#fdf1f5', isNew: false },
  { name: 'SUMMER', id: 'summer', color: SEASON_GLOW.summer, cta: '#f2fdec', isNew: true },
];
const PHOTO = '/collections/the-seasons';
const MAX_SHADES = 8;

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

export const SeasonalCollections = () => {
  const [expandedSeason, setExpandedSeason] = React.useState<string | null>(null);
  // Primo1 opens each season's kit in the product quick-view pop-up.
  const [qvProduct, setQvProduct] = React.useState<Product | null>(null);
  const [isAdded, setIsAdded] = React.useState(false);
  const addedTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addToCart } = useCart();
  // Phones: index of the centred card — drives the background, dots and CTA.
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [sel, setSel] = React.useState<Record<string, number>>({});
  const [swapKey, setSwapKey] = React.useState<Record<string, number>>({});

  const trackRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLElement | null)[]>([]);
  const rafRef = React.useRef<number | null>(null);

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { products } = useProducts();
  const { t } = useLanguage();
  const allSeasons = useSeasons();
  const SEASONS = React.useMemo(
    () => LOOK.flatMap(l => {
      const s = allSeasons.find(x => x.name === l.name);
      return s ? [{ ...s, look: l }] : [];
    }),
    [allSeasons],
  );
  const byHandle = React.useMemo(() => new Map(products.map(p => [p.handle ?? p.id, p])), [products]);

  React.useEffect(() => () => {
    if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current);
  }, []);

  // The season a product belongs to (its kit, or a shade inside the kit), so the
  // background tint follows the season tabs inside the pop-up.
  const seasonOf = (p: Product) =>
    SEASONS.find(s => s.kitHandle === p.handle || (s.productHandles ?? []).includes(p.handle ?? ''))?.name;

  const openSeason = (name: string) => {
    const season = SEASONS.find(s => s.name === name);
    const kit = season ? byHandle.get(season.kitHandle) : undefined;
    if (!kit) return;
    setQvProduct(kit);
    setExpandedSeason(name);
  };
  // The "added ✓" flash belongs to the kit it was added from.
  const resetAdded = () => {
    if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current);
    setIsAdded(false);
  };
  const closeSeason = () => {
    resetAdded();
    setQvProduct(null);
    setExpandedSeason(null);
  };
  const qvChildren = React.useMemo(
    () => (qvProduct?.bundleHandles ?? []).map(h => byHandle.get(h)).filter((p): p is Product => !!p),
    [qvProduct, byHandle],
  );
  const handleAddToCart = (qty: number) => {
    if (!qvProduct) return;
    addToCart(qvProduct, qty);
    setIsAdded(true);
    if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current);
    addedTimeoutRef.current = setTimeout(() => setIsAdded(false), 2000);
  };

  // Desktop tints the background only while a season's pop-up is open; phones follow the centred card.
  const activeIdx = isDesktop
    ? SEASONS.findIndex(s => s.name === expandedSeason)
    : Math.min(activeIndex, SEASONS.length - 1);
  const active = activeIdx >= 0 ? SEASONS[activeIdx] : undefined;

  const updateFalloff = React.useCallback(() => {
    const track = trackRef.current;
    if (!track || window.matchMedia('(min-width: 1024px)').matches) return;
    const rect = track.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const pitch = (cardRefs.current[0]?.offsetWidth ?? 260) + 17;
    const centers: number[] = [];
    cardRefs.current.forEach(el => {
      if (!el) { centers.push(Number.POSITIVE_INFINITY); return; }
      const r = el.getBoundingClientRect();
      const cc = r.left + r.width / 2;
      centers.push(cc);
      el.style.setProperty('--t', String(falloffT(cc - center, pitch)));
    });
    const idx = nearestCenterIndex(center, centers);
    if (idx >= 0) setActiveIndex(cur => (cur === idx ? cur : idx));
  }, []);

  const onTrackScroll = React.useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => { rafRef.current = null; updateFalloff(); });
  }, [updateFalloff]);

  React.useLayoutEffect(() => {
    if (isDesktop) { cardRefs.current.forEach(el => el?.style.removeProperty('--t')); return; }
    updateFalloff();
  }, [isDesktop, SEASONS.length, updateFalloff]);

  React.useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  const scrollToCard = (idx: number) => {
    const el = cardRefs.current[idx];
    const track = trackRef.current;
    if (!el || !track) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  };

  const onTrackKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== trackRef.current || isDesktop) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollToCard(Math.min(activeIndex + 1, SEASONS.length - 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollToCard(Math.max(activeIndex - 1, 0)); }
  };

  const shadesOf = (season: (typeof SEASONS)[number]) =>
    (season.productHandles ?? []).slice(0, MAX_SHADES).map((h, i) => {
      const p = byHandle.get(h);
      return { img: p?.swatchImage, hex: season.colors[i] ?? '#E0E0E0', label: p?.name ?? '' };
    });

  const pickShade = (name: string, n: number) => {
    setSel(s => ({ ...s, [name]: n }));
    setSwapKey(k => ({ ...k, [name]: (k[name] ?? 0) + 1 }));
  };

  const onCardClick = (e: React.MouseEvent, idx: number) => {
    const season = SEASONS[idx];
    if (!isDesktop && idx !== activeIndex) { scrollToCard(idx); return; }   // phones: first tap centres a side card
    if ((e.target as HTMLElement).closest('.sw')) return;
    if (isDesktop || (e.target as HTMLElement).closest('.ps-photo')) openSeason(season.name);
  };

  const sectionStyle = {
    '--accent': active?.look.color ?? '#c4c4c9',
    '--cta-bg': active?.look.cta ?? 'transparent',
  } as React.CSSProperties;

  return (
    <section
      className="pm-seasons"
      id="collections"
      data-season={active?.look.id}
      style={sectionStyle}
      aria-label={t('seasons.title' as any)}
    >
      <div className="ps-bg" aria-hidden>
        {SEASONS.map((s, i) => (
          <div key={s.name} className={`ps-layer ${i === activeIdx ? 'on' : ''}`} style={{ '--c': s.look.color } as React.CSSProperties} />
        ))}
      </div>

      <header className="ps-head">
        <h2 lang="en">{t('seasons.title' as any)}</h2>
        <p lang="en">{t('seasons.subtitle' as any)}</p>
      </header>

      <div className="ps-carousel" aria-roledescription="carousel">
        <div
          ref={trackRef}
          className="ps-track"
          tabIndex={0}
          onScroll={onTrackScroll}
          onKeyDown={onTrackKeyDown}
          aria-label={t('collections.title' as any)}
        >
          {SEASONS.map((season, idx) => {
            const { look } = season;
            const shades = shadesOf(season);
            const shown = shades.slice(0, 3);
            const extra = shades.length - 3;
            const cur = Math.min(sel[season.name] ?? 0, Math.max(shades.length - 1, 0));
            const title = t(SEASON_META[season.name]?.nameKey as any);
            return (
              <article
                key={season.name}
                ref={el => { cardRefs.current[idx] = el; }}
                className={`ps-card ${idx === activeIdx ? 'active' : ''}`}
                style={{ '--c': look.color } as React.CSSProperties}
                aria-label={title}
                onClick={e => onCardClick(e, idx)}
              >
                <button type="button" className="ps-photo" aria-label={`${t('seasons.cta' as any)} ${title}`}>
                  <picture>
                    <source media="(min-width:1024px)" srcSet={`${PHOTO}/${look.id}-d.jpg`} />
                    <img src={`${PHOTO}/${look.id}.jpg`} alt="" draggable={false} decoding="async" loading="lazy" />
                  </picture>
                  {look.isNew && <span className="ps-badge" lang="en">{t('seasons.new' as any)}</span>}
                  <span className="ps-go" aria-hidden>{t('seasons.discover' as any)}</span>
                </button>
                <div className="ps-meta">
                  <h3 lang="en">{look.id}</h3>
                  {shades.length > 0 && (
                    <div className="ps-sw" role="group" aria-label={title}>
                      {shown.map((sh, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`sw ${cur === i ? 'sel' : ''} `}
                          style={{
                            '--sw': sh.hex,
                            '--i': i - 3,
                            backgroundImage: sh.img ? `url(${sh.img})` : undefined,
                          } as React.CSSProperties}
                          aria-label={sh.label}
                          aria-pressed={cur === i}
                          onClick={() => pickShade(season.name, i)}
                        />
                      ))}
                      {extra > 0 && (
                        <span className="more" aria-hidden="true">+{extra}</span>
                      )}
                    </div>
                  )}
                  <p key={swapKey[season.name] ?? 0} className={`ps-shade ${swapKey[season.name] ? 'swap' : ''}`} aria-live="polite">
                    {shades[cur]?.label}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="ps-dots" role="tablist" aria-label={t('collections.title' as any)}>
        {SEASONS.map((s, idx) => (
          <button
            key={s.name}
            type="button"
            role="tab"
            className="ps-dot"
            aria-selected={idx === activeIdx}
            aria-label={t(SEASON_META[s.name]?.nameKey as any)}
            onClick={() => scrollToCard(idx)}
          />
        ))}
      </div>
      <button type="button" className="ps-cta" onClick={() => active && openSeason(active.name)}>
        {t('seasons.cta' as any)}
      </button>
      <Link to="/kit" className="ps-all" lang="en">{t('seasons.showAll' as any)}</Link>

      {/* Portalled to <body>: this section is its own stacking context, which
          would otherwise keep the pop-up under the fixed header. */}
      {qvProduct && createPortal(
        <QuickViewModal
          product={qvProduct}
          bundleChildren={qvChildren}
          shadeSiblings={[]}
          open
          onClose={closeSeason}
          onAddToCart={handleAddToCart}
          isAdded={isAdded}
          onPickSibling={(p) => {
            resetAdded();
            setQvProduct(p);
            const name = seasonOf(p);
            if (name) setExpandedSeason(name);
          }}
        />,
        document.body,
      )}
    </section>
  );
};
