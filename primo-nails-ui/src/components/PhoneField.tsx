import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import {
  AsYouType,
  isValidPhoneNumber,
  parsePhoneNumber,
  type CountryCode,
} from 'libphonenumber-js';
import { getCountryOptions, type CountryOption } from '../lib/countries';
import { useLanguage } from '../context/LanguageContext';

export interface PhoneValue {
  country: CountryCode;
  /** What the user typed (formatted as-you-type for display). */
  national: string;
  /** Full E.164 number ("+39…") when valid, else "". */
  e164: string;
  isValid: boolean;
}

export const emptyPhone = (country: CountryCode = 'IT'): PhoneValue => ({
  country,
  national: '',
  e164: '',
  isValid: false,
});

interface PhoneFieldProps {
  value: PhoneValue;
  onChange: (v: PhoneValue) => void;
  invalid?: boolean;
  placeholder?: string;
  locale?: string;
  labelId?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}

/**
 * Phone input with a country flag / dial-code picker. Validation and
 * formatting come from libphonenumber-js; the UI is fully custom so it
 * matches the PriMo storefront (white pill, gold focus, cream dropdown).
 */
export function PhoneField({
  value,
  onChange,
  invalid,
  placeholder,
  locale = 'it',
  labelId,
  searchPlaceholder,
  emptyText,
}: PhoneFieldProps) {
  const { t } = useLanguage();
  const searchPlaceholderText = searchPlaceholder ?? t('phoneField.searchCountry');
  const emptyTextText = emptyText ?? t('phoneField.noMatches');
  const options = useMemo(() => getCountryOptions(locale), [locale]);
  // Fall back to Italy (the store's home market) rather than the alphabetical
  // first option when a stored country code doesn't match any option (LB146-3).
  const current =
    options.find((o) => o.code === value.country) ??
    options.find((o) => o.code === 'IT') ??
    options[0];

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    // Focus the search box when the list opens.
    const id = window.setTimeout(() => searchRef.current?.focus(), 20);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
      window.clearTimeout(id);
    };
  }, [open]);

  const recompute = (country: CountryCode, raw: string): PhoneValue => {
    const national = new AsYouType(country).input(raw);
    let e164 = '';
    let isValid = false;
    try {
      if (raw.trim()) {
        isValid = isValidPhoneNumber(raw, country);
        if (isValid) e164 = parsePhoneNumber(raw, country)?.number ?? '';
      }
    } catch {
      isValid = false;
    }
    return { country, national, e164, isValid };
  };

  const pickCountry = (code: CountryCode) => {
    onChange(recompute(code, value.national));
    setOpen(false);
    setQuery('');
  };

  const filtered = query.trim()
    ? options.filter((o) => {
        const q = query.trim().toLowerCase();
        const digits = q.replace(/[^0-9]/g, '');
        return (
          o.name.toLowerCase().includes(q) ||
          o.code.toLowerCase().includes(q) ||
          (digits !== '' && o.dialCode.startsWith(digits))
        );
      })
    : options;

  return (
    <div ref={wrapRef} className="relative">
      <div
        className={`flex items-stretch bg-white border-2 rounded-full overflow-hidden transition-all ${
          invalid
            ? 'border-destructive'
            : 'border-black/10 focus-within:border-brand-accent'
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${current?.name} (+${current?.dialCode})`}
          className="flex items-center gap-1.5 pl-4 pr-3 shrink-0 hover:bg-black/[0.03] transition-colors focus-visible:outline-none focus-visible:bg-black/[0.03]"
        >
          <span className="text-[18px] leading-none">{current?.flag}</span>
          <span className="text-[14px] sm:text-[15px] font-semibold text-foreground tabular-nums">
            +{current?.dialCode}
          </span>
          <ChevronDown className={`w-4 h-4 text-black/40 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <span className="w-px my-2 bg-black/10 shrink-0" aria-hidden="true" />
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          aria-labelledby={labelId}
          aria-invalid={invalid || undefined}
          value={value.national}
          placeholder={placeholder}
          onChange={(e) => onChange(recompute(value.country, e.target.value))}
          className="flex-1 min-w-0 bg-transparent px-4 py-3 sm:py-4 text-[14px] sm:text-[15px] outline-none placeholder:text-gray-400 font-medium"
        />
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute z-30 mt-2 w-full sm:w-[340px] max-w-[calc(100vw-3rem)] bg-surface border border-black/10 rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.25)] overflow-hidden"
        >
          <div className="p-3 border-b border-black/5">
            <div className="flex items-center gap-2 bg-white border border-black/10 rounded-full px-4 py-2.5">
              <Search className="w-4 h-4 text-black/40 shrink-0" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholderText}
                className="flex-1 min-w-0 bg-transparent outline-none text-[14px] font-medium placeholder:text-gray-400"
              />
            </div>
          </div>
          <ul className="max-h-[240px] overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-5 py-4 text-[13px] text-black/50 text-center">{emptyTextText}</li>
            )}
            {filtered.map((o: CountryOption) => (
              <li key={o.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.code === value.country}
                  onClick={() => pickCountry(o.code)}
                  className={`w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-black/[0.04] transition-colors ${
                    o.code === value.country ? 'bg-brand-accent/10' : ''
                  }`}
                >
                  <span className="text-[18px] leading-none shrink-0">{o.flag}</span>
                  <span className="flex-1 min-w-0 truncate text-[14px] font-medium text-foreground">{o.name}</span>
                  <span className="text-[13px] text-black/50 tabular-nums shrink-0">+{o.dialCode}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
