import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export type SortOption = 'popularity' | 'newest' | 'price-asc' | 'price-desc';

interface SortControlProps {
  currentSort: SortOption;
  onSortChange: (option: SortOption) => void;
}

export const SortControl: React.FC<SortControlProps> = ({ currentSort, onSortChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = 'sort-control-listbox';
  const { t } = useLanguage();

  const closeAndRefocus = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Order matches the client prototype's sort menu:
  // Popolarità / Novità / Prezzo crescente / Prezzo decrescente (no name sort).
  const sortOptions = [
    { id: 'popularity' as SortOption, label: t('sort.popularity') },
    { id: 'newest' as SortOption, label: t('sort.newest') },
    { id: 'price-asc' as SortOption, label: t('sort.priceAsc') },
    { id: 'price-desc' as SortOption, label: t('sort.priceDesc') },
  ];

  const currentLabel = sortOptions.find(opt => opt.id === currentSort)?.label || t('sort.popularity');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // z above the FilterBar dropdown (z-100) so the order-by menu isn't covered
  // when the filters panel is open at the same time.
  return (
    <div
      className="relative z-[120]"
      ref={dropdownRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && isOpen) {
          e.stopPropagation();
          closeAndRefocus();
        }
      }}
    >
      {/* Trigger — prototype `.sort-btn`: `Ordina per: <b>{label}</b>`, 41.6px
          tall, radius 21px, 1px #e6e6e6, centred, min-width ~230px on desktop.
          Mobile keeps the compact pill so it fits the filter bar row. */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`${t('sort.label')} ${currentLabel}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={menuId}
        className="group flex items-center justify-center gap-2 sm:gap-2.5 bg-white border border-border lg:border-[#e6e6e6] px-3 sm:px-5 lg:px-[20px] py-2.5 lg:py-0 rounded-full lg:rounded-[21px] shadow-sm hover:shadow-md hover:border-black transition-all duration-300 min-h-[44px] lg:min-h-0 lg:h-[41.6px] lg:min-w-[230px]"
      >
        <span className="hidden sm:inline text-[10px] lg:text-[11.5px] font-black lg:font-semibold uppercase lg:normal-case tracking-[0.2em] lg:tracking-normal text-muted-foreground lg:text-[#1a1a1a] group-hover:text-black transition-colors">{t('sort.label')}</span>
        <span className="text-[10px] sm:text-xs lg:text-[11.5px] font-bold lg:font-medium uppercase lg:normal-case tracking-widest lg:tracking-normal text-foreground lg:text-[#1a1a1a] max-w-[80px] sm:max-w-none truncate">{currentLabel}</span>
        <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
        >
            <ChevronDown className="w-4 h-4 lg:w-[15px] lg:h-[15px]" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            id={menuId}
            role="listbox"
            aria-label={t('sort.label')}
            className="absolute top-[calc(100%+6px)] right-0 min-w-[220px] lg:min-w-full bg-white border border-border lg:border-[#e6e6e6] shadow-2xl lg:shadow-[0_14px_40px_rgba(0,0,0,0.14)] rounded-3xl lg:rounded-[14px] p-2 lg:p-1.5 overflow-hidden"
          >
            {/* Options — prototype listbox: 13px, hover/selected #f3f3f3,
                selected also 700 weight (no black fill, no per-option icons). */}
            {sortOptions.map((option) => (
              <button
                key={option.id}
                role="option"
                aria-selected={currentSort === option.id}
                onClick={() => {
                  onSortChange(option.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-start px-4 py-3 lg:px-[14px] lg:py-[10px] rounded-2xl lg:rounded-[9px] text-xs lg:text-[13px] uppercase lg:normal-case tracking-widest lg:tracking-normal whitespace-nowrap transition-all duration-200 ${
                  currentSort === option.id
                    ? 'bg-black lg:bg-[#f3f3f3] text-white lg:text-[#1a1a1a] font-bold lg:font-bold'
                    : 'hover:bg-[#F5F5F7] lg:hover:bg-[#f3f3f3] text-muted-foreground lg:text-[#1a1a1a] hover:text-foreground font-bold lg:font-medium'
                }`}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
