import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../i18n';

interface BreadcrumbsProps {
  customItems?: { label: string; link?: string }[];
  /** Primo1 catalogue `.back`: an "Indietro" link above the trail (phones). */
  withBack?: boolean;
  /** Primo1 catalogue shows the trail on phones only. */
  mobileOnly?: boolean;
}

// Known route slugs → translation key, so breadcrumbs read in the active
// language (e.g. EN "/tutti-prodotti" → "ALL PRODUCTS", not "Tutti Prodotti").
const SLUG_LABEL_KEYS: Record<string, TranslationKey> = {
  'tutti-prodotti': 'nav.allProducts',
  shop: 'nav.semipermanente',
  preparatori: 'nav.preparatori',
  base: 'nav.base',
  top: 'nav.top',
  gel: 'nav.gel',
  'gel-medio': 'nav.gel.medio',
  'gel-architect': 'nav.gel.architect',
  'gel-wedding-perla': 'nav.gel.weddingPerla',
  acrygel: 'nav.acrygel',
  semipermanente: 'nav.semipermanente',
  'nail-art': 'nav.nailArt',
  care: 'nav.care',
  kit: 'nav.kit',
  accessori: 'nav.accessori',
  corsi: 'nav.corsi',
  'about-us': 'nav.aboutUs',
};

/** Menu labels are all caps ("TUTTI I PRODOTTI"); Primo1's crumbs read
 *  "Tutti i Prodotti" — capitalise words longer than two letters. */
const titleCase = (s: string) =>
  s === s.toUpperCase()
    ? s.toLowerCase().split(' ').map((w, i) => (i === 0 || w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ')
    : s;

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ customItems, withBack = false, mobileOnly = false }) => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const goBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };
  const pathnames = location.pathname.split('/').filter((x) => x);

  const items = customItems || [
    { label: t('breadcrumb.home'), link: '/' },
    ...pathnames.map((value, index) => {
      const last = index === pathnames.length - 1;
      const to = `/${pathnames.slice(0, index + 1).join('/')}`;

      const key = SLUG_LABEL_KEYS[value.toLowerCase()];
      const label = key
        ? titleCase(t(key))
        : value.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

      return {
        label,
        link: last ? undefined : to,
      };
    }),
  ];

  const trail = (
    <nav
      aria-label={t('a11y.breadcrumb')}
      // Phones: Primo1 `.crumbs` — 13px sentence case (the labels are
      // uppercase strings, so each is lower-cased with a capital first
      // letter), light grey.
      className="flex items-center gap-0 text-[13px] leading-4 font-normal tracking-normal text-[#a8a8a8] mb-[18px] font-inter lg:text-[13px] lg:leading-4 lg:text-[#8a8a8a] lg:gap-0.5 lg:mb-0 select-none overflow-x-auto no-scrollbar whitespace-nowrap"
    >
      <ol className="flex items-center gap-0 lg:gap-0.5 min-w-0">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-0 lg:gap-0.5 min-w-0">
            {item.link ? (
              <Link
                to={item.link}
                className="hover:text-foreground lg:hover:text-black transition-colors truncate max-w-[140px] sm:max-w-none max-lg:inline-block"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-[#a8a8a8] lg:text-[#4a4a4a] max-lg:inline-block truncate max-w-[180px] sm:max-w-none">
                {item.label}
              </span>
            )}
            {index < items.length - 1 && (
              <ChevronRight aria-hidden="true" className="w-3 h-3 shrink-0 text-[#a8a8a8] lg:text-[#8a8a8a] ml-[10.4px] mr-0.5 lg:ml-2" strokeWidth={3} />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );

  if (!withBack && !mobileOnly) return trail;
  return (
    <div className={`${mobileOnly ? 'lg:hidden' : ''} ${withBack ? 'max-lg:pl-[10px]' : ''}`}>
      {withBack && (
        <a
          href="/"
          onClick={goBack}
          className="inline-flex items-center h-[28.2px] font-inter text-[13px] leading-4 text-[#555]"
        >
          <ChevronLeft aria-hidden="true" className="w-[22.6px] h-[22.6px] mr-px" strokeWidth={1.6} />
          {t('nav.back')}
        </a>
      )}
      <div className={withBack ? 'mt-3 pl-6' : undefined}>{trail}</div>
    </div>
  );
};
