import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useScrollLock } from '../lib/scrollLock';
import './galleryLightbox.css';

export type GalleryPhoto = { src: string; alt: string; caption: string };

/** Lightbox: arrows, Esc, ← → keys and a horizontal swipe; focus is trapped while open. */
export function GalleryLightbox({ photos, index, onIndex, onClose }: { photos: GalleryPhoto[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const { t } = useLanguage();
  const ref = useFocusTrap<HTMLDivElement>({ active: true, onEscape: onClose });
  useScrollLock(true);
  const touchX = React.useRef<number | null>(null);
  const go = React.useCallback((d: number) => onIndex((index + d + photos.length) % photos.length), [index, photos.length, onIndex]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go]);
  const photo = photos[index];
  return createPortal(
    <div
      ref={ref}
      className="abc-lb"
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <button type="button" className="abc-lb-btn abc-lb-close" onClick={onClose} aria-label={t('a11y.close' as any)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      <button type="button" className="abc-lb-btn abc-lb-prev" onClick={() => go(-1)} aria-label={t('a11y.image.prev' as any)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <img className="abc-lb-img" src={photo.src} alt={photo.alt} />
      <button type="button" className="abc-lb-btn abc-lb-next" onClick={() => go(1)} aria-label={t('a11y.image.next' as any)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
      </button>
      <p className="abc-lb-cap" aria-live="polite">{photo.caption}<small>{index + 1} / {photos.length}</small></p>
    </div>,
    document.body,
  );
}
