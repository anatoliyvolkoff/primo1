import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Check, Eye, Plus } from 'lucide-react';
import { Product } from '../data';
import { highlightTokens } from '../lib/searchMatch';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../context/ProductContext';
import { formatPrice } from '../lib/formatPrice';
import { PRODUCT_PLACEHOLDER } from '../lib/imageFallback';
import { resolveBadge, BUILTIN_BADGES, type BadgeDef } from '../lib/badges';
import { useStoreSetting } from '../hooks/useStoreContent';
import { computeSalePercent } from '../lib/sale';
import { Button, Price, Swatch, SwatchGroup } from './ui';
import { SalePill } from './ui/SalePill';
import { ZoomCarousel } from './ui/ZoomCarousel';
import { QuickViewModal } from './QuickViewModal';

interface ProductCardProps {
  product: Product;
  /** Catalogue grid card (primo1 `.gcard`): the quick-view eye is always shown on phones. */
  grid?: boolean;
  /** Search overlay: highlight the matched words in the title (bold) and use the compact search title style. */
  highlightQuery?: string;
  /** Search overlay: called when the card navigates to the product page (so the overlay can close). Also hides quick-view, which would open behind the overlay. */
  onNavigate?: () => void;
}

// Phone shade row (Primo1 compact card `--cc-slots`): the circles share a row
// with the round add button — 5 slots on rail cards, 4 on the narrow two-up
// catalogue cards (under 230px, a container query). A longer row fills all but
// the last slot and puts a "+N" chip there that expands the rest. Desktop keeps
// its own row: 5 circles on ONE line, and a 6th slot holding an outlined "+N"
// circle when there are more (DESKTOP slots = 6).
const SHADE_SLOTS_WIDE = 5;
const SHADE_SLOTS_NARROW = 4;
const SHADE_SLOTS_DESKTOP = 6;
// Search overlay cards use the catalogue's desktop swatch sizes too; next to the
// suggestion column they are narrower (~203px) than a catalogue card, so the
// row drops to 5 slots there (4 circles + "+N") instead of overflowing.
const SHADE_SLOTS_DESKTOP_NARROW = 5;

export const ProductCard: React.FC<ProductCardProps> = ({ product, grid = false, highlightQuery, onNavigate }) => {
  const { addToCart } = useCart();
  const { t, language } = useLanguage();
  const { products: allProducts } = useProducts();
  const [activeProduct, setActiveProduct] = useState(product);
  const [isAdded, setIsAdded] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const shadesOpen = false; // the row never expands in place: the "+N" circle opens the product page
  const addedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with prop if it changes (e.g. filter change)
  useEffect(() => {
    setActiveProduct(product);
  }, [product]);

  // Shade siblings: when this product is a colour shade (has_shade=true),
  // group with other products that share the same category + sub-category +
  // colour name, AND the same effect *presence* — effect shades group only with
  // other effect shades, plain shades only with plain shades (boolean match, not
  // same-specific-effect). These are conceptually "different SKUs of the same
  // product". For non-shade products the row is empty and only the product's
  // own swatch (if any) is shown. Mirrors the PDP 'Sfumature' logic.
  const shadeSiblings = React.useMemo(() => {
    if (!product.hasShade || !product.colorName) return [];
    return allProducts.filter(
      (p) =>
        p.hasShade &&
        p.colorName === product.colorName &&
        p.category === product.category &&
        (p.subCategory || null) === (product.subCategory || null) &&
        Boolean(p.effect) === Boolean(product.effect)
    );
  }, [allProducts, product]);

  // Kit contents: resolve each bundle_handle to a real Product so the card
  // can render the bundled shades' swatches in place of the size pill.
  const bundleChildren = React.useMemo(() => {
    if (!activeProduct.bundleHandles?.length) return [];
    const byHandle = new Map(allProducts.map((p) => [p.handle, p]));
    return activeProduct.bundleHandles
      .map((h) => byHandle.get(h))
      .filter((p): p is Product => !!p);
  }, [allProducts, activeProduct]);

  // Clear the "added" reset timeout on unmount so we never setState on an
  // unmounted component (card can unmount during the 2s window, e.g. filter change).
  useEffect(() => {
    return () => {
      if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current);
    };
  }, []);

  // Reuses the CartContext addToCart handler — the card's ATC adds a single
  // unit; the quick-view passes its own stepper quantity. No separate cart path.
  const handleAddToCart = (qty: number = 1) => {
    addToCart(activeProduct, qty);
    setIsAdded(true);
    if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current);
    addedTimeoutRef.current = setTimeout(() => setIsAdded(false), 2000);
  };

  // Overflow chip ("+N"): phones only. Kits keep every child on desktop (as
  // before); shade rows keep the desktop cap.
  const shadeRowCount = bundleChildren.length > 0 ? bundleChildren.length : shadeSiblings.length;
  // The card's own shade must stay visible: when it sits past the visible
  // slots it takes the last visible one (the shade there is hidden instead).
  const activeShadeIndex = bundleChildren.length > 0 ? -1 : shadeSiblings.findIndex((s) => s.id === activeProduct.id);
  const overflowsAt = (slots: number) => !shadesOpen && shadeRowCount > slots;
  const hiddenAt = (i: number, slots: number) => {
    if (!overflowsAt(slots) || i === activeShadeIndex) return false;
    const visible = slots - 1;
    return i >= visible || (activeShadeIndex >= visible && i === visible - 1);
  };
  // Search overlay: a denser card (own image height, title and button), but
  // the swatch row matches the catalogue card (sizes, gaps, left inset).
  const compact = Boolean(onNavigate);
  // Every shade hidden in the wide layout is also hidden in the narrow one.
  const hiddenOnPhone = (i: number) =>
    (hiddenAt(i, SHADE_SLOTS_WIDE) ? 'max-lg:hidden' : hiddenAt(i, SHADE_SLOTS_NARROW) ? 'max-lg:@max-[230px]:hidden' : '') +
    (hiddenAt(i, SHADE_SLOTS_DESKTOP) ? ' lg:hidden' : compact && hiddenAt(i, SHADE_SLOTS_DESKTOP_NARROW) ? ' lg:@max-[230px]:hidden' : '');
  const shadeRowSiblings = shadeSiblings;
  const isOutOfStock = activeProduct.inStock === false;
  const wideChip = overflowsAt(SHADE_SLOTS_WIDE);
  const desktopChip = overflowsAt(SHADE_SLOTS_DESKTOP);
  const desktopNarrowChip = compact && !desktopChip && overflowsAt(SHADE_SLOTS_DESKTOP_NARROW);
  // The "+N" circle opens the product page, where every colour is shown (kits
  // open the kit page, where all its shades are listed).
  const moreShadesChip = (overflowsAt(SHADE_SLOTS_NARROW) || desktopChip) && (
    <Link
      to={`/product/${activeProduct.handle || activeProduct.id}`}
      onClick={(e) => e.stopPropagation()}
      className={`${wideChip ? 'grid' : 'hidden max-lg:@max-[230px]:grid'} ${desktopChip ? 'lg:grid' : 'lg:hidden'} ${desktopNarrowChip ? 'lg:@max-[230px]:grid' : ''} relative shrink-0 rounded-full bg-[#f0f0f0] text-[#3a3a3a] font-semibold tracking-[-0.02em] place-items-center w-[29px] h-[29px] text-[10px] max-lg:@max-[230px]:w-[22px] max-lg:@max-[230px]:h-[22px] max-lg:@max-[230px]:text-[8px] lg:w-[26px] lg:h-[26px] lg:bg-white lg:border lg:border-[#555] lg:text-[#555] lg:text-[10px] active:scale-90 transition-transform before:absolute before:-inset-x-px before:-inset-y-[7px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
    >
      {/* The count matches the layout's own number of visible slots. The
          visible "+N" stays part of the accessible name (label in name); the
          CSS-hidden variant is display:none, so it drops out of it. */}
      <span className={`hidden lg:inline ${compact ? 'lg:@max-[230px]:hidden' : ''}`}>+{shadeRowCount - (SHADE_SLOTS_DESKTOP - 1)}</span>
      {compact && <span className="hidden lg:@max-[230px]:inline">+{shadeRowCount - (SHADE_SLOTS_DESKTOP_NARROW - 1)}</span>}
      {wideChip && <span className="@max-[230px]:hidden lg:hidden">+{shadeRowCount - (SHADE_SLOTS_WIDE - 1)}</span>}
      <span className={`${wideChip ? 'hidden max-lg:@max-[230px]:inline' : ''} lg:hidden`}>+{shadeRowCount - (SHADE_SLOTS_NARROW - 1)}</span>
      <span className="sr-only"> {t('collections.moreShades')}</span>
    </Link>
  );
  // Phone swatch sizes: 29px in rails, 22px in the narrow two-up catalogue grid.
  const phoneSwatchSize = 'max-lg:w-[29px] max-lg:h-[29px] max-lg:@max-[230px]:w-[22px] max-lg:@max-[230px]:h-[22px]';
  const shadeRowClass = `flex ${shadesOpen ? 'flex-wrap' : 'lg:flex-nowrap flex-wrap'} items-center justify-start w-full gap-1.5 lg:gap-2 min-h-9 lg:min-h-[30px] max-lg:w-auto max-lg:flex-1 max-lg:min-w-0 max-lg:@max-[230px]:min-h-[30px] max-lg:@max-[230px]:gap-1`;

  const openQuickView = () => {
    setIsQuickViewOpen(true);
  };

  const badgeDefs = useStoreSetting<BadgeDef[]>('badges', BUILTIN_BADGES);
  const resolvedBadge = resolveBadge(activeProduct.badge, activeProduct.isPromoted, badgeDefs, language);
  const badgeLabel = resolvedBadge?.label ?? '';
  // Genuine-discount gate for the sale pill (B6): null unless the product has a
  // strictly-higher original price, so a malformed/equal/zero original no longer
  // renders a bogus "0%"/"-5%"/"NaN%" badge.
  const cardSalePercent = computeSalePercent(activeProduct.price, activeProduct.originalPrice);

  return (
    <>
      <div
        className={`pm-card-lift group @container relative bg-card border-[1.5px] border-[#999] rounded-[24px] overflow-hidden flex flex-col transition-[box-shadow,transform,border-color] duration-[400ms] ease-[cubic-bezier(.25,.1,.25,1)] w-full shadow-[0_3px_8px_rgba(0,0,0,0.1)] lg:h-[394px] lg:border lg:rounded-[15px] lg:border-[#9a9a9a] lg:shadow-none lg:hover:shadow-[0_18px_34px_-20px_rgba(0,0,0,0.3)] lg:hover:-translate-y-1 lg:hover:border-[#6f6f6f] ${compact ? 'lg:!h-auto lg:!rounded-[14px]' : ''} ${grid ? 'max-lg:border max-lg:border-[#bebebe] max-lg:rounded-[18px] max-lg:shadow-[0_2px_6px_rgba(0,0,0,0.06)]' : ''}`}
      >
        {/* Whole-card link (stretched) — a real <a href> for SEO + open-in-new-tab.
            Interactive controls (eye, swatches, add-to-cart) sit above it via z-index. */}
        <Link
          to={`/product/${activeProduct.handle || activeProduct.id}`}
          aria-label={activeProduct.name}
          onClick={onNavigate}
          className="absolute inset-0 z-10"
        />

        {/* Image Section — prototype `.pimg`: relative clip box, light-grey bg,
            holds the hover-zoom scroll track (ZoomCarousel) + overlays. */}
        <div
          className={`relative aspect-[287/255] lg:aspect-auto lg:h-[210px] ${compact ? 'lg:!aspect-[287/255] lg:!h-auto' : ''} w-full flex items-center justify-center overflow-hidden bg-[#fdfdfd] lg:bg-[#fcfcfc]`}
        >
          {/* Badge Layer — Figma sale pill (top-left). When the product is
              genuinely discounted we surface the % off in the red sale Badge
              (SalePill, which renders nothing for a malformed/equal/zero
              original — B6); otherwise the resolved badge keeps its own
              configured style/label. The sale pill takes priority over the
              admin-configured badge. */}
          {(activeProduct.badge || cardSalePercent !== null) && (
            <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-40 flex items-center gap-1.5">
              {cardSalePercent !== null ? (
                <SalePill
                  variant="card"
                  current={activeProduct.price}
                  original={activeProduct.originalPrice}
                  className="px-2.5 sm:px-3 shadow-card lg:shadow-none"
                />
              ) : (
                activeProduct.badge && (
                  <span
                    className="inline-flex items-center rounded-pill px-3 py-1 font-sans text-xs font-medium leading-none uppercase shadow-card"
                    style={resolvedBadge?.style}
                  >
                    {badgeLabel || activeProduct.badge}
                  </span>
                )
              )}
            </div>
          )}

          {/* Top Actions Layer — Minimal Pro Style */}
          {!onNavigate && (
          <div className={`absolute z-40 flex-col gap-2 lg:top-[11px] lg:right-[11px] lg:flex lg:opacity-0 lg:scale-90 lg:group-hover:opacity-100 lg:group-hover:scale-100 transition-[opacity,transform] duration-200 ${grid ? 'flex top-[10px] right-[10px]' : 'hidden top-2 right-2 sm:top-4'}`}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openQuickView(); }}
              aria-label={t('product.quickView', { name: activeProduct.name })}
              // Grid phones: primo1 `.qv-btn` — 25px white dot, soft shadow, 9px tap halo.
              className={`relative ${grid ? 'w-[25.3px] h-[25.3px] bg-[#fcfcfc] shadow-[0_1px_4px_rgba(0,0,0,0.16)] before:absolute before:-inset-[9px] before:content-[""]' : 'w-8 h-8 sm:w-10 sm:h-10 bg-white/80 backdrop-blur-md border border-black/5 shadow-sm'} lg:w-[25px] lg:h-[25px] rounded-full lg:bg-[#fcfcfc] lg:backdrop-blur-none lg:border-0 flex items-center justify-center lg:shadow-[0_1px_4px_rgba(0,0,0,0.16)] hover:bg-white lg:hover:bg-[#fcfcfc] hover:scale-105 active:scale-95 transition-all text-[#555]`}
            >
              <Eye className={`lg:w-[13px] lg:h-[13px] lg:text-current ${grid ? 'w-[13px] h-[13px] text-current' : 'w-4 h-4 text-[#1d1d1f]'}`} strokeWidth={grid ? 2 : undefined} />
            </button>
          </div>
          )}

          {/* Hover-zoom thumbnail: the product's own photo with a pre-scaled
              1.7× close-up as slide 2 (prototype `.ptrack`/`.pz`). The card
              shows exactly one real photo + its zoom duplicate; the full
              gallery/video stays in the quick-view modal (galleryForModal). */}
          {/* Primo1 `.pimg` is itself the product link: the photo sits ABOVE the
              stretched card link so desktop hover (close-up) and phone swipes
              reach the scroll track. Hidden from the tab order / screen
              readers — the card link already carries both. */}
          <Link
            to={`/product/${activeProduct.handle || activeProduct.id}`}
            tabIndex={-1}
            aria-hidden="true"
            draggable={false}
            className="absolute inset-0 z-[11] block"
          >
          <ZoomCarousel
            key={activeProduct.id}
            src={activeProduct.image || PRODUCT_PLACEHOLDER}
            alt={activeProduct.name}
            errorKey={activeProduct.id}
            multiply={product.multiply !== false}
            interaction="hover"
            imgFitClassName={`w-full h-full object-cover object-[50%_14%] ${compact ? '' : 'lg:absolute lg:left-[-8.9px] lg:top-[-3.8px] lg:w-[249.8px] lg:h-[249.8px] lg:max-w-none lg:object-fill'} contrast-[1.15] brightness-[1.08]`}
            zoomClassName="scale-[1.7] origin-[80%_45%]"
            slideAs="div"
            slideClassName="relative flex items-center justify-center"
            slide0Sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          />
          </Link>
        </div>

        {/* Content Section — Figma left-aligned card anatomy */}
        <div className={`${compact ? 'lg:!pt-[7px] lg:!pb-[9px] ' : ''}px-[13px] pt-[9px] pb-[11px] max-lg:@max-[230px]:px-[10px] max-lg:@max-[230px]:pt-[7px] max-lg:@max-[230px]:pb-[9px] lg:px-[17px] lg:pb-[13px] lg:pt-[7px] flex-grow flex flex-col items-start text-left`}>
          <div className="flex-grow w-full">
            {/* Primo1 desktop `.phead`: name + category share a 57px block so the price lines up across a row. */}
            <div className={compact ? 'lg:min-h-[50px]' : 'lg:min-h-[57px]'}>
            {/* Reserve 2 lines so 1-line vs 2-line product names don't make the
                price/swatch rows sit at different heights between cards
                in the same row. Title: Gotham Bold 18/mobile 22, near-black 90%. */}
            <h3 className={highlightQuery ? "text-[14px] leading-[18px] font-medium text-foreground line-clamp-2" : "text-[13.5px] leading-[17px] max-lg:@max-[230px]:text-[13px] max-lg:@max-[230px]:leading-4 lg:text-[16.5px] lg:leading-[20px] font-bold lg:font-semibold tracking-normal lg:tracking-[-0.15px] text-black lg:text-[#2e2e2e] line-clamp-1 lg:line-clamp-2"}>
              {(() => {
                // Primo1 desktop card: a shade number ("№112") gets its own line
                // above the name; phones keep it inline.
                if (highlightQuery) {
                  return highlightTokens(activeProduct.name, highlightQuery).map((seg, i) =>
                    seg.mark ? <mark key={i} className="bg-transparent text-inherit font-bold">{seg.text}</mark> : <React.Fragment key={i}>{seg.text}</React.Fragment>,
                  );
                }
                const m = activeProduct.name.match(/^(№\s*\d+)\s+(.+)$/);
                return m ? (
                  <>
                    <span className="lg:block lg:truncate">{m[1]}</span>{' '}
                    <span className="lg:block lg:truncate">{m[2]}</span>
                  </>
                ) : activeProduct.name;
              })()}
            </h3>
            {/* Category eyebrow — below the title to match the prototype order.
                Uppercase Gotham Bold, muted grey. */}
            <p className="mt-2 max-lg:@max-[230px]:mt-1.5 text-[9px] leading-[12px] tracking-normal text-[#6b6b6b] lg:mt-[2px] lg:text-[11px] lg:leading-[15px] lg:tracking-[0.35px] lg:text-[#8a8a8a] uppercase font-semibold line-clamp-1">
              {activeProduct.subtitle || activeProduct.category}
            </p>
            </div>
            {/* Price — red current + struck old (Price primitive) */}
            <Price
              size="sm"
              current={formatPrice(activeProduct.price, language)}
              original={activeProduct.originalPrice ? formatPrice(activeProduct.originalPrice, language) : undefined}
              className="mt-2.5 mb-[9px] max-lg:@max-[230px]:mt-[3px] max-lg:@max-[230px]:mb-[3px] lg:mt-[7px] lg:mb-0 lg:gap-[4.4px] [&>span:first-child]:font-extrabold [&>span:only-child]:text-black max-lg:[&>span:first-child]:text-[13.5px] max-lg:[&>span:first-child]:leading-[18px] max-lg:[&>span:first-child]:tracking-[0.04em] lg:[&>span]:tracking-[0.2px] lg:[&>span:first-child]:text-[15.5px] lg:[&>span:first-child]:leading-[19px]"
            />
          </div>

          <div className="relative z-20 mt-auto flex flex-row flex-wrap items-start justify-between w-full gap-[9px] max-lg:@max-[230px]:gap-1.5 lg:flex-col lg:flex-nowrap lg:justify-start lg:gap-[9px] lg:mt-[7px]">
            {/* Priority:
                 1. bundleChildren (Kit contents) → row of child swatches
                 2. shadeSiblings.length > 1 → row of same-colour siblings
                 3. activeProduct.swatchImage → single swatch
                 4. otherwise → empty spacer
               (capacity is rendered above as its own text line, not a pill here) */}
            {bundleChildren.length > 0 ? (
              <div className={shadeRowClass}>
                {bundleChildren.map((child, i) => (
                  <Link
                    key={child.id}
                    to={`/product/${child.handle || child.id}?from-kit=${activeProduct.handle}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={child.name}
                    title={child.name}
                    data-shade-index={i}
                    className={`w-6 h-6 ${phoneSwatchSize} lg:w-[26px] lg:h-[26px] shrink-0 rounded-full border border-swatch-border hover:scale-105 active:scale-95 bg-center bg-cover bg-no-repeat transition-all duration-200 ${hiddenOnPhone(i)}`}
                    style={
                      child.swatchImage
                        ? { backgroundImage: `url(${child.swatchImage})` }
                        : { backgroundColor: '#E0E0E0' }
                    }
                  />
                ))}
                {moreShadesChip}
              </div>
            ) : shadeSiblings.length > 1 ? (
              <SwatchGroup
                aria-label={t('a11y.chooseShade', { name: activeProduct.colorName ?? activeProduct.name })}
                className={shadeRowClass}
              >
                {shadeRowSiblings.map((sibling) => {
                  const i = shadeSiblings.indexOf(sibling);
                  const isSelected = sibling.id === activeProduct.id;
                  return (
                    <Swatch
                      key={sibling.id}
                      size="sm"
                      image={sibling.swatchImage}
                      color={sibling.swatchImage ? undefined : '#E0E0E0'}
                      selected={isSelected}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isSelected) {
                          setActiveProduct(sibling);
                        }
                      }}
                      aria-label={`${sibling.name}${isSelected ? ' — ' + t('a11y.selected') : ''}`}
                      data-shade-index={i}
                      className={`shrink-0 ${isSelected ? `max-lg:w-[33px] max-lg:h-[33px] max-lg:@max-[230px]:w-[26px] max-lg:@max-[230px]:h-[26px] lg:h-[30px] lg:w-[30px] lg:-m-0.5 shadow-[inset_0_0_0_2px_#fff]` : `${phoneSwatchSize} lg:h-[26px] lg:w-[26px]`} ${hiddenOnPhone(i)}`}
                    />
                  );
                })}
                {moreShadesChip}
              </SwatchGroup>
            ) : activeProduct.swatchImage ? (
              <div className="flex items-center justify-start w-full h-9 max-lg:@max-[230px]:h-[30px] lg:h-[30px] max-lg:w-auto max-lg:flex-1">
                <div
                  role="img"
                  aria-label={`${activeProduct.name} — ${t('a11y.shade')}`}
                  className={`w-7 h-7 ${phoneSwatchSize} lg:w-[26px] lg:h-[26px] rounded-full border border-swatch-border bg-center bg-cover bg-no-repeat shrink-0`}
                  style={{ backgroundImage: `url(${activeProduct.swatchImage})` }}
                />
              </div>
            ) : (
              <div className="h-9 max-lg:@max-[230px]:h-[30px] lg:h-[30px] w-full max-lg:w-auto max-lg:flex-1" />
            )}

            {/* Action Button — desktop: black uppercase full-width pill (Figma).
                Phones: Primo1's round "+" beside the shades; the label stays as
                screen-reader text so the button keeps its accessible name.
                Out of stock keeps a visible "esaurito" pill on phones too. */}
            <Button
              variant="primary"
              size="md"
              uppercase
              fullWidth
              disabled={activeProduct.inStock === false}
              onClick={(e) => { e.stopPropagation(); if (activeProduct.inStock !== false) handleAddToCart(); }}
              className={`text-[11px] lg:leading-[calc(1/0.75)] shrink-0 max-lg:shadow-none ${
                isOutOfStock
                  ? 'max-lg:basis-full max-lg:h-9 max-lg:px-3 max-lg:text-[10px] max-lg:tracking-[0.06em] max-lg:@max-[230px]:h-[30px] max-lg:@max-[230px]:px-2.5 max-lg:@max-[230px]:text-[9px]'
                  : 'max-lg:w-9 max-lg:h-9 max-lg:px-0 max-lg:@max-[230px]:w-[30px] max-lg:@max-[230px]:h-[30px]'
              } ${compact ? 'lg:!h-[28px] lg:!text-[12px]' : 'lg:h-[31.4px] lg:text-[15px]'} lg:font-medium lg:tracking-[0.4px] lg:whitespace-nowrap lg:shadow-none ${
                !isOutOfStock && isAdded ? 'max-lg:bg-[#1f7a3a] max-lg:border-[#1f7a3a]' : ''
              }`}
              leadingIcon={
                isOutOfStock ? undefined : isAdded ? (
                  <Check aria-hidden="true" className="w-4 h-4" />
                ) : (
                  <Plus aria-hidden="true" strokeWidth={2.5} className="w-[18px] h-[18px] @max-[230px]:w-[15px] @max-[230px]:h-[15px] lg:hidden" />
                )
              }
            >
              <span className={isOutOfStock ? undefined : 'max-lg:sr-only'}>
                {isOutOfStock
                  ? t('product.outOfStock').toUpperCase()
                  : isAdded
                    ? t('product.added').toUpperCase()
                    : t('product.addToCartCard').toUpperCase()}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick View Modal — faithful port of the prototype's quick-view
          (primo-redesign .qv*), bound to OUR product data + the card's existing
          shadeSiblings / bundleChildren / addToCart handlers. */}
      <QuickViewModal
        product={activeProduct}
        bundleChildren={bundleChildren}
        shadeSiblings={shadeSiblings}
        open={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        onAddToCart={handleAddToCart}
        isAdded={isAdded}
        onPickSibling={(sibling) => setActiveProduct(sibling)}
      />
    </>
  );
};
