import type { FC } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { ITALIAN_PROVINCES } from '../../data/italianProvinces';

interface ProvinceSelectProps {
  id: string;
  value: string;                 // ISO 3166-2 code, e.g. "it-mi"
  invalid?: boolean;
  onChange: (code: string) => void;
  onBlur?: () => void;
}

/**
 * Searchable Italian-province dropdown, styled to match CountrySelect.
 * Stores the lower-case ISO 3166-2 code (e.g. "it-mi") so it matches Medusa's
 * province-level shipping zones; the label shows the full name + 2-letter code.
 * Only rendered for Italian addresses.
 */
export const ProvinceSelect: FC<ProvinceSelectProps> = ({ id, value, invalid, onChange, onBlur }) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => ITALIAN_PROVINCES.find(p => p.code === value), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ITALIAN_PROVINCES;
    return ITALIAN_PROVINCES.filter(
      p => p.name.toLowerCase().includes(q) || p.abbr.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    const tmr = setTimeout(() => searchRef.current?.focus(), 30);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      clearTimeout(tmr);
    };
  }, [open, onBlur]);

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        className={`w-full h-[52px] rounded-pill border bg-surface px-5 text-[15px] text-foreground outline-none transition-[border-color,background-color,box-shadow] duration-200 hover:border-[#c9c4bf] focus-visible:border-foreground focus-visible:bg-card focus-visible:ring-[3px] focus-visible:ring-foreground/10 flex items-center justify-between gap-2 text-left ${
          invalid ? 'border-destructive bg-card' : 'border-[#e6e1dc]'
        }`}
      >
        <span className={`truncate ${selected ? '' : 'text-muted-foreground'}`}>
          {selected ? `${selected.name} (${selected.abbr})` : t('checkout.provinceSelect' as any)}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 top-full mt-2 z-50 bg-popover text-popover-foreground border border-border rounded-[16px] shadow-elevated overflow-hidden"
          >
            <div className="p-2 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t('checkout.provinceSearch' as any)}
                  className="w-full h-10 pl-10 pr-4 rounded-[12px] bg-muted border border-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring text-sm"
                />
              </div>
            </div>
            <ul role="listbox" aria-label={t('checkout.province' as any)} className="max-h-60 overflow-y-auto py-1.5 custom-scrollbar">
              {filtered.length === 0 && (
                <li className="px-4 py-3 text-sm text-muted-foreground">{t('checkout.countryNoMatch' as any)}</li>
              )}
              {filtered.map(p => {
                const isSel = p.code === value;
                return (
                  <li key={p.code} role="option" aria-selected={isSel}>
                    <button
                      type="button"
                      onClick={() => { onChange(p.code); setOpen(false); setQuery(''); }}
                      className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors ${
                        isSel ? 'bg-muted text-foreground font-semibold' : 'text-foreground/80 hover:bg-muted'
                      }`}
                    >
                      <span className="truncate">{p.name} <span className="text-muted-foreground">({p.abbr})</span></span>
                      {isSel && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
