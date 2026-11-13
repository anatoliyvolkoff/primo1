import { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Menu, ChevronDown } from 'lucide-react';
import { useScroll, useMotionValueEvent } from 'motion/react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { CartSidebar } from './header/CartSidebar';
import { SearchOverlay } from './header/SearchOverlay';
import { MobileMenu } from './header/MobileMenu';

export const Header = () => {
  const { language, setLanguage, t } = useLanguage();
  const { isCartOpen, setIsCartOpen, isSearchOpen, setIsSearchOpen, cartCount } = useCart();
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  // Re-trigger the cart-count "pop" animation on every change by remounting
  // the badge via a key bump (visual only — reads cartCount, no logic).
  const [cartPopKey, setCartPopKey] = useState(0);
  const prevCartCount = useRef(cartCount);
  // Captured on the logo's pointerdown (before the outside-click handler flips
  // the menu state) so the logo's click can suppress navigation when the mobile
  // menu was open — a tap on the logo then only closes the menu.
  const suppressLogoNav = useRef(false);
  const { pathname } = useLocation();
  const { scrollY } = useScroll();

  const languages: { code: 'it' | 'en'; label: string }[] = [
    { code: 'it', label: 'IT' },
    { code: 'en', label: 'EN' },
  ];
  const activeLang = languages.find(l => l.code === language) ?? languages[0];

  // Bump the pop key whenever the cart count actually changes.
  useEffect(() => {
    if (prevCartCount.current !== cartCount) {
      prevCartCount.current = cartCount;
      setCartPopKey(k => k + 1);
    }
  }, [cartCount]);

  // Close the language dropdown on outside click.
  useEffect(() => {
    if (!isLangOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isLangOpen]);

  // Close the mobile menu on any click/tap outside the menu panel. The menu can fill
  // the screen, so "outside" is mainly the always-visible top bar — anything except the
  // panel itself and the burger (which toggles itself) collapses the menu.
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const menuEl = document.getElementById('mobile-menu');
      if (menuEl?.contains(target)) return; // tap inside the menu — keep it open
      if (burgerRef.current?.contains(target)) return; // burger handles its own toggle
      setIsMobileMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isMobileMenuOpen]);

  const navItems = [
    { label: t('nav.allProducts'), link: '/tutti-prodotti' },
    { label: t('nav.preparatori'), link: '/preparatori' },
    { label: t('nav.base'), link: '/base' },
    { label: t('nav.top'), link: '/top' },
    {
      label: t('nav.gel'),
      link: '/gel',
      // `subItems` drives both the desktop hover/focus dropdown (below) and the
      // mobile menu's expandable section — the Gel sub-categories.
      subItems: [
        { label: t('nav.gel.all'), link: '/gel' },
        { label: t('nav.gel.medio'), link: '/gel-medio' },
        { label: t('nav.gel.architect'), link: '/gel-architect' },
        { label: t('nav.gel.weddingPerla'), link: '/gel-wedding-perla' },
      ],
    },
    { label: t('nav.acrygel'), link: '/acrygel' },
    { label: t('nav.semipermanente'), link: '/semipermanente' },
    { label: t('nav.nailArt'), link: '/nail-art' },
    { label: t('nav.care'), link: '/care' },
    { label: t('nav.kit'), link: '/kit' },
    { label: t('nav.accessori'), link: '/accessori' },
    { label: t('nav.corsi'), link: '/corsi' },
    { label: t('nav.aboutUs'), link: '/about-us' },
  ];

  useMotionValueEvent(scrollY, 'change', latest => {
    setIsScrolled(latest > 20);
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    setScrollProgress(max > 0 ? Math.min(1, Math.max(0, latest / max)) : 0);
  });

  // Cmd+K / Ctrl+K shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchOpen]);

  return (
    <>
      <header
        // Hold the header's right edge in place while an overlay locks scroll.
        // The scrollbar vanishing widens the viewport, so a fixed `right:0`
        // header (and its centred logo) jumps ~half the scrollbar width — the
        // "shake". Insetting the right edge by the scrollbar width cancels it.
        style={{ right: 'var(--scrollbar-comp, 0px)' }}
        className={`fixed top-0 left-0 ${isMobileMenuOpen ? 'z-[120]' : 'z-50'} transition-colors duration-300 ${
          isScrolled
            ? 'bg-background/95 backdrop-blur-md border-b border-border/50'
            : 'bg-background border-b border-transparent'
        }`}
      >
        <div
          className="container-premium pt-2 pb-2 flex flex-col items-center justify-center gap-1.5 lg:block lg:!max-w-[951px] lg:mx-auto lg:!px-0 lg:py-0 lg:relative lg:h-[94px]"
          style={{ minHeight: '60px' }}
        >
          {/* Top Row */}
          <div className="w-full flex items-center justify-between lg:static">
            {/* Left group: mobile burger + language selector */}
            <div className="flex items-center gap-0.5 shrink-0 lg:absolute lg:left-0 lg:top-2">
            {/* Burger — leftmost on mobile, before the language selector */}
            <button
              ref={burgerRef}
              type="button"
              className="lg:hidden flex items-center justify-center w-11 h-11 min-w-[44px] hover:opacity-100 transition-opacity text-foreground"
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={t('common.menu')}
            >
              <Menu className="h-5 w-5 stroke-[2]" />
            </button>
            {/* Language Selector */}
            <div ref={langRef} className="relative shrink-0">
              <button
                type="button"
                className="flex items-center gap-1.5 sm:gap-2 lg:gap-0 cursor-pointer group min-w-[44px] min-h-[44px] lg:min-h-0 lg:h-[41.5px] -ml-1.5 px-1.5 lg:px-0 lg:pl-[5.7px]"
                onClick={() => setIsLangOpen(prev => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isLangOpen}
                aria-label={t('common.language', { lang: language.toUpperCase() })}
              >
                {/* Flag glyph for the ACTIVE language (desktop only): Italian
                    tricolor for `it`, British Union Jack for `en`. */}
                <span
                  aria-hidden="true"
                  className="hidden lg:flex overflow-hidden rounded-[1.5px] mr-[5.6px]"
                  style={{ width: '18.9px', height: '13.2px' }}
                >
                  {activeLang.code === 'it' ? (
                    <>
                      <i className="flex-1" style={{ background: '#009246' }} />
                      <i className="flex-1" style={{ background: '#fff' }} />
                      <i className="flex-1" style={{ background: '#ce2b37' }} />
                    </>
                  ) : (
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 60 30"
                      preserveAspectRatio="none"
                    >
                      <clipPath id="uk-flag-clip">
                        <rect width="60" height="30" />
                      </clipPath>
                      <g clipPath="url(#uk-flag-clip)">
                        <rect width="60" height="30" fill="#012169" />
                        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
                        <path
                          d="M0,0 L60,30 M60,0 L0,30"
                          stroke="#C8102E"
                          strokeWidth="4"
                          clipPath="url(#uk-flag-clip)"
                        />
                        <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
                        <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
                      </g>
                    </svg>
                  )}
                </span>
                <span className="text-[13px] lg:text-[11px] font-bold lg:font-medium tracking-wider lg:tracking-[0.2px] uppercase leading-none lg:leading-[14px]">
                  {activeLang.label}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 lg:w-[13.2px] lg:h-[13.2px] lg:ml-[5.8px] text-foreground transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isLangOpen && (
                <ul
                  role="listbox"
                  aria-label={t('common.language', { lang: language.toUpperCase() })}
                  className="absolute left-0 top-full mt-2 z-50 min-w-[150px] bg-white border border-border/40 rounded-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] py-2 backdrop-blur-xl"
                >
                  {languages.map(l => (
                    <li key={l.code} role="option" aria-selected={l.code === language}>
                      <button
                        type="button"
                        onClick={() => {
                          setLanguage(l.code);
                          setIsLangOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider transition-colors ${
                          l.code === language
                            ? 'bg-tab-track text-foreground'
                            : 'text-muted-foreground hover:bg-tab-track hover:text-foreground'
                        }`}
                      >
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            </div>

            <Link
              to="/"
              onPointerDown={() => { suppressLogoNav.current = isMobileMenuOpen; }}
              onClick={e => {
                // Menu open → tap on the logo just closes it, no navigation home.
                if (suppressLogoNav.current) {
                  e.preventDefault();
                  suppressLogoNav.current = false;
                }
                setIsMobileMenuOpen(false);
              }}
              className="static translate-x-0 min-[360px]:absolute min-[360px]:left-1/2 min-[360px]:-translate-x-1/2 lg:top-[19.2px] flex items-center justify-center pointer-events-none min-w-0 mx-2 min-[360px]:mx-0"
              style={{ maxWidth: 'calc(100% - 200px)' }}
            >
              <img
                src="/logo.png"
                alt="PriMo Nails"
                className="pointer-events-auto h-auto w-[98px] sm:w-[124px] select-none"
                draggable={false}
              />
            </Link>

            {/* Icons */}
            <div className="flex items-center gap-0 sm:gap-1 lg:gap-0 shrink-0 lg:absolute lg:right-0 lg:top-2">
              {/* Desktop: inline search PILL field. Opens the existing overlay on
                  click (or the / and ⌘K shortcuts) — search logic is unchanged.
                  NOTE: do NOT open on focus — the overlay's focus-trap restores focus
                  to this trigger on close, which would re-open it in a loop, and
                  Tab-focusing it shouldn't pop a modal. */}
              <button
                type="button"
                className="hidden lg:flex items-center justify-start gap-[10px] h-[43.1px] w-[252px] mr-2 pl-[15px] pr-[9px] rounded-[22px] bg-[#f6f6f6] text-foreground transition-[background-color,box-shadow] duration-150 hover:bg-white hover:shadow-[0_0_0_1px_#111]"
                onClick={() => setIsSearchOpen(true)}
                aria-label={t('common.openSearch')}
                aria-keyshortcuts="/ Control+K Meta+K"
              >
                <Search className="h-[17px] w-[17px] stroke-[2] shrink-0" />
                <span className="flex-1 text-left text-[12px] font-medium text-[#808080] whitespace-nowrap">
                  Cerca prodotti, colori…
                </span>
                <kbd
                  aria-hidden="true"
                  className="shrink-0 inline-grid place-items-center min-w-[20px] h-[20px] px-[5px] rounded-[6px] border border-[#dcdcdc] border-b-2 bg-white text-[10.5px] font-semibold leading-none text-[#777]"
                >
                  /
                </kbd>
              </button>
              {/* Mobile / tablet: search icon button (unchanged behavior). */}
              <button
                type="button"
                className="flex lg:hidden items-center justify-center w-11 h-11 min-w-[44px] hover:opacity-100 transition-opacity text-foreground"
                onClick={() => setIsSearchOpen(true)}
                aria-label={t('common.openSearch')}
              >
                <Search className="h-5 w-5 stroke-[2]" />
              </button>
              <button
                type="button"
                className="flex items-center justify-center w-11 h-11 min-w-[44px] lg:w-[43.1px] lg:h-[43.1px] hover:opacity-100 transition-opacity relative text-foreground"
                onClick={() => setIsCartOpen(true)}
                aria-label={t('common.cart', { count: cartCount })}
              >
                <ShoppingCart className="h-5 w-5 lg:h-[19.6px] lg:w-[19.6px] stroke-[2]" />
                {cartCount > 0 && (
                  <span
                    key={cartPopKey}
                    aria-hidden="true"
                    className="animate-pop absolute top-1 right-1 lg:top-[3.9px] lg:right-[3.9px] bg-foreground text-background text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                  >
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Bottom Row (Nav) — flat row, underline-on-hover. Items with
              `subItems` (GEL) expose a hover/focus dropdown of sub-categories. */}
          <nav
            className="hidden lg:flex items-center justify-between w-[959.2px] max-w-none -mx-[4.1px] relative top-[56.2px] -left-[0.05px]"
            aria-label={t('nav.allProducts')}
          >
            {navItems.map(item => {
              const isActive =
                pathname === item.link || !!item.subItems?.some(s => s.link === pathname);
              const trigger = (
                <Link
                  to={item.link}
                  aria-current={isActive ? 'page' : undefined}
                  aria-haspopup={item.subItems ? 'menu' : undefined}
                  // On an actual pointer click (e.detail > 0) release focus so
                  // :focus-within stops holding the dropdown open after the SPA
                  // navigates. Keyboard-triggered clicks (e.detail === 0) are
                  // left alone, preserving Tab-to-open.
                  onClick={e => {
                    if (e.detail > 0) e.currentTarget.blur();
                  }}
                  className={`flex items-center h-[28.6px] px-1 text-[11px] font-medium uppercase tracking-[0.16px] leading-[14px] text-foreground whitespace-nowrap rounded-[6px] hover:underline underline-offset-4 focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-foreground/40 ${
                    isActive ? 'underline underline-offset-4' : ''
                  }`}
                >
                  <span>{item.label}</span>
                  {item.subItems && (
                    <ChevronDown
                      aria-hidden="true"
                      className="ml-[4.4px] w-[8.8px] h-[8.8px] stroke-[2] text-[#9a9a9a] transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
                    />
                  )}
                </Link>
              );

              if (!item.subItems) {
                return <div key={item.label}>{trigger}</div>;
              }

              return (
                // The `group` + hover/focus-within drives the dropdown with no
                // extra state. A keyboard user Tabbing into the trigger or a
                // sub-link keeps focus-within true, so the panel stays open;
                // Escape blurs out of it, closing the panel.
                <div
                  key={item.label}
                  className="relative group"
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      (e.target as HTMLElement).blur?.();
                      (document.activeElement as HTMLElement | null)?.blur?.();
                    }
                  }}
                >
                  {trigger}
                  {/* `pt-2` is a transparent hover-bridge so the cursor can
                      travel from the trigger down to the panel without the
                      hover state dropping. */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 transition-all duration-200">
                    <div
                      role="menu"
                      aria-label={item.label}
                      className="min-w-[220px] bg-white border border-border/40 rounded-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] py-2 backdrop-blur-xl flex flex-col"
                    >
                      {item.subItems.map(subItem => (
                        <NavLink
                          key={subItem.label}
                          to={subItem.link}
                          end
                          role="menuitem"
                          onClick={e => {
                            if (e.detail > 0) e.currentTarget.blur();
                          }}
                          className={({ isActive: subActive }) =>
                            `mx-2 px-4 py-2.5 rounded-[10px] text-[11px] font-medium uppercase tracking-[0.16px] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
                              subActive
                                ? 'bg-tab-track text-foreground'
                                : 'text-muted-foreground hover:bg-tab-track hover:text-foreground'
                            }`
                          }
                        >
                          {subItem.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Scroll-progress line pinned to the header's bottom edge, at every
            breakpoint. Rendered as a direct child of <header> so it spans the
            full header width (edge-to-edge) rather than being clipped to the
            centred inner container — matching the prototype's `.progress` under
            `.topbar` (which shows on mobile too). */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 bottom-0 h-[2px] bg-orange origin-left pointer-events-none"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />

        <MobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          navItems={navItems}
        />
      </header>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
};
