import React, { useState, useId, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronDown, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Product } from '../data';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { deriveSizeGroup, deriveSeasonKits } from '../pages/ProductDetail';
import { useLanguage } from '../context/LanguageContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { formatPrice } from '../lib/formatPrice';
import { computeSalePercent } from '../lib/sale';
import { useScrollLock } from '../lib/scrollLock';
import { PRODUCT_PLACEHOLDER } from '../lib/imageFallback';
import { resolveBadge, BUILTIN_BADGES, type BadgeDef } from '../lib/badges';
import { useStoreSetting } from '../hooks/useStoreContent';
import { waLinkWithText, WHOLESALE_EMAIL, WHATSAPP_FALLBACK } from '../lib/whatsapp';
import { seasonGlowForKit } from './collections/seasonMeta';
import { Price } from './ui';
import { SalePill } from './ui/SalePill';
import { ZoomCarousel } from './ui/ZoomCarousel';
import { QtyStepper } from './ui/QtyStepper';

/**
 * Quick-view modal — a faithful port of the prototype's quick-view
 * (`primo-redesign/js/product.js` `PM.quickView` / `PM.renderProduct` +
 * `css/product.css` `.qv*`), bound to OUR backend product data.
 *
 * Prototype anatomy reproduced here:
 *  - `.qv` backdrop: `rgba(20,20,20,.55)`, mobile = bottom sheet anchored to
 *    the bottom edge (slides up, radius `26px 26px 0 0`); from `md` = a centred
 *    card (`max-w-[960px]`, radius 32px, fade+scale+rise entrance).
 *  - `.qv-head`: a round close button on the right. (The prototype's season
 *    tabs have NO backend equivalent in our model — see note below — so the
 *    head carries only the close control, matching the single-product variant
 *    of the prototype where the tab row is hidden.)
 *  - `.qv-scroll` → `.qv-body` two-column grid (`1fr 1fr` from md, single
 *    column on mobile) + the "view full details" link (`.qv-more`).
 *  - Left `.gallery`: square, light-grey, a 2-slide scroll-snap zoom carousel
 *    (slide 1 = photo, slide 2 = same photo pre-scaled 1.9× / origin 76% 52%),
 *    `object-cover`, with two REAL clickable dots + arrow-key nav — mirroring
 *    the card's gallery (both share `ui/ZoomCarousel`).
 *  - Right `.pinfo`: red % badge, title, red sale price (struck original),
 *    size/format pill, shades header ("Shades: <name>" + "N colours"), the
 *    swatch grid, the stepper + add-to-cart (inline row from md, sticky bar on
 *    mobile), the wholesale box, the shipping note, and the
 *    Description/Application/Ingredients accordions.
 *
 * Data binding (NO new fetch/cart/pricing — all handlers come from the card):
 *  - media/title/category/price ← `activeProduct` + `Price` primitive.
 *  - options selector (the prototype's "season kit" / shade region) ← KIT
 *    CHILDREN when the product is a bundle, else same-colour SHADE SIBLINGS,
 *    else the product's single own swatch. Picking a sibling calls
 *    `onPickSibling` so the parent swaps `activeProduct` (same mechanism the
 *    card uses) and the whole panel re-binds.
 *  - add-to-cart ← `onAddToCart(quantity)` (the card's shared CartContext path).
 *  - "view full details" ← `/product/<handle>`.
 */
export interface QuickViewModalProps {
  /** The currently-shown product (may be a swapped shade sibling). */
  product: Product;
  /** Kit children resolved by the card (bundleHandles → Product). */
  bundleChildren: Product[];
  /**
   * Same-colour shade siblings resolved by the card. Used only as a FALLBACK:
   * the card memoizes this on its ORIGINAL product, so after `onPickSibling`
   * swaps `activeProduct` it goes stale. The modal re-derives the live set from
   * `product` + the products context (see `shadeSiblings` below) and prefers
   * that whenever it can.
   */
  shadeSiblings: Product[];
  /** True while the modal should be mounted/visible. */
  open: boolean;
  /** Close request (✕ / backdrop / Escape). */
  onClose: () => void;
  /** Add-to-cart via the shared handler with the in-modal quantity. */
  onAddToCart: (qty: number) => void;
  /** "Added ✓" flash state owned by the card. */
  isAdded: boolean;
  /** Swap the active product to a picked shade sibling. */
  onPickSibling: (sibling: Product) => void;
}

const isKitProduct = (p: Product, children: Product[]) => children.length > 0 && !!p.bundleHandles?.length;

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  bundleChildren,
  shadeSiblings: shadeSiblingsProp,
  open,
  onClose,
  onAddToCart,
  isAdded,
  onPickSibling,
}) => {
  const { t, language } = useLanguage();
  const { products } = useProducts();
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  // Kits (Primo1 quick view): picking a shade keeps the pop-up open and shows
  // that shade (photo, price, size, info, add to cart); "ALL" returns to the
  // full set. Reset whenever the pop-up moves to another product (season tab).
  const [kitShade, setKitShade] = useState<Product | null>(null);
  const [shadeAdded, setShadeAdded] = useState(false);
  useEffect(() => { setKitShade(null); setShadeAdded(false); }, [product.id]);
  useEffect(() => {
    if (!shadeAdded) return;
    const id = setTimeout(() => setShadeAdded(false), 2000);
    return () => clearTimeout(id);
  }, [shadeAdded]);
  // The flash belongs to the shade it was added from.
  useEffect(() => { setShadeAdded(false); }, [kitShade?.id]);
  const view = kitShade ?? product;
  // Primo1: with the whole set selected the size pill reads "9 × 12 ml"
  // (shade count × one shade's size).
  const kitShadeSize = bundleChildren.find((c) => c.capacity)?.capacity;
  const capacityLabel =
    isKitProduct(product, bundleChildren) && !kitShade && kitShadeSize
      ? `${bundleChildren.length} × ${kitShadeSize.replace(/(\d)\s*(ml|g)\b/i, '$1 $2')}`
      : view.capacity;

  // Size-chip group (prototype `.p-sizes`) + season-tab switcher (prototype
  // `.qv-tabs`), both derived from the catalogue (NOT passed as props, since
  // the card that mounts this modal is out of scope). Empty unless the active
  // product is a ≥2-size family / one of the four seasonal kits respectively.
  const sizeGroup = useMemo(() => deriveSizeGroup(product, products), [product, products]);
  const seasonTabs = useMemo(() => deriveSeasonKits(product, products), [product, products]);
  // Season switcher: one element, rendered in the header from md and in the
  // phone bottom bar (above Add to cart) below md.
  const seasonTablist =
    seasonTabs.length > 0 ? (
    <div
          role="tablist"
          aria-label={t('search.collection.seasons.name')}
          className="flex w-full min-w-0 flex-1 items-center justify-between rounded-[21.2px] bg-[#f2f2f2] p-[5.5px] md:w-[411px] md:grid md:grid-cols-4 md:col-start-2 md:col-end-3 md:h-[42.4px] md:w-[411px] md:justify-self-center md:gap-[4.27px] md:p-[5.7px_6.3px]"
        >
          {seasonTabs.map(({ product: kit, labelKey }) => {
            const isActive = kit.id === product.id;
            // Each season button glows in its own season colour.
            const glow = seasonGlowForKit(kit.handle);
            return (
              <button
                key={kit.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-glow={glow}
                style={glow ? ({ '--glow': glow } as React.CSSProperties) : undefined}
                onClick={() => {
                  if (!isActive) onPickSibling(kit);
                }}
                className={`relative z-[1] h-[31px] flex-none whitespace-nowrap rounded-[15.5px] px-2.5 md:px-2 text-[13px] max-[350px]:px-1.5 max-[350px]:text-[12px] max-[330px]:px-1 max-[330px]:text-[11.5px] font-semibold leading-none tracking-[-0.17px] transition-[color,box-shadow] duration-200 ${
                  isActive
                    ? 'bg-black text-white shadow-[0_3px_12px_-2px_color-mix(in_srgb,var(--glow,#000)_60%,transparent)]'
                    : 'bg-transparent text-black hover:text-black/70'
                }`}
              >
                {t(labelKey as any)}
              </button>
            );
          })}
        </div>
    ) : null;
  // Same-colour SHADE SIBLINGS — derived LIVE from the ACTIVE `product` (the
  // card swaps it via `onPickSibling`) + the catalogue, the same way
  // `sizeGroup`/`seasonTabs` are. The `shadeSiblings` prop is frozen on the
  // card's ORIGINAL product and goes stale after a size/season pick (B5), so it
  // is only a fallback (e.g. when the products context isn't populated). Mirrors
  // the card/PDP 'Sfumature' filter: same category + sub-category + colour name,
  // and the same effect *presence* (boolean, not same-specific-effect).
  const shadeSiblings = useMemo(() => {
    if (!product.hasShade || !product.colorName) return shadeSiblingsProp;
    const derived = products.filter(
      (p) =>
        p.hasShade &&
        p.colorName === product.colorName &&
        p.category === product.category &&
        (p.subCategory || null) === (product.subCategory || null) &&
        Boolean(p.effect) === Boolean(product.effect)
    );
    // Prefer the derived set; fall back to the prop only when derivation yields
    // nothing (no catalogue loaded) so the prop can never silently override the
    // live family.
    return derived.length > 0 ? derived : shadeSiblingsProp;
  }, [product, products, shadeSiblingsProp]);
  // Prototype (`js/product.js`): the accordions are plain <details> with no
  // `open` attribute, so all start CLOSED (m39). One-open-at-a-time while using.
  const [openAcc, setOpenAcc] = useState<number | null>(null);
  // `.qv-head.scrolled` — the head grows a bottom border once the body scrolls (m45).
  const [scrolled, setScrolled] = useState(false);
  // Desktop entrance = fade + rise + scale (`qvin`); mobile = bottom-sheet
  // slide-up (`qvup`). Resolved once per open since the modal mounts fresh (m44).
  const [isDesktop, setIsDesktop] = useState(false);
  // Live `md` breakpoint: decides where the season tabs and the close button
  // render (header from md; phone bottom bar + floating close below md).
  const [isMd, setIsMd] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 768px)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsMd(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);
  const titleId = useId();
  const dialogRef = useFocusTrap<HTMLDivElement>({ active: open, onEscape: onClose });

  // Reset quantity + accordions + head border each time the modal opens, and
  // resolve the desktop/mobile entrance variant.
  useEffect(() => {
    if (open) {
      setQuantity(1);
      setOpenAcc(null);
      setScrolled(false);
      setIsDesktop(
        typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(min-width: 768px)').matches
      );
    }
  }, [open]);

  useScrollLock(open);

  const badgeDefs = useStoreSetting<BadgeDef[]>('badges', BUILTIN_BADGES);
  const resolvedBadge = resolveBadge(product.badge, product.isPromoted, badgeDefs, language);

  const wholesaleWhatsappBase = useStoreSetting<string>('course_whatsapp_url', '');
  const wholesaleWhatsappHref = waLinkWithText(wholesaleWhatsappBase) || WHATSAPP_FALLBACK;

  // Discount % for the red pill (prototype `.p-badge`): prefer a real price
  // delta, fall back to the configured badge label. `computeSalePercent`
  // returns null unless there is a genuine positive discount, so a malformed /
  // equal / lower original no longer renders a bogus "0%"/"-5%" pill (B6).
  const salePercent = computeSalePercent(product.price, product.originalPrice);

  // The prototype's "Sfumature: <name>" line. Kit → "set completo" equivalent
  // (the available-colours label); shade → the colour name; else the product name.
  const isKit = bundleChildren.length > 0;
  const hasSiblings = shadeSiblings.length > 1;
  const shadeCount = isKit ? bundleChildren.length + 1 : hasSiblings ? shadeSiblings.length : 0;
  // Prototype shade-name line: a kit defaults to "set completo" (the leading
  // ALL chip is selected); a shade shows the colour name.
  const shadeName = isKit
    ? kitShade ? kitShade.name.replace(/^(?:№|N[º°])\s*/, '') : product.name
    : hasSiblings
      ? product.colorName || product.name
      : product.colorName || product.name;

  // Accordions — Description / Application / Ingredients (prototype `accOf`).
  // The prototype heading is the bare "Descrizione" (not "Descrizione
  // Prodotto"), so bind the first to the existing `product.description` key (m39).
  const accordions: Array<[string, string]> = (
    [
      [t('product.description'), view.description],
      [t('pdp.section.application'), view.application],
      [t('pdp.section.ingredients'), view.ingredients],
    ] as Array<[string, string | undefined]>
  ).filter((entry): entry is [string, string] => Boolean(entry[1]));

  const imageSrc = view.image || PRODUCT_PLACEHOLDER;
  const multiply = view.multiply !== false;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          // `.qv`: fixed, dim backdrop; bottom-sheet on mobile, centred from md.
          className="fixed inset-0 z-[100] flex items-end justify-center bg-[rgba(20,20,20,0.55)] md:items-center md:p-6"
        >
          {/* Backdrop click target */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            onClick={onClose}
          />

          {/* `.qv-modal` */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            // Desktop (`qvin`): fade + rise 24px + scale .97 → not a slide-in.
            // Mobile (`qvup`): the bottom sheet slides up from 100%.
            initial={isDesktop ? { opacity: 0, y: 24, scale: 0.97 } : { opacity: 0, y: '100%', scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={isDesktop ? { opacity: 0, y: 16, scale: 0.98 } : { opacity: 0, y: '100%' }}
            transition={
              isDesktop
                ? { duration: 0.34, ease: [0.22, 0.61, 0.36, 1] }
                : { type: 'spring', stiffness: 340, damping: 34 }
            }
            // mobile sheet: full-width, top-rounded, slides up; md: centred card.
            // Height is STABLE (fixed to the viewport-tied value, not just a
            // max) so opening/closing an accordion never resizes the outer box —
            // the overflow scrolls inside `.qv-scroll` instead of growing the
            // modal. Mobile = `h-[92dvh]`. From md, kits (season tabs + shade
            // row, the tallest content) keep `min(90dvh,820px)`; single
            // products get 760px (md) / 720px (lg): at 820px they left a
            // ~150px empty band under "Go to product page" (halved, Sir 2026-11-14).
            className={`relative flex h-[92dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[26px] bg-white outline-none ${isKit ? 'md:h-[min(90dvh,820px)]' : 'md:h-[min(90dvh,760px)] lg:h-[min(90dvh,720px)]'} md:w-[min(960px,100%)] md:max-w-none md:rounded-[32px] lg:rounded-[40px]`}
          >
            {/* `.qv-head` — the prototype's `.qv-tabs` season-switcher pill row
                (centred) + close button. The tabs show ONLY when the active
                product is one of the four seasonal kits (real
                `kit-*-collection` bundles); picking another season swaps the
                active product in place (same `onPickSibling` path a shade uses),
                so the whole panel re-binds. Non-kit products get just the close
                control — matching the prototype's single-product head. Grows a
                bottom border once the body scrolls (`.scrolled`, m45). */}
            {isMd ? (
              <div
                className={`flex-none flex items-center gap-2 border-b px-3 py-3 transition-colors duration-200 md:grid md:grid-cols-[44px_1fr_44px] md:px-6 md:pt-6 md:pb-4 ${
                  scrolled ? 'border-[#f0f0f2]' : 'border-transparent'
                } ${seasonTabs.length > 0 ? '' : 'justify-end md:justify-items-end'}`}
              >
                {seasonTablist}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t('search.close')}
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white text-foreground shadow-[0_0_0_1px_#ececec] transition-[transform,background-color] duration-200 hover:bg-[#f3f3f3] hover:rotate-90 md:col-start-3"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            ) : (
              /* Phones: no header strip. The close button floats over the photo and
                 stays pinned while the sheet scrolls. */
              <button
                type="button"
                onClick={onClose}
                aria-label={t('search.close')}
                className="absolute right-3 top-3 z-[5] flex h-9 w-9 items-center justify-center rounded-full bg-white text-foreground shadow-[0_0_0_1px_#ececec,0_2px_8px_rgba(0,0,0,0.12)] transition-transform duration-200 active:scale-95"
              >
                <X className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            )}

            {/* `.qv-scroll` — only this scrolls; the photo stays put on desktop. */}
            <div
              onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
              className="flex-1 min-h-0 overflow-auto overscroll-contain pb-5 md:px-8 md:pt-2 md:pb-7 lg:px-12 lg:pb-8"
            >
              {/* `.qv-body` — two-column grid from md. */}
              <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-10">
                {/* `.gallery` — square, light bg, 2-slide scroll-snap zoom
                    carousel with two REAL dots (M15). */}
                <div className="relative h-[clamp(280px,92vw,400px)] overflow-hidden bg-[#fefefe] md:sticky md:top-0 md:h-auto md:aspect-square md:rounded-3xl">
                  <ZoomCarousel
                    src={imageSrc}
                    alt={product.name}
                    errorKey={`${view.id}-qv`}
                    multiply={multiply}
                    interaction="dots"
                    imgFitClassName="w-full h-full object-cover"
                    zoomClassName="scale-[1.9] origin-[76%_52%]"
                    slideAs="figure"
                    slideClassName="m-0"
                    draggableImages
                    trackClassName="h-full outline-none"
                  />
                </div>

                {/* `.pinfo` */}
                <div className="flex flex-col items-start px-5 pt-[18px] md:px-0 md:pt-1">
                  {/* `.p-badge` — red % off pill (or the configured badge). */}
                  {salePercent != null ? (
                    <SalePill
                      variant="modal"
                      current={product.price}
                      original={product.originalPrice}
                      className="mb-3.5 max-md:order-2 max-md:mb-3"
                    />
                  ) : (
                    resolvedBadge && (
                      <span
                        className="mb-3.5 max-md:order-2 inline-flex w-fit items-center rounded-pill px-3 py-1 text-[11px] font-bold uppercase leading-none tracking-widest"
                        style={resolvedBadge.style}
                      >
                        {resolvedBadge.label}
                      </span>
                    )
                  )}

                  {/* `.p-title` — with the single size pill ("3 × 12 ml") on the
                      same row, right-aligned and centred on the title's first
                      line, so the price block below no longer needs its own row. */}
                  <div className="flex w-full items-start justify-between gap-3 max-md:order-3">
                    <h2
                      id={titleId}
                      className="m-0 min-w-0 text-[24px] font-bold leading-[30px] tracking-normal md:tracking-[0.15px] text-[#1e1e1e] md:text-[26px] md:leading-8 lg:text-[28px] lg:leading-[34px]"
                    >
                      {product.name}
                    </h2>
                    {isMd && sizeGroup.length < 2 && capacityLabel && (
                      <span className="mt-[1.5px] grid h-[25px] min-w-[56px] flex-none place-items-center whitespace-nowrap rounded-[13px] border-[1.5px] border-[#7f7f7f] px-2.5 text-[13px] font-medium leading-none text-[#1e1e1e] md:mt-[3.5px] lg:mt-[4.5px]">
                        {capacityLabel}
                      </span>
                    )}
                  </div>

                  {/* `.p-sizes` (chooser) — when the
                      product is sold in ≥2 sizes (same name + category, e.g.
                      Cleaner Emotion 100 ml / 1000 ml) show one selectable chip
                      per size; picking one swaps the active product in place
                      (`onPickSibling`) so the price re-binds, mirroring the
                      prototype. The single pill sits in the title row. */}
                  {sizeGroup.length >= 2 ? (
                    <div
                      role="group"
                      aria-label={t('product.format')}
                      className="mt-3 flex flex-wrap gap-2 max-md:order-4"
                    >
                      {sizeGroup.map((sku) => {
                        const isActive = sku.id === product.id;
                        return (
                          <button
                            key={sku.id}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => !isActive && onPickSibling(sku)}
                            className={`grid h-[25px] min-w-[56px] place-items-center whitespace-nowrap rounded-[13px] border-[1.5px] px-2.5 text-[13px] font-medium leading-none transition-colors duration-200 ${
                              isActive
                                ? 'border-black bg-black text-white'
                                : 'border-[#7f7f7f] bg-transparent text-[#1e1e1e] hover:border-black'
                            }`}
                          >
                            {sku.capacity}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* `.p-shades-h` + `.p-grid` — the options selector region.
                      Prototype binds its season-kit shades here; we bind kit
                      children, else shade siblings, else the single own swatch. */}
                  {(isKit || hasSiblings || product.swatchImage) && (
                    <>
                      {shadeCount > 0 && (
                        <div className="flex w-full items-center justify-between gap-3 text-[15px] leading-[19px] tracking-[-0.13px] max-md:order-1 md:mt-5 md:h-[34px] md:items-start md:border-b md:border-[#f2f2f4] md:text-[14px]">
                          <b className="min-w-0 truncate font-bold text-[#1e1e1e]">
                            {t('product.shades')}: <span className="font-bold">{shadeName}</span>
                          </b>
                          <span className="flex-none text-[14px] font-normal text-[#a0a0a0] md:text-[13px]">
                            <em className="not-italic text-[#5a5a5a]">{shadeCount}</em> {t('collections.colors')}
                          </span>
                        </div>
                      )}
                      <div
                        role="group"
                        aria-label={t('product.availableColors')}
                        className="no-scrollbar -mx-5 mb-[18px] mt-2 flex w-[calc(100%+40px)] gap-2.5 overflow-x-auto overflow-y-hidden border-b border-[#f0f0f2] px-5 pb-4 pt-1.5 max-md:order-1 md:mx-0 md:mb-0 md:mt-3.5 md:grid md:w-full md:grid-cols-[repeat(5,minmax(0,52px))] md:justify-start md:gap-3 md:overflow-visible md:border-0 md:p-0 max-md:[&>*]:h-12! max-md:[&>*]:w-12! max-md:[&>*]:flex-none"
                      >
                        {isKit
                          ? [
                              // Leading "ALL" / set-completo chip (prototype
                              // `.psw.all`, default-selected) before the shade
                              // circles (m41). The kit itself is the full set;
                              // it is the active selection until a shade is
                              // picked (which navigates to that shade's page).
                              <button
                                type="button"
                                key="__all__"
                                onClick={() => setKitShade(null)}
                                aria-label={t('collections.fullCollection')}
                                aria-pressed={!kitShade}
                                title={t('collections.fullCollection')}
                                className={`grid aspect-square w-full place-items-center rounded-full bg-black text-[9px] font-black uppercase leading-none tracking-widest text-white transition-transform duration-200 hover:scale-105 active:scale-95 ${kitShade ? '' : 'shadow-[0_0_0_2.5px_#fff,0_0_0_5px_#000]'}`}
                              >
                                {t('product.kitBadge')}
                              </button>,
                              ...bundleChildren.map((child) => (
                              <button
                                type="button"
                                key={child.id}
                                onClick={() => setKitShade(child)}
                                aria-pressed={kitShade?.id === child.id}
                                aria-label={child.name}
                                title={child.name}
                                className={`aspect-square w-full rounded-full bg-cover bg-center bg-no-repeat transition-transform duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 ${kitShade?.id === child.id ? 'shadow-[0_0_0_2.5px_#fff,0_0_0_5px_#000]' : 'border border-swatch-border'}`}
                                style={
                                  child.swatchImage
                                    ? { backgroundImage: `url(${child.swatchImage})` }
                                    : { backgroundColor: '#E0E0E0' }
                                }
                              />
                              )),
                            ]
                          : hasSiblings
                            ? shadeSiblings.map((sibling) => {
                                const selected = sibling.id === product.id;
                                return (
                                  <button
                                    key={sibling.id}
                                    type="button"
                                    onClick={() => !selected && onPickSibling(sibling)}
                                    aria-pressed={selected}
                                    aria-label={`${sibling.name}${selected ? ' — ' + t('a11y.selected') : ''}`}
                                    title={sibling.name}
                                    className={`aspect-square w-full rounded-full bg-cover bg-center bg-no-repeat transition-transform duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 ${
                                      selected
                                        ? 'shadow-[0_0_0_2.5px_#fff,0_0_0_5px_#000]'
                                        : 'border border-swatch-border'
                                    }`}
                                    style={
                                      sibling.swatchImage
                                        ? { backgroundImage: `url(${sibling.swatchImage})` }
                                        : { backgroundColor: '#E0E0E0' }
                                    }
                                  />
                                );
                              })
                            : (
                                <div
                                  role="img"
                                  aria-label={`${product.name} — ${t('a11y.shade')}`}
                                  className="aspect-square w-full rounded-full border border-swatch-border bg-cover bg-center bg-no-repeat"
                                  style={{ backgroundImage: `url(${product.swatchImage})` }}
                                />
                              )}
                      </div>
                    </>
                  )}

                  {/* `.p-price` — red current + struck original (Price primitive). Sits
                      under the shades, right above the buy row (Sir, 2026-11-14). */}
                  <div className="mt-4 flex w-full items-center justify-between gap-3 max-md:order-4 max-md:mt-2.5 md:mt-5">
                  <Price
                    size="lg"
                    current={formatPrice(view.price, language)}
                    original={view.originalPrice ? formatPrice(view.originalPrice, language) : undefined}
                    className="gap-3 [&>span]:font-extrabold [&>span:only-child]:text-black [&>span]:text-[22px] [&>span:first-child]:text-[22px] [&>span]:leading-7 [&>span:first-child]:leading-7 [&>span]:tracking-[0.4px] [&>span:first-child]:tracking-[0.4px] md:[&>span]:text-[21px] md:[&>span:first-child]:text-[21px] md:[&>span]:leading-6 md:[&>span:first-child]:leading-6 md:[&>span:first-child]:tracking-[1.6px] md:[&>span]:tracking-[1.6px]"
                  />
                    {!isMd && sizeGroup.length < 2 && capacityLabel && (
                      <span className="grid h-[30px] min-w-[64px] flex-none place-items-center whitespace-nowrap rounded-[15px] border border-[#7f7f7f] px-[14px] text-[14px] font-medium leading-none text-black">
                        {capacityLabel}
                      </span>
                    )}
                  </div>

                  {/* (M14) No TPO/HEMA trust pills — the prototype quick-view has
                      none; the claim lives only in the description. */}

                  {/* `.p-buy` — stepper + add-to-cart. Sticky bottom bar on
                      mobile; inline static row from md (prototype `.p-buy.d-only`). */}
                  <div className="sticky bottom-0 z-[2] -mx-5 mt-4 max-md:order-7 max-md:mt-5 flex w-[calc(100%+40px)] flex-col items-stretch gap-2.5 self-stretch bg-white px-5 py-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.14)] md:static md:mx-0 md:mt-6 md:w-full md:flex-row md:items-center md:gap-2 md:px-0 md:py-0 md:shadow-none">
                    {!isMd && seasonTablist}
                    <div className="flex items-center gap-3 md:contents">
                    {/* `.stepper` */}
                    <QtyStepper
                      value={quantity}
                      onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
                      onIncrement={() => setQuantity((q) => Math.min(99, q + 1))}
                      decrementLabel={t('cart.decreaseQty')}
                      incrementLabel={t('cart.increaseQty')}
                      decrementDisabled={quantity <= 1}
                      glyph="circle"
                      glyphStrokeWidth={1.5}
                      glyphClassName="h-9 w-9"
                      className="flex items-center"
                      role="group"
                      aria-label={t('product.quantity')}
                      buttonClassName="grid h-11 w-11 place-items-center text-[#222] disabled:opacity-40 disabled:cursor-default"
                      readoutAs="output"
                      readoutClassName="w-[22px] text-center text-[20px] font-medium leading-6"
                    />
                    {/* `.buy` */}
                    <button
                      type="button"
                      disabled={view.inStock === false}
                      onClick={() => {
                        if (view.inStock === false) return;
                        // A picked kit shade is added on its own; the set goes
                        // through the card's shared handler.
                        if (kitShade) { addToCart(kitShade, quantity); setShadeAdded(true); }
                        else onAddToCart(quantity);
                      }}
                      className={`flex h-12 flex-1 items-center justify-center rounded-pill text-[15px] font-semibold tracking-[0.2px] text-white transition-[transform,background-color] duration-200 active:scale-[0.98] disabled:opacity-50 md:ml-2 ${
                        (kitShade ? shadeAdded : isAdded) ? 'bg-[#1f7a3a]' : 'bg-black hover:bg-black/90'
                      }`}
                    >
                      {view.inStock === false
                        ? t('product.outOfStock')
                        : (kitShade ? shadeAdded : isAdded)
                          ? t('product.added')
                          : t('pdp.addToCart' as any)}
                    </button>
                    </div>
                  </div>

                  {/* `.wholesale` box — WhatsApp + email enquiry, mirroring the
                      PDP and prototype. */}
                  <div className="mt-6 max-md:order-5 max-md:min-h-[66px] max-md:gap-[13px] max-md:py-2 max-md:pl-[18px] max-md:pr-2 md:mt-5 flex min-h-[64px] w-full items-center gap-3.5 self-stretch rounded-2xl border-[1.5px] border-[#999] px-3.5 py-3">
                    <span
                      aria-hidden="true"
                      className="grid h-[38px] w-[38px] md:h-[34px] md:w-[34px] flex-none place-items-center rounded-full border-[1.5px] border-[#222] text-[#222]"
                    >
                      <MessageSquare className="h-4 w-4" strokeWidth={1.6} />
                    </span>
                    <span className="flex min-w-0 flex-col gap-1.5 leading-tight md:gap-1">
                      <b className="text-[15px] font-bold leading-[17px] tracking-[0.2px] text-[#111] md:text-[14px]">
                        {t('pdp.wholesale.title')}
                      </b>
                      <span className="text-[14px] leading-4 text-[#1d1a52] md:text-[13px]">
                        {t('pdp.wholesale.text')}{' '}
                        <a
                          href={wholesaleWhatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="whitespace-nowrap font-bold underline underline-offset-2"
                        >
                          {t('pdp.wholesale.whatsapp')}
                        </a>{' '}
                        {t('pdp.wholesale.or')}{' '}
                        <a
                          href={`mailto:${WHOLESALE_EMAIL}?subject=${encodeURIComponent(t('pdp.wholesale.subject'))}`}
                          className="whitespace-nowrap font-bold underline underline-offset-2"
                        >
                          {t('pdp.wholesale.email')}
                        </a>
                      </span>
                    </span>
                  </div>

                  {/* `.ship-note` */}
                  <p className="mt-3 max-md:order-6 max-md:mt-[15px] max-md:text-center w-full self-stretch text-left text-[12.5px] md:text-[12px] leading-4 tracking-[0.3px] text-[#a9a9a9]">
                    {t('product.shippingNote')}{' '}
                    <Link
                      to="/spedizioni"
                      onClick={onClose}
                      className="whitespace-nowrap text-[#6b6b6b] underline underline-offset-2"
                    >
                      {t('product.shippingRatesLink')}
                    </Link>
                  </p>

                  {/* `.p-acc` — one-open-at-a-time accordions. */}
                  {accordions.length > 0 && (
                    <div className="mt-4 w-full self-stretch max-md:order-8">
                      {accordions.map(([heading, body], i) => {
                        const isOpen = openAcc === i;
                        return (
                          <div
                            key={heading + i}
                            className="border-t border-[#f0f0f2] mt-1 first:mt-0 transition-colors"
                          >
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              onClick={() => setOpenAcc(isOpen ? null : i)}
                              className="flex h-[54px] w-full items-center justify-between pr-2 text-[15px] font-normal text-[#555] md:h-[50px] md:text-[14px]"
                            >
                              <span>{heading}</span>
                              <ChevronDown
                                className={`h-[18px] w-[18px] stroke-[#222] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                strokeWidth={2}
                              />
                            </button>
                            {isOpen && (
                              <p className="mb-[18px] whitespace-pre-line text-[14px] leading-[21px] text-[#555] md:text-[13.5px]">
                                {body}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* `.qv-more` — view full product. */}
              <div className="mt-5 flex justify-center md:mt-6">
                <Link
                  to={kitShade ? `/product/${kitShade.handle || kitShade.id}?from-kit=${product.handle}` : `/product/${product.handle || product.id}`}
                  onClick={onClose}
                  className="w-fit text-[13px] font-semibold underline underline-offset-[3px] transition-colors hover:text-[#555]"
                >
                  {t('product.viewFullDetails')}
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
