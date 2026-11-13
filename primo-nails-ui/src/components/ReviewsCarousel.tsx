import { useState, useRef, useEffect, useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useStoreContent, type Testimonial } from '../hooks/useStoreContent';
import { resolveTranslation } from '../lib/entityTranslations';
import './community.css';

/** Primo1 "PriMo Community": a big rotating quote beside the rating, above a
 *  slowly scrolling wall of review cards (tap a card to show it big). Markup and
 *  class names mirror primo1's index.html; styles live in community.css. Data
 *  comes from the admin-managed testimonials. */
const SLIDE_MS = 6000;

const StarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m12 2.5 2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9Z" />
  </svg>
);

const Stars = ({ rating = 5, label }: { rating?: number; label?: string }) => (
  <span className="stars" {...(label ? { role: 'img', 'aria-label': label } : {})}>
    {Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={i < Math.round(rating) ? undefined : { opacity: 0.2 }} className="contents">
        <StarIcon />
      </span>
    ))}
  </span>
);

const initials = (name: string) =>
  name.replace(/\./g, '').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export const ReviewsCarousel = () => {
  const { t, language } = useLanguage();
  const { data: storeContent } = useStoreContent();
  const reviews: Testimonial[] = storeContent?.testimonials ?? [];
  const reduceMotion = useReducedMotion();

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  // Bumped on every change so the active dot's fill animation restarts.
  const [tick, setTick] = useState(0);
  const quoteRef = useRef<HTMLDivElement>(null);

  const n = reviews.length;
  const show = useCallback(
    (k: number) => {
      if (!n) return;
      setCurrent(((k % n) + n) % n);
      setTick((x) => x + 1);
    },
    [n],
  );

  // Autoplay: next quote every 6s; hovering/focusing the quote pauses it.
  useEffect(() => {
    if (reduceMotion || paused || n < 2) return;
    const id = window.setTimeout(() => show(current + 1), SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [current, paused, reduceMotion, n, show, tick]);

  if (n === 0) return null;

  const text = (r: Testimonial) => resolveTranslation(r.metadata, 'text', r.text, language);
  const role = (r: Testimonial) => resolveTranslation(r.metadata, 'role', r.role, language);
  const avg = reviews.reduce((s, r) => s + (r.rating ?? 5), 0) / n;
  const avgLabel = avg.toLocaleString(language === 'en' ? 'en-IE' : 'it-IT', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const starsLabel = (v: number) => t('reviews.starsOutOf', { n: String(Math.round(v)) });

  const who = (r: Testimonial) => (
    <span className="cm-who">
      <span className="cm-av" aria-hidden="true">{initials(r.author)}</span>
      <span>
        <span className="cm-n">{r.author}</span>
        <span className="cm-r">{role(r)}</span>
      </span>
    </span>
  );

  // Two rows (the second only on desktop), each doubled for a seamless loop;
  // the copies are hidden from assistive tech and the tab order.
  const order = reviews.map((_, i) => i);
  const half = Math.floor(n / 2);
  const rows = [order, [...order.slice(half), ...order.slice(0, half)]];

  const onCardClick = (k: number) => {
    show(k);
    const r = quoteRef.current?.getBoundingClientRect();
    if (r && (r.top < 70 || r.bottom > window.innerHeight)) {
      quoteRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
  };

  return (
    <section className={`pm-community${paused ? ' paused' : ''}`} id="community">
      <div
        className="cm-top"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <div>
          <p className="cm-eyebrow">{t('reviews.label')}</p>
          <h2 className="h2">
            {t('reviews.title')} {t('reviews.titleLine2')}
          </h2>
          <p className="sub">{t('reviews.subtitle')}</p>
          <div className="cm-score">
            <b>{avgLabel}</b>
            <Stars rating={avg} label={starsLabel(avg)} />
            <p>
              {avg >= 4.5 && <strong>{t('reviews.excellent')}</strong>}
              {t('reviews.count', { count: n.toLocaleString(language === 'en' ? 'en-IE' : 'it-IT') })}
            </p>
          </div>
        </div>

        <div className="cm-spot" role="region" aria-roledescription="carousel" aria-label={t('reviews.featured')}>
          <div className="cm-q" ref={quoteRef} aria-live="polite">
            <span className="cm-mark" aria-hidden="true">“</span>
            {reviews.map((r, i) => (
              <figure key={r.id || i} className={`cm-slide${i === current ? ' on' : ''}`} aria-hidden={i !== current}>
                <blockquote>{text(r)}</blockquote>
                <Stars rating={r.rating ?? 5} label={starsLabel(r.rating ?? 5)} />
                <figcaption>{who(r)}</figcaption>
              </figure>
            ))}
          </div>
          <div className="cm-ctl">
            <div className="cm-dots" style={{ ['--t' as string]: `${SLIDE_MS}ms` }}>
              {reviews.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={t('reviews.slideOf', { i: String(i + 1), n: String(n) })}
                  aria-current={i === current}
                  onClick={() => show(i)}
                >
                  <i key={i === current ? `on-${tick}` : 'off'} />
                </button>
              ))}
            </div>
            <button className="cm-arrow" type="button" aria-label={t('reviews.prev')} onClick={() => show(current - 1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
            </button>
            <button className="cm-arrow" type="button" aria-label={t('reviews.next')} onClick={() => show(current + 1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="cm-wall">
        {rows.map((row, ri) => (
          <div key={ri} className={`cm-row${ri ? ' rev' : ''}`} style={{ ['--d' as string]: `${ri ? 80 : 70}s` }}>
            {[0, 1].map((copy) =>
              row.map((k) => (
                <button
                  key={`${copy}-${k}`}
                  type="button"
                  className={`cm-card${k === current ? ' cur' : ''}`}
                  onClick={() => onCardClick(k)}
                  {...(copy
                    ? { 'aria-hidden': true, tabIndex: -1 }
                    : { 'aria-label': t('reviews.read', { name: reviews[k].author }) })}
                >
                  <Stars rating={reviews[k].rating ?? 5} />
                  <span className="cm-t">“{text(reviews[k])}”</span>
                  {who(reviews[k])}
                </button>
              )),
            )}
          </div>
        ))}
      </div>
      <p className="cm-hint">{t('reviews.hint')}</p>
    </section>
  );
};
