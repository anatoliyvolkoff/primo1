import { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { GalleryLightbox, type GalleryPhoto } from './GalleryLightbox';
import './academyGallery.css';

const PHOTOS = [
  { src: '/about/course1.jpg', n: 1 },
  { src: '/about/course2.jpg', n: 2 },
  { src: '/about/course3.jpg', n: 3 },
  { src: '/about/academy-hero-d.jpg', n: 4 },
  { src: '/about/founder-d.jpg', n: 5 },
  { src: '/about/gallery-dots.jpg', n: 6 },
  { src: '/about/hero2.jpg', n: 7 },
];

/** Bottom-of-page gallery for /corsi: a swipe / arrow-scrollable row; tap a photo to enlarge it. */
export function AcademyGallery({ images }: { images?: string[] }) {
  const { t } = useLanguage();
  const track = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  // Per-course photos (Admin) when given; otherwise the shared Academy set with captions.
  const photos: GalleryPhoto[] = images && images.length > 0
    ? images.map((src, i) => ({ src, alt: t('a11y.academyGallery', { index: i + 1 }), caption: t('a11y.academyGallery', { index: i + 1 }) }))
    : PHOTOS.map((p) => ({
        src: p.src,
        alt: t(`courses.gallery.${p.n}.alt` as any),
        caption: t(`courses.gallery.${p.n}` as any),
      }));
  const step = useCallback((d: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: d * Math.max(240, el.clientWidth * 0.8), behavior: reduce ? 'auto' : 'smooth' });
  }, []);

  return (
    <section className="acg" aria-labelledby="acg-h">
      <div className="acg-head">
        <div>
          <p className="acg-eyebrow">{t('courses.gallery.eyebrow' as any)}</p>
          <h2 id="acg-h">{t('courses.gallery.title' as any)}</h2>
        </div>
        <div className="acg-arrows">
          <button type="button" onClick={() => step(-1)} aria-label={t('a11y.image.prev' as any)}><ChevronLeft aria-hidden="true" /></button>
          <button type="button" onClick={() => step(1)} aria-label={t('a11y.image.next' as any)}><ChevronRight aria-hidden="true" /></button>
        </div>
      </div>
      <div
        ref={track}
        className="acg-track"
        role="list"
        tabIndex={0}
        aria-label={t('courses.gallery.label' as any)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
        }}
      >
        {photos.map((ph, i) => (
          <button key={ph.src} type="button" role="listitem" className="acg-item" onClick={() => setOpen(i)} aria-label={`${ph.caption} — ${t('aboutPage.gal.open' as any)}`}>
            <img src={ph.src} alt={ph.alt} loading="lazy" draggable={false} />
            <span className="acg-zoom" aria-hidden="true"><ZoomIn /></span>
          </button>
        ))}
      </div>
      {open !== null && <GalleryLightbox photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </section>
  );
}
