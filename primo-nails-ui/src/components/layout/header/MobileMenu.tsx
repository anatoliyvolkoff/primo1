import React, { useEffect, useId, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useScrollLock } from '../../../lib/scrollLock';

interface SubItem {
  label: string;
  link: string;
}

interface NavItem {
  label: string;
  link: string;
  subItems?: SubItem[];
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, navItems }) => {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  useScrollLock(isOpen);
  return (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        id="mobile-menu"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="lg:hidden bg-background border-t border-border overflow-y-auto"
        style={{ maxHeight: 'calc(100dvh - 60px)' }}
      >
        <nav
          aria-label={t('a11y.mobileNav' as any)}
          className="container-premium py-4 sm:py-6 flex flex-col gap-1"
        >
          {navItems.map((item, i) => (
            // Rows slide in one after another as the menu opens (index.css `.mi-menu-row`).
            <div key={item.label} className="mi-menu-row" style={{ '--i': i } as React.CSSProperties}>
              <MobileNavRow item={item} pathname={pathname} onClose={onClose} />
            </div>
          ))}
        </nav>
      </motion.div>
    )}
  </AnimatePresence>
  );
};


const ROW_CLASS =
  'min-h-[44px] flex items-center text-[12px] font-semibold uppercase tracking-widest transition-all px-2 rounded-xl active:bg-muted/60 [-webkit-tap-highlight-color:transparent]';

const MobileNavRow: React.FC<{ item: NavItem; pathname: string; onClose: () => void }> = ({
  item,
  pathname,
  onClose,
}) => {
  const { language } = useLanguage();
  const inSection = !!item.subItems?.some(s => s.link === pathname);
  // A section starts expanded only when the current page is inside it; the
  // chevron toggles it without navigating (the label still navigates).
  const [expanded, setExpanded] = useState(inSection);
  useEffect(() => {
    if (inSection) setExpanded(true);
  }, [inSection]);
  const submenuId = useId();

  if (!item.subItems) {
    return (
      <NavLink
        to={item.link}
        end={item.link === '/'}
        onClick={onClose}
        aria-label={item.label}
        className={({ isActive }) =>
          `${ROW_CLASS} ${isActive ? 'text-foreground bg-muted/50' : 'text-foreground/60 hover:text-foreground hover:bg-muted/30'}`
        }
      >
        {({ isActive }) => (
          <span className="flex items-center gap-3">
            {isActive && <span aria-hidden="true" className="w-1 h-1 rounded-full bg-foreground shrink-0" />}
            {item.label}
          </span>
        )}
      </NavLink>
    );
  }

  const toggleLabel =
    language === 'en'
      ? `${expanded ? 'Collapse' : 'Expand'} ${item.label}`
      : `${expanded ? 'Comprimi' : 'Espandi'} ${item.label}`;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-stretch">
        <NavLink
          to={item.link}
          end
          onClick={onClose}
          aria-label={item.label}
          className={({ isActive }) =>
            `${ROW_CLASS} flex-1 min-w-0 ${(isActive || inSection) ? 'text-foreground bg-muted/50' : 'text-foreground/60 hover:text-foreground hover:bg-muted/30'}`
          }
        >
          {({ isActive }) => (
            <span className="flex items-center gap-3">
              {(isActive || inSection) && <span aria-hidden="true" className="w-1 h-1 rounded-full bg-foreground shrink-0" />}
              {item.label}
            </span>
          )}
        </NavLink>
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          aria-controls={submenuId}
          aria-label={toggleLabel}
          data-testid="mobile-submenu-toggle"
          className="shrink-0 w-14 min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-[color,background-color,scale] active:scale-90"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={submenuId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-0 pl-4 border-l border-border/50 ml-2 mt-0.5 mb-1">
              {item.subItems.map(subItem => (
                <NavLink
                  key={subItem.label}
                  to={subItem.link}
                  end
                  onClick={onClose}
                  aria-label={subItem.label}
                  className={({ isActive }) =>
                    `min-h-[40px] flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest transition-colors px-2 rounded-lg ${
                      isActive ? 'text-foreground bg-muted/50' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span aria-hidden="true" className="w-1 h-1 rounded-full bg-foreground shrink-0" />}
                      {subItem.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
