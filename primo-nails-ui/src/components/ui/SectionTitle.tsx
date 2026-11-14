import React from 'react';
import { cn } from './cn';

/**
 * Base class tokens for the section title / subtitle, exported so call sites
 * with bespoke markup (an eyebrow kicker above the title, a `dangerouslySetInnerHTML`
 * subtitle, inline `lg:` overrides) can reuse the EXACT same base instead of
 * forking the string. Keep these in sync with the `<SectionTitle>` render below.
 */
// Phones (below lg) follow the Primo1 prototype (`.h2` 30/36 medium, `.sub`
// 14/20 regular #6b6b6b) via `max-lg:`; the unprefixed desktop base is
// unchanged so call sites' `lg:` overrides keep winning.
export const SECTION_TITLE_CLASS =
  'font-sans font-medium lg:font-bold leading-none tracking-tight text-card-foreground text-[clamp(32px,6vw,48px)] ' +
  'max-lg:text-[30px] max-lg:leading-[36px] max-lg:tracking-[-0.035em] max-lg:text-balance max-lg:text-black';
export const SECTION_SUBTITLE_CLASS =
  'font-sans font-bold leading-[1.5] text-muted-foreground text-[clamp(18px,3vw,24px)] ' +
  'max-lg:font-inter max-lg:font-normal max-lg:text-[#6b6b6b] max-lg:text-[14px] max-lg:leading-[20px] max-lg:text-balance';

export interface SectionTitleProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Optional uppercase kicker rendered above the title. */
  eyebrow?: React.ReactNode;
  /** Heading level for the title element. */
  as?: 'h1' | 'h2' | 'h3';
  align?: 'center' | 'left';
  className?: string;
  /** Extra classes merged onto the title (e.g. inline `lg:` overrides). */
  titleClassName?: string;
  /** Extra classes merged onto the subtitle. */
  subtitleClassName?: string;
  id?: string;
}

/**
 * Section title / subtitle primitive.
 *
 *  - Title    → phones Montserrat Medium 30/36; desktop 48 / lh 1.0, near-black (#1D1D1F = card-foreground).
 *  - Subtitle → phones Inter 14/20 #6b6b6b (Primo1 `.sub`); desktop Bold 24 / lh 1.5, muted grey.
 *
 * Fonts follow Primo1: Montserrat site-wide, Inter for phone subtitles.
 */
export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  subtitle,
  eyebrow,
  as: Tag = 'h2',
  align = 'center',
  className,
  titleClassName,
  subtitleClassName,
  id,
}) => (
  <div className={cn('flex flex-col gap-3', align === 'center' ? 'items-center text-center' : 'items-start text-left', className)}>
    {eyebrow && (
      <span className="font-sans text-[11px] font-bold tracking-[0.3em] sm:tracking-[0.4em] uppercase text-muted-foreground">
        {eyebrow}
      </span>
    )}
    <Tag id={id} className={cn(SECTION_TITLE_CLASS, titleClassName)}>
      {title}
    </Tag>
    {subtitle && (
      <p className={cn(SECTION_SUBTITLE_CLASS, subtitleClassName)}>
        {subtitle}
      </p>
    )}
  </div>
);
