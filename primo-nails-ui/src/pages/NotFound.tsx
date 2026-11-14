import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useSeo } from '../lib/useSeo';
import { Text } from '../components/ui';

/**
 * 404 page. Replaces the prior behaviour where any unknown URL fell
 * through to CategoryPage and rendered an empty product grid — the
 * worst kind of "looks like a real page but isn't" experience.
 *
 * Rendered both for unknown top-level paths and for unknown
 * category slugs (CategoryRoute decides which).
 */
export function NotFound() {
  const { t } = useLanguage();
  useSeo({ titleKey: 'pageTitle.notFound', noindex: true });
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16 sm:py-24">
      <div className="max-w-xl text-center flex flex-col items-center gap-6">
        <p className="font-sans text-[11px] font-bold tracking-[0.4em] uppercase text-accent-gold">
          {t('notFound.eyebrow')}
        </p>
        <p
          aria-hidden="true"
          className="font-heading font-bold tracking-tight leading-none text-foreground text-[clamp(72px,18vw,140px)]"
        >
          404
        </p>
        <span aria-hidden="true" className="block h-px w-10 bg-accent-gold" />
        <h1 className="font-sans font-medium leading-relaxed text-foreground text-[clamp(18px,3vw,24px)]">
          {t('notFound.title')}
        </h1>
        <Text tone="muted" className="max-w-md">{t('notFound.body')}</Text>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-pill font-sans font-medium uppercase tracking-widest h-12 px-8 text-base bg-primary text-primary-foreground border border-primary shadow-card transition-[background-color,color,box-shadow,transform] duration-200 ease-out hover:bg-transparent hover:text-primary hover:shadow-subtle active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t('notFound.ctaHome')}
          </Link>
          <Link
            to="/tutti-prodotti"
            className="inline-flex items-center justify-center gap-2 rounded-pill font-sans font-medium uppercase tracking-widest h-12 px-8 text-base bg-transparent text-primary border border-primary transition-[background-color,color,transform] duration-200 ease-out hover:bg-primary hover:text-primary-foreground active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t('notFound.ctaShop')}
          </Link>
        </div>
      </div>
    </main>
  );
}
