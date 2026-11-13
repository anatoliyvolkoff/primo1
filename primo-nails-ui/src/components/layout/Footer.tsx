import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';

import { useLanguage } from '../../context/LanguageContext';
import './footer.css';

/** Primo1 footer (index.html `.footer`): phones get one-open-at-a-time
 *  accordions, desktop shows three always-open link columns. Markup and class
 *  names mirror primo1; styles live in footer.css. Links are our real routes. */

// A footer link is normally an internal router link (`to`); a `href` marks an
// external/mailto link that must render as a plain <a> instead.
type FooterLink = { label: string; to: string; href?: undefined } | { label: string; href: string; to?: undefined };

const DESKTOP_MQ = '(min-width: 1024px)';

const SOCIAL = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/primonailspro?igsh=bnI3MmRkMXowMXkw',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <path d="M17.5 6.5h.01" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/share/17zrBnKb1C/?mibextid=wwXIfr',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@irinaprimo-primonails?si=GxjUse6RTN8XS7xV',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <path d="m10 15 5-3-5-3z" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@primonailspro?_r=1&_t=ZN-98KbxK9VbwU',
    icon: (
      <svg viewBox="0 0 24 24" className="fill" aria-hidden="true">
        <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1 0-5.2c.27 0 .53.04.78.12V9.66a5.7 5.7 0 0 0-.78-.05A5.69 5.69 0 0 0 4.17 15.3a5.69 5.69 0 0 0 5.69 5.69 5.69 5.69 0 0 0 5.69-5.69V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.25-1.48Z" />
      </svg>
    ),
  },
  {
    label: 'Telegram',
    href: 'https://t.me/primonails',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
        <path d="m21.854 2.147-10.94 10.939" />
      </svg>
    ),
  },
];

export const Footer = () => {
  const { t } = useLanguage();
  const accRef = useRef<HTMLDivElement>(null);

  // Primo1: accordions on phones (one open at a time), always open on desktop.
  useEffect(() => {
    const acc = accRef.current;
    if (!acc) return;
    const mq = window.matchMedia(DESKTOP_MQ);
    const all = () => Array.from(acc.querySelectorAll('details'));
    const sync = () => all().forEach((d) => { d.open = mq.matches; });
    const onToggle = (e: Event) => {
      const d = e.target as HTMLDetailsElement;
      if (mq.matches || !d.open) return;
      all().forEach((o) => { if (o !== d) o.open = false; });
    };
    sync();
    mq.addEventListener('change', sync);
    acc.addEventListener('toggle', onToggle, true);
    return () => {
      mq.removeEventListener('change', sync);
      acc.removeEventListener('toggle', onToggle, true);
    };
  }, []);

  // Desktop columns can't be collapsed.
  const onSummaryClick = (e: MouseEvent) => {
    if (window.matchMedia(DESKTOP_MQ).matches) e.preventDefault();
  };

  // For hash links (e.g. "/#newArrivals") already on the target page, React
  // Router fires no navigation; scroll to the anchor manually. A link to the
  // exact URL already shown (e.g. "/tutti-prodotti?sort=newest") just scrolls
  // to the top.
  const handleNavClick = (to: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    const hashIndex = to.indexOf('#');
    if (hashIndex === -1) {
      if (window.location.pathname + window.location.search === to) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    const path = to.slice(0, hashIndex) || '/';
    const id = to.slice(hashIndex + 1);
    if (window.location.pathname === path && window.location.hash === `#${id}`) {
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const sections: Array<{ title: string; links: FooterLink[] }> = [
    {
      title: t('footer.shop'),
      links: [
        { label: t('footer.shopAllProducts'), to: '/tutti-prodotti' },
        { label: t('footer.shopNewArrivals'), to: '/tutti-prodotti?sort=newest' },
        { label: t('footer.shopCollections'), to: '/kit' },
        { label: t('footer.shopAccessories'), to: '/accessori' },
      ],
    },
    { title: t('footer.training'), links: [{ label: t('footer.trainingOnline'), to: '/corsi' }] },
    {
      title: t('footer.company'),
      links: [
        { label: t('footer.companyStory'), to: '/about-us' },
        { label: t('footer.companyContacts'), href: 'mailto:primonailspro@gmail.com' },
        { label: t('footer.companyShipping'), to: '/spedizioni' },
        { label: t('footer.companyPrivacy'), to: '/privacy' },
        { label: t('footer.companyTerms'), to: '/termini' },
      ],
    },
  ];

  return (
    <footer className="pm-footer">
      <div className="f-in">
        <div className="f-brand">
          <Link to="/" aria-label="PriMo Nails" className="inline-block">
            <img className="f-logo" src="/logo.png" alt="PriMo Nails" width={98} height={15.5} draggable={false} />
          </Link>
          <p className="f-desc">{t('footer.brandDescription')}</p>
          <div className="social">
            {SOCIAL.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        <div className="acc" ref={accRef}>
          {sections.map((sec) => (
            <details key={sec.title}>
              <summary onClick={onSummaryClick}>
                {sec.title}
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </summary>
              <ul>
                {sec.links.map((link) => (
                  <li key={link.label}>
                    {link.href !== undefined ? (
                      <a href={link.href}>{link.label}</a>
                    ) : (
                      <Link to={link.to} onClick={handleNavClick(link.to)}>{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        <div className="f-bottom">
          <p className="copy">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <div className="contacts">
            <p className="contact">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
              <a href="mailto:primonailspro@gmail.com">primonailspro@gmail.com</a>
            </p>
            <p className="contact">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              <a href="tel:+393893193049">+39 389 319 3049</a>
            </p>
          </div>
          <div className="pay" aria-label={t('footer.paymentMethods')}>
            <span className="visa">VISA</span>
            <span className="mc"><i className="mc1" /><i className="mc2" /></span>
            <span className="amex"><b>AMEX</b></span>
            <span className="ap">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.4 12.7c0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8s-1.7-.8-2.8-.8c-1.4 0-2.8.9-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7c1.2 0 1.9-1 2.6-2.1.8-1.2 1.1-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.4ZM14.3 6.3c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2Z" /></svg>
              Pay
            </span>
            <span className="gp"><b>G</b> Pay</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
