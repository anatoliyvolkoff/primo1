import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useContent } from '../../context/ContentContext';
import { useLanguage } from '../../context/LanguageContext';
import { useStoreContent } from '../../hooks/useStoreContent';

/** A slide's resolved per-slide content (null when the admin left it blank). */
type Slide = {
  image: string;
  alt: string | null;
  link: string | null;
  title: string | null;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaLink: string | null;
  cta2Label: string | null;
  cta2Link: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
};

/**
 * Renders a slide's media: a muted autoplay-loop video when `video_url` is
 * set, otherwise the image exactly as before. The video only plays while its
 * slide is active AND the hero is on screen, and never under
 * prefers-reduced-motion (the poster still is shown instead). Geometry is
 * identical to the image path so the hero layout is unchanged.
 */
const SlideMedia: React.FC<{ slide: Slide; index: number; active: boolean; objectFit: 'cover' | 'contain' }> = ({ slide, index, active, objectFit }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  // When the video fails to load (404, unsupported codec, decode error) we
  // swap to the still image so the hero never degrades to a black box.
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduceMotion) {
      video.pause();
      return;
    }

    // Pause when the slide isn't active or the hero scrolls off screen; play
    // only when both this slide is active and the hero is at least partly
    // visible. Keeps a single video playing at a time.
    let visible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (active && visible) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.1 }
    );
    observer.observe(video);

    if (active && visible) void video.play().catch(() => {});
    else video.pause();

    return () => observer.disconnect();
  }, [active]);

  // Shared still image — used as the standalone image slide, as the native
  // <video> fallback child, and as the swap target when the video errors.
  const stillImage = (
    <img
      src={slide.image}
      alt={slide.alt || `PriMo Nails Hero Banner ${index + 1}`}
      referrerPolicy="no-referrer"
      loading={index === 0 ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={index === 0 ? 'high' : 'auto'}
      sizes="100vw"
      className="w-full h-full"
      style={{ objectFit }}
    />
  );

  // A video slide that has already errored degrades to the still image.
  if (slide.videoUrl && !videoFailed) {
    return (
      <video
        ref={videoRef}
        src={slide.videoUrl}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        // Prefer an explicit poster, else fall back to the still image so the
        // first frame / blocked-autoplay state shows the image, not black.
        poster={slide.posterUrl ?? slide.image ?? undefined}
        onError={() => setVideoFailed(true)}
        aria-hidden="true"
        className="w-full h-full"
        style={{ objectFit }}
      >
        {/* Native fallback for browsers that can't load/decode the source. */}
        {stillImage}
      </video>
    );
  }

  return stillImage;
};

export const Hero = () => {
  const { content } = useContent();
  const { t } = useLanguage();
  const { data: storeContent } = useStoreContent();
  const [currentSlide, setCurrentSlide] = useState(0);
  // Distinguishes a swipe from a tap so a drag doesn't fire the slide link.
  const draggedRef = useRef(false);
  // Prefer Medusa-managed hero slides; fall back to the legacy
  // content.json values so the homepage renders before the first
  // fetch resolves. Keep alt + link + per-slide copy/video per slide
  // (legacy images have none — those fields stay null and the storefront
  // falls back to its default copy below).
  const remoteSlides = storeContent?.heroSlides;
  const slides: Slide[] = remoteSlides && remoteSlides.length > 0
    ? remoteSlides.map(s => ({
        image: s.image_url,
        alt: s.alt ?? null,
        link: s.link ?? null,
        title: s.title ?? null,
        subtitle: s.subtitle ?? null,
        ctaLabel: s.cta_label ?? null,
        ctaLink: s.cta_link ?? null,
        cta2Label: s.cta2_label ?? null,
        cta2Link: s.cta2_link ?? null,
        videoUrl: s.video_url ?? null,
        posterUrl: s.poster_url ?? null,
      }))
    : (content.hero.images as string[]).map(image => ({
        image,
        alt: null,
        link: null,
        title: null,
        subtitle: null,
        ctaLabel: null,
        ctaLink: null,
        cta2Label: null,
        cta2Link: null,
        videoUrl: null,
        posterUrl: null,
      }));
  const active = slides[currentSlide] ?? slides[0];

  // Per-slide copy with graceful fallback to the existing default hero copy.
  // When the admin leaves a field blank the slide shows exactly what it shows
  // today, so legacy image-only slides are unchanged.
  const headline = active.title || t('hero.title');
  const subtitle = active.subtitle || t('hero.subtitle');
  // A CTA renders only when BOTH its label and link are present; otherwise the
  // default button (current behavior) is used.
  const primaryLabel = (active.ctaLabel && active.ctaLink) ? active.ctaLabel : t('hero.cta');
  // Defaults follow Primo1: the buttons scroll to the best-seller block and
  // the founder section on this page.
  const primaryLink = (active.ctaLabel && active.ctaLink) ? active.ctaLink : '#bestsellers';
  const secondaryLabel = (active.cta2Label && active.cta2Link) ? active.cta2Label : t('hero.secondaryCta');
  const secondaryLink = (active.cta2Label && active.cta2Link) ? active.cta2Link : '#founder';

  const paginate = (direction: number) => {
    setCurrentSlide(prev => (prev + direction + slides.length) % slides.length);
  };

  useEffect(() => {
    const timer = setInterval(() => paginate(1), 6500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;
  const swipeThreshold = 10000;

  // Renders either an internal <Link>, an external <a>, or the bare node when
  // there's no link — shared by the clickable slide wrapper and the buttons.
  const renderCtaButton = (label: string, to: string, className: string) =>
    to.startsWith('#')
      ? (
        <a
          href={to}
          className={className}
          onClick={(e) => {
            const el = document.getElementById(to.slice(1));
            if (!el) return;
            e.preventDefault();
            const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
            // Move keyboard focus with the scroll, like a native anchor jump.
            if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
            el.focus({ preventScroll: true });
          }}
        >
          {label}
        </a>
      )
      : /^https?:\/\//i.test(to)
        ? <a href={to} target="_blank" rel="noopener noreferrer" className={className}>{label}</a>
        : <Link to={to} className={className}>{label}</Link>;

  return (
    <section
      className="relative mt-[61px] lg:mt-[95px] flex items-center justify-center overflow-hidden pb-0 lg:pb-0 lg:!pt-0 touch-pan-y rounded-none lg:mx-0 bg-[#b9b9b9] lg:bg-[#8b8c8c] max-lg:!min-h-[clamp(520px,146.6vw,660px)] lg:h-[600px] lg:!min-h-0 lg:items-stretch lg:justify-start"
      style={{
        minHeight: `${content.hero.layout.imageHeight}vh`,
        paddingTop: `clamp(60px, 10vw, ${content.hero.layout.paddingTop}px)`,
      }}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragStart={() => { draggedRef.current = true; }}
          onDragEnd={(_, { offset, velocity }) => {
            const swipe = swipePower(offset.x, velocity.x);
            if (swipe < -swipeThreshold) paginate(1);
            else if (swipe > swipeThreshold) paginate(-1);
            // Reset after the click that follows a drag would have fired.
            setTimeout(() => { draggedRef.current = false; }, 50);
          }}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        >
          {(() => {
            const media = <SlideMedia slide={active} index={currentSlide} active objectFit={content.hero.layout.imageObjectFit} />;
            if (!active.link) return media;
            // Suppress navigation when the "click" is really the tail of a swipe.
            const onClick = (e: React.MouseEvent) => { if (draggedRef.current) e.preventDefault(); };
            return /^https?:\/\//i.test(active.link)
              ? <a href={active.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full" onClick={onClick}>{media}</a>
              : <Link to={active.link} className="block w-full h-full" onClick={onClick}>{media}</Link>;
          })()}
        </motion.div>
      </AnimatePresence>

      {/* Phones: Primo1's bottom-weighted gradient; desktop keeps the flat 40% scrim. */}
      <div className="absolute inset-0 z-0 pointer-events-none [background:linear-gradient(180deg,rgba(0,0,0,0)_30%,rgba(0,0,0,.26)_60%,rgba(0,0,0,.5)_100%)] lg:[background:rgba(0,0,0,.4)]" />

      {/* Slide indicators — hidden on desktop per the prototype (no dot nav
          at ≥1024px; autoplay + swipe only). Kept for mobile. */}
      <div
        role="tablist"
        aria-label={t('a11y.heroSlides' as any)}
        className="absolute bottom-[18px] left-1/2 -translate-x-1/2 flex gap-2 z-20 lg:hidden"
      >
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={index === currentSlide}
            onClick={() => setCurrentSlide(index)}
            className={`relative h-2 rounded-full transition-all duration-500 before:absolute before:inset-[-10px] before:content-[''] ${
              index === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/65'
            }`}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Content: pinned bottom-left on every size. Phones (Primo1 `.slide-txt`):
          33px from the left, 76px above the bottom. Desktop: bottom-left of the
          centered 976px column, ~99px above the band's bottom edge. */}
      <div className="container-premium !px-0 absolute inset-x-0 bottom-[76px] z-10 w-full lg:bottom-[99px] lg:top-auto lg:mx-auto lg:!max-w-[956px]">
        <div
          className="flex flex-col gap-0 animate-reveal items-start text-left ml-[33px] mr-4 lg:mx-0 lg:max-w-[700px]"
          style={{ maxWidth: `${content.hero.layout.contentMaxWidth}px` }}
        >
          <div className="space-y-3 sm:space-y-4 lg:space-y-0">
            <h1 className="font-heading text-white text-balance [text-shadow:0_2px_12px_rgba(0,0,0,.4)] leading-[1.15] text-[clamp(25px,6.9vw,30px)] font-semibold tracking-[-0.035em] lg:[text-shadow:none] lg:drop-shadow-xl lg:leading-[45px] lg:text-[35px] lg:font-bold lg:tracking-[-0.08px] lg:whitespace-nowrap">
              {headline}
            </h1>
          </div>

          <p className="mt-3 font-semibold text-white [text-shadow:0_1px_8px_rgba(0,0,0,.4)] max-w-[290px] text-[16px] leading-[19px] text-balance lg:[text-shadow:none] lg:drop-shadow-md lg:mt-1 lg:max-w-none lg:text-[19px] lg:leading-[30px] lg:font-bold lg:tracking-[0.31px] lg:text-[#dedede]">
            {subtitle}
          </p>

          <div className="flex flex-col-reverse items-start gap-[15px] mt-10 lg:flex-row lg:gap-[7px] lg:mt-[37px] lg:-ml-[10px]">
            {/* Primary: black pill (Figma). Secondary: filled light/translucent
                pill (Figma) — not an outline. On mobile Figma stacks the light
                secondary on TOP and the black primary below, so the container is
                flex-col-reverse (secondary is last in source → renders first);
                desktop row order is unchanged. Phones follow Primo1 `.hbtn`
                (46px, auto width, translucent blurred ghost). Kept as router <Link>s (behavior)
                styled to match the Button primitive. Labels/links fall back to
                the defaults when the slide leaves them blank. */}
            {renderCtaButton(
              primaryLabel,
              primaryLink,
              "max-w-full h-[46px] inline-flex items-center justify-center px-[clamp(20px,6.8vw,30px)] rounded-pill bg-primary text-primary-foreground border border-primary text-[clamp(15px,4.1vw,18px)] font-medium tracking-[0.035em] uppercase whitespace-nowrap transition-all duration-300 shadow-[0_6px_18px_rgba(0,0,0,.18)] active:scale-[0.97] lg:active:scale-[0.98] lg:w-[258px] lg:min-w-0 lg:h-[38px] lg:px-[39px] lg:text-[14px] lg:tracking-[0.5px] lg:whitespace-nowrap lg:shadow-none lg:border-black lg:hover:bg-black lg:hover:text-primary-foreground"
            )}
            {renderCtaButton(
              secondaryLabel,
              secondaryLink,
              "max-w-full h-[46px] inline-flex items-center justify-center px-[clamp(20px,6.8vw,30px)] rounded-pill border-0 bg-[rgba(28,28,28,.5)] backdrop-blur-[8px] text-white text-[clamp(15px,4.1vw,18px)] font-medium tracking-[0.035em] uppercase whitespace-nowrap lg:hover:bg-white transition-all duration-300 active:scale-[0.97] lg:active:scale-[0.98] lg:backdrop-blur-none lg:w-[154px] lg:min-w-0 lg:h-[38px] lg:px-0 lg:text-[14px] lg:tracking-[0.5px] lg:whitespace-nowrap lg:text-white lg:border-0 lg:[background:linear-gradient(90deg,#5d5c5c,#868585_55%,#9a9999)] lg:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] lg:hover:text-white"
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
