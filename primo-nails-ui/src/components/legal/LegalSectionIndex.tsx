import { useLanguage } from '../../context/LanguageContext';

export interface LegalIndexItem {
  /** Anchor id the link jumps to (matches the section's `id`). */
  id: string;
  /** Full section heading, e.g. "1. Seller information". */
  heading: string;
}

interface LegalSectionIndexProps {
  items: LegalIndexItem[];
}

/**
 * Numbered jump-nav (table of contents) for the legal documents. Legal docs
 * ARE a numbered sequence (§1, §2 …), so a numbered anchor nav is both
 * legitimate and genuinely useful.
 *
 * The section number and its label are split out of the real heading text
 * (headings already start with "N. …"); no copy is invented — labels come
 * straight from the source strings.
 */
export function LegalSectionIndex({ items }: LegalSectionIndexProps) {
  const { language } = useLanguage();
  const label = language === 'en' ? 'Contents' : 'Indice';

  if (items.length === 0) return null;

  const list = (
    <ol className="space-y-1">
      {items.map((item) => {
        const match = /^\s*(\d+)\.\s*(.*)$/.exec(item.heading);
        const num = match ? match[1] : null;
        const text = match ? match[2] : item.heading;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="group flex gap-2.5 rounded-lg px-2 py-1.5 text-[13px] leading-snug text-muted-foreground transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {num != null && (
                <span
                  aria-hidden="true"
                  className="shrink-0 font-semibold tabular-nums text-accent-gold"
                >
                  {num.padStart(2, '0')}
                </span>
              )}
              <span className="group-hover:underline decoration-accent-gold/60 underline-offset-4">
                {text}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );

  return (
    <nav aria-label={label}>
      {/* Mobile / tablet: collapsible card. */}
      <details className="group lg:hidden rounded-[1.25rem] border border-border bg-card p-1.5 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-[1rem] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-tab-track focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          {label}
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className="h-3 w-3 text-accent-gold transition-transform duration-200 ease-out group-open:rotate-180 motion-reduce:transition-none"
          >
            <path
              d="M2 4l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>
        <div className="px-2 pb-2 pt-1">{list}</div>
      </details>

      {/* Desktop: sticky side rail. */}
      <div className="hidden lg:block lg:sticky lg:top-28">
        <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-gold">
          {label}
        </p>
        {list}
      </div>
    </nav>
  );
}
