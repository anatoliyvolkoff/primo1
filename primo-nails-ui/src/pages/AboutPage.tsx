import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useSeo } from '../lib/useSeo';
import { useStoreSetting } from '../hooks/useStoreContent';
import { waLinkWithText, WHOLESALE_EMAIL, WHATSAPP_FALLBACK } from '../lib/whatsapp';
import { GalleryLightbox, type GalleryPhoto } from '../components/GalleryLightbox';
import './about.css';

/**
 * "Chi siamo" — Primo1 `chi-siamo.html` (styles in about.css): full-bleed hero
 * with giant type, a one-line intro, a four-chapter timeline, the founder in
 * her own words, a work gallery, three values, the shop / school tiles and a
 * black contact panel. Phones: one column; desktop: the 976px column.
 */

const ArrowRight = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
const ArrowUpRight = () => (
  <svg className="abc-go2" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
);

export function AboutPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  useSeo({ titleKey: 'pageTitle.about', descriptionKey: 'seo.about.description', canonicalPath: '/about-us' });
  const whatsappBase = useStoreSetting<string>('course_whatsapp_url', '');
  const whatsappHref = waLinkWithText(whatsappBase) || WHATSAPP_FALLBACK;

  const goBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const chapters = [
    { yr: <>2005</>, h: 'aboutPage.time.1.title', p: 'aboutPage.time.1.text' },
    { yr: <>20<sup>+</sup></>, h: 'aboutPage.time.2.title', p: 'aboutPage.time.2.text' },
    { yr: <>10 000<sup>+</sup></>, h: 'aboutPage.time.3.title', p: 'aboutPage.time.3.text' },
    { yr: <>{t('aboutPage.time.4.year' as any)}</>, h: 'aboutPage.time.4.title', p: 'aboutPage.time.4.text' },
  ];
  const gallery = [
    { src: '/about/about-portrait.jpg', key: 'aboutPage.gal.1' },
    { src: '/about/course2.jpg', key: 'aboutPage.gal.2' },
    { src: '/about/gallery-dots.jpg', key: 'aboutPage.gal.3' },
    { src: '/about/course3.jpg', key: 'aboutPage.gal.4' },
    { src: '/about/hero2.jpg', key: 'aboutPage.gal.5' },
  ];
  const values = [1, 2, 3];
  const photos: GalleryPhoto[] = gallery.map((g) => ({ src: g.src, alt: t(`${g.key}.alt` as any), caption: t(g.key as any) }));
  const [lightbox, setLightbox] = React.useState<number | null>(null);

  return (
    <main className="flex-1 pt-[61px] lg:pt-[95px]">
      <div className="abc">
        <section className="abc-hero">
          <picture>
            <source media="(min-width:1024px)" srcSet="/about/academy-hero-d.jpg" />
            <img src="/about/academy-hero-m.jpg" alt={t('aboutPage.hero.alt' as any)} fetchPriority="high" />
          </picture>
          <div className="abc-back cx-back">
            <a className="back" href="/" onClick={goBack}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
              {t('nav.back')}
            </a>
          </div>
          <div className="abc-title">
            <p className="cx-eyebrow">PriMo Nails · Milano</p>
            <h1>{t('aboutPage.hero.title1' as any)} <br />{t('aboutPage.hero.title2' as any)}</h1>
          </div>
        </section>

        <section className="abc-intro" aria-label={t('aboutPage.intro.label' as any)}>
          <p>
            {t('aboutPage.intro.text' as any)} <span>{t('aboutPage.intro.muted' as any)}</span>
          </p>
        </section>

        <section className="abc-time" aria-labelledby="time-h">
          <div className="abc-time-head">
            <p className="cx-eyebrow">{t('aboutPage.time.eyebrow' as any)}</p>
            <h2 id="time-h">{t('aboutPage.time.title' as any)}</h2>
          </div>
          <ol className="abc-track" tabIndex={0} aria-label={t('aboutPage.time.label' as any)}>
            {chapters.map((c) => (
              <li key={c.h}>
                <span className="abc-yr">{c.yr}</span>
                <h3>{t(c.h as any)}</h3>
                <p>{t(c.p as any)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="abc-founder" id="storia" aria-labelledby="founder-h">
          <div className="abc-founder-img">
            <img src="/about/founder-d.jpg" alt={t('aboutPage.founder.alt' as any)} loading="lazy" />
          </div>
          <div className="abc-founder-txt">
            <p className="cx-eyebrow">{t('aboutPage.founder.eyebrow' as any)}</p>
            <h2 id="founder-h" className="sr">Irina PriMo</h2>
            <p className="abc-words">“{t('aboutPage.founder.words' as any)}”</p>
            <p className="abc-name">Irina PriMo<span>{t('aboutPage.founder.role' as any)}</span></p>
          </div>
        </section>

        <section className="abc-gal" id="lavoro" aria-labelledby="cg-h">
          <div className="abc-gal-head">
            <p className="cx-eyebrow">{t('aboutPage.gal.eyebrow' as any)}</p>
            <h2 id="cg-h">{t('aboutPage.gal.title' as any)}</h2>
          </div>
          <div className="abc-gal-grid" role="list" aria-label={t('aboutPage.gal.label' as any)}>
            {photos.map((ph, i) => (
              <button key={ph.src} type="button" role="listitem" className="abc-gal-item" onClick={() => setLightbox(i)} aria-label={`${ph.caption} — ${t('aboutPage.gal.open' as any)}`}>
                <img src={ph.src} alt="" loading="lazy" />
                <span className="abc-gal-cap">{ph.caption}</span>
                <span className="abc-gal-zoom" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M11 8v6M8 11h6" /></svg>
                </span>
              </button>
            ))}
          </div>
          {lightbox !== null && (
            <GalleryLightbox photos={photos} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />
          )}
        </section>

        <section className="abc-values" id="valori" aria-labelledby="values-h">
          <p className="cx-eyebrow">{t('aboutPage.values.eyebrow' as any)}</p>
          <h2 id="values-h" className="sr">{t('aboutPage.values.title' as any)}</h2>
          <ul>
            {values.map((n) => (
              <li key={n}>
                <h3>{t(`aboutPage.values.${n}.title` as any)}</h3>
                <p>{t(`aboutPage.values.${n}.text` as any)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="abc-paths" aria-labelledby="paths-h">
          <p className="cx-eyebrow">{t('aboutPage.paths.eyebrow' as any)}</p>
          <h2 id="paths-h">{t('aboutPage.paths.title' as any)}</h2>
          <div className="abc-tiles">
            <Link className="abc-tile" to="/tutti-prodotti">
              <img src="/about/product.jpg" alt="" loading="lazy" />
              <div className="abc-tile-txt">
                <p className="cx-eyebrow">{t('aboutPage.paths.shop.eyebrow' as any)}</p>
                <h3>{t('aboutPage.paths.shop.title' as any)}</h3>
                <p>{t('aboutPage.paths.shop.text' as any)}</p>
              </div>
              <span className="abc-arrow" aria-hidden="true"><ArrowRight /></span>
              <span className="sr">{t('aboutPage.paths.shop.cta' as any)}</span>
            </Link>
            <Link className="abc-tile school" to="/corsi">
              <img src="/about/course1.jpg" alt="" loading="lazy" />
              <div className="abc-tile-txt">
                <p className="cx-eyebrow">{t('aboutPage.paths.school.eyebrow' as any)}</p>
                <h3>PriMo Academy</h3>
                <p>{t('aboutPage.paths.school.text' as any)}</p>
              </div>
              <span className="abc-arrow" aria-hidden="true"><ArrowRight /></span>
              <span className="sr">{t('aboutPage.paths.school.cta' as any)}</span>
            </Link>
          </div>
        </section>

        <section className="abc-contact" aria-labelledby="end-h">
          <div className="abc-contact-txt">
            <p className="cx-eyebrow">{t('aboutPage.contact.eyebrow' as any)}</p>
            <h2 id="end-h">{t('aboutPage.contact.title' as any)}</h2>
            <p>{t('aboutPage.contact.text' as any)}</p>
          </div>
          <ul className="abc-lines">
            <li>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <span className="abc-ic">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.1z" /><path d="M9 9.5c.3 2 2.5 4.6 5.5 5.3l1.2-1.4-1.8-1-1 .8c-1-.5-2-1.5-2.4-2.4l.8-1-1-1.8z" /></svg>
                </span>
                <span><small>WhatsApp</small>+39 389 319 3049</span>
                <ArrowUpRight />
              </a>
            </li>
            <li>
              <a href={`mailto:${WHOLESALE_EMAIL}`}>
                <span className="abc-ic">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                </span>
                <span><small>Email</small>{WHOLESALE_EMAIL}</span>
                <ArrowUpRight />
              </a>
            </li>
            <li>
              <span className="abc-row">
                <span className="abc-ic">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
                </span>
                <span><small>{t('aboutPage.contact.office' as any)}</small>{t('aboutPage.contact.city' as any)}</span>
              </span>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
