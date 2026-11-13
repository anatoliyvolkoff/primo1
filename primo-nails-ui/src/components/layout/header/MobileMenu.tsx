import React from 'react';
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
          {navItems.map(item => (
            <div key={item.label} className="flex flex-col gap-0">
              <NavLink
                to={item.link}
                end={item.link === '/'}
                onClick={onClose}
                aria-label={item.label}
                className={({ isActive }) =>
                  `min-h-[44px] flex items-center justify-between text-[12px] font-semibold uppercase tracking-widest transition-all px-2 rounded-xl
                  ${(isActive || !!item.subItems?.some(s => s.link === pathname)) ? 'text-foreground bg-muted/50' : 'text-foreground/60 hover:text-foreground hover:bg-muted/30'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex items-center gap-3">
                      {(isActive || !!item.subItems?.some(s => s.link === pathname)) && <span aria-hidden="true" className="w-1 h-1 rounded-full bg-foreground shrink-0" />}
                      {item.label}
                    </span>
                    {item.subItems && <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />}
                  </>
                )}
              </NavLink>
              {item.subItems && (
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
              )}
            </div>
          ))}
        </nav>
      </motion.div>
    )}
  </AnimatePresence>
  );
};
