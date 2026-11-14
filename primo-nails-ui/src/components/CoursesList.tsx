import { useMemo, useState, type MouseEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCourses } from '../hooks/useCourses';
import type { UICourse } from '../hooks/useCourses';
import { PRODUCT_PLACEHOLDER } from '../lib/imageFallback';

type Translate = ReturnType<typeof useLanguage>['t'];

/**
 * HOME teaser rail — a 1:1 port of the redesign prototype's courses block
 * (`index.html` `.mn` / `.mn-list`; `css/home.css`). It is rendered ONLY for the
 * Home instance (`showAll=false`); the /corsi page keeps the Academy grid.
 *
 * Layout mirrors the prototype's two responsive states:
 *  • Mobile/tablet (`< lg`): a horizontal snap rail of 286px vertical cards
 *    (image on top, body below, dark "Scopri il corso" pill).
 *  • Desktop (`lg:`, the 1440 target): a vertical stack of wide horizontal rows
 *    — 280px 4:3 image on the LEFT, text block on the right, and a round arrow
 *    button pinned to the right that fills with the accent on hover.
 *
 * Heading is the prototype's "I corsi di Irina PriMo" (no eyebrow), sourced from
 * the dedicated bilingual `courses.railTitle` key ("I corsi di Irina PriMo" /
 * "Irina PriMo's Courses") — distinct from the /corsi page's `courses.heroEyebrow`.
 *
 * REVIEW COUNTS: the prototype shows an "N recensioni" pill, but our course
 * model carries no rating/review-count field, so we deliberately OMIT the pill
 * rather than fabricate a number. See the data-gap note in the handoff report.
 */
const CoursesHomeRail = ({
  courses,
  isLoading,
  isError,
  refetch,
  t,
}: {
  courses: UICourse[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  t: Translate;
}) => {
  // Warm/cool pastel tints cycled per card, matching the prototype `--tint`.
  const tints = ['#eef2e3', '#f4e8ee', '#f6eedf'];
  const arrow = (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 shrink-0 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );

  // Desktop: Primo1 `.courses` 112px top, 120px to the next strip.
  return (
    <section className="bg-white text-[#111] overflow-hidden pt-14 lg:pt-[112px] lg:pb-[120px] scroll-mt-24 lg:scroll-mt-28" id="courses">
      <div className="container-premium max-lg:!px-0 lg:!max-w-[976px] lg:mx-auto">
        {/* Heading — prototype `.mn-h`: left-aligned on phones, centered on
            desktop, no eyebrow. */}
        <h2 className="m-0 px-6 lg:px-0 text-left lg:text-center text-[30px] font-semibold leading-9 tracking-[-0.9px] text-[#111] text-balance lg:text-[48px] lg:leading-[52px] lg:tracking-[-1.6px]">
          {t('courses.railTitle' as any)}
        </h2>

        {/* Card rail — prototype `.mn-list`: horizontal snap scroller on mobile,
            vertical stack of wide rows on desktop. */}
        <div className="mt-6 flex gap-3.5 overflow-x-auto px-6 scroll-px-6 pt-1 pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [overscroll-behavior-x:contain] lg:mt-12 lg:flex-col lg:gap-5 lg:overflow-visible lg:px-0 lg:py-0">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex-none w-[286px] snap-start flex flex-col gap-0 p-2.5 border-[0.8px] border-[#1a1a1a] rounded-[26px] animate-pulse lg:w-auto lg:flex-row lg:items-center lg:gap-12 lg:p-3 lg:rounded-[30px]"
              >
                <div className="aspect-square w-full rounded-[18px] bg-[#F0EEEA] lg:flex-none lg:w-[280px] lg:aspect-[4/3] lg:rounded-[20px]" />
                <div className="flex flex-col gap-3 pt-4 px-2.5 pb-2.5 lg:flex-1 lg:px-0 lg:py-0 lg:pr-10">
                  <div className="h-5 w-3/4 rounded bg-[#F0EEEA]" />
                  <div className="h-3 w-full rounded bg-[#F0EEEA]" />
                  <div className="h-3 w-2/3 rounded bg-[#F0EEEA]" />
                </div>
              </div>
            ))
          ) : isError ? (
            <div className="w-full py-14 sm:py-20 text-center flex flex-col items-center gap-6">
              <p className="text-base sm:text-lg text-muted-foreground font-medium max-w-md">
                {t('catalog.loadError' as any)}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="h-12 sm:h-14 px-8 sm:px-10 bg-foreground text-background text-[10px] sm:text-[11px] font-black tracking-[0.25em] sm:tracking-[0.3em] uppercase rounded-full transition-all duration-500 hover:bg-foreground/85 shadow-lg shadow-black/10"
              >
                {t('errorBoundary.retry')}
              </button>
            </div>
          ) : (
            courses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group/mn flex-none w-[286px] snap-start flex flex-col p-2.5 border-[0.8px] border-[#1a1a1a] rounded-[26px] text-[#111] transition-[box-shadow,transform] duration-[250ms] active:scale-[0.98] lg:w-auto lg:flex-row lg:items-center lg:gap-12 lg:p-3 lg:rounded-[30px] lg:hover:-translate-y-1 lg:hover:shadow-[0_18px_36px_-24px_rgba(0,0,0,0.28)]"
              >
                {/* Image — prototype `.mn-img`: square on mobile, 280px 4:3 left
                    on desktop, with the multiply-blend crop from the prototype. */}
                <Link
                  to={`/corsi/${course.handle}`}
                  aria-label={course.title}
                  style={{ ['--tint' as string]: tints[i % tints.length] }}
                  className="relative block aspect-square w-full overflow-hidden rounded-[18px] bg-[var(--tint)] lg:flex-none lg:w-[280px] lg:aspect-[4/3] lg:rounded-[20px]"
                >
                  <img
                    src={course.image || PRODUCT_PLACEHOLDER}
                    alt={course.title}
                    loading="lazy"
                    decoding="async"
                    sizes="(min-width: 1024px) 280px, 286px"
                    className="w-full h-full object-cover object-[50%_30%] mix-blend-multiply transition-transform duration-[600ms] ease-out lg:group-hover/mn:scale-[1.05]"
                  />
                </Link>

                {/* Body — prototype `.mn-body`. On desktop it's a 2-col grid so the
                    round arrow button can pin to the right across the text rows. */}
                <div className="flex flex-1 flex-col pt-4 px-2.5 pb-2.5 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-x-8 lg:px-0 lg:py-0 lg:pr-10">
                  <h3 className="m-0 text-[20px] leading-[24px] font-bold tracking-[-0.5px] text-balance lg:col-start-1 lg:text-[28px] lg:leading-[34px] lg:tracking-[-0.8px]">
                    <Link to={`/corsi/${course.handle}`} className="transition-colors hover:text-accent-gold lg:hover:text-[#111]">
                      {course.title}
                    </Link>
                  </h3>

                  {/* Blurb — prototype `.mn-txt`. */}
                  {course.description && (
                    <p className="mt-1.5 mb-4 font-inter text-[14px] leading-[21px] text-[#555] lg:mb-0 lg:col-start-1 lg:max-w-[460px] lg:text-[15.5px] lg:leading-6">
                      {course.description}
                    </p>
                  )}

                  {/* NOTE: the prototype's "N recensioni" pill is intentionally
                      omitted — the course model has no review-count field and we
                      don't fabricate one (data gap flagged in the report). */}

                  {/* CTA — prototype `.mn-go`: dark pill on mobile; round arrow
                      button pinned to the right on desktop, accent-filled on hover. */}
                  <span
                    aria-hidden="true"
                    className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-[#111] px-5 pl-5 pr-[18px] text-[14px] font-semibold text-white h-11 lg:col-start-2 lg:row-start-1 lg:row-span-full lg:m-0 lg:h-14 lg:w-14 lg:justify-center lg:gap-0 lg:px-0 lg:text-[0px] lg:transition-colors lg:group-hover/mn:bg-[#c8742d]"
                  >
                    <span className="lg:hidden">{t('courses.cardCta')}</span>
                    <span className="lg:inline-flex lg:transition-transform lg:group-hover/mn:translate-x-[3px]">{arrow}</span>
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* "Tutti i corsi" outline CTA — prototype `.mn-all`. */}
        {!isLoading && !isError && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center mt-8 mb-14 lg:mb-0 lg:mt-14"
          >
            <Link
              to="/corsi"
              className="group/all inline-flex h-[52px] w-fit items-center justify-center gap-2 rounded-full border border-[#c9c4bf] px-7 text-[15px] font-medium text-[#111] transition-colors duration-200 hover:border-[#111] hover:bg-[#111] hover:text-white"
            >
              {t('courses.allCourses')}
              <span className="inline-flex transition-transform group-hover/all:translate-x-1">{arrow}</span>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
};

/**
 * Academy courses block. By default (Home) it teases the first 3 courses with
 * a "View full catalogue" CTA. With `showAll` (the /corsi page) it lists every
 * course and drops the catalogue buttons — which would otherwise just link the
 * courses page back to itself.
 *
 * Desktop (≥1024px) renders the redesign's 3-column grid of vertical cards with
 * a level filter + an inverted "solo" promo tile. Mobile keeps the existing
 * single-column stack of horizontal cards untouched.
 */
export const CoursesList = ({ showAll = false }: { showAll?: boolean }) => {
  const { t } = useLanguage();
  const { data: courses = [], isLoading, isError, refetch } = useCourses();
  const baseCourses = showAll ? courses : courses.slice(0, 3);

  // Level filter (desktop). Pills are derived from the distinct levels actually
  // present in the loaded data — no invented taxonomy, no backend call. The
  // empty value is "Tutti" (show all). Filtering is pure local UI state over the
  // already-fetched list; the mobile layout ignores it (shows every card).
  // NOTE: these hooks are declared unconditionally (before the Home early
  // return below) so hook order is stable across renders — the Home rail simply
  // ignores them.
  const [activeLevel, setActiveLevel] = useState('');
  const levels = useMemo(() => {
    const seen: string[] = [];
    for (const c of baseCourses) {
      const lvl = c.level?.trim();
      if (lvl && !seen.includes(lvl)) seen.push(lvl);
    }
    return seen;
  }, [baseCourses]);
  const showFilter = showAll && levels.length > 1;

  // HOME teaser only (`showAll=false`): render the redesign's horizontal rail
  // (`.mn-list`) instead of the Academy grid. The /corsi page (`showAll=true`)
  // is deliberately left on the original Academy grid below — this early return
  // keeps the two pages fully independent so this change can't touch /corsi.
  if (!showAll) {
    return (
      <CoursesHomeRail
        courses={baseCourses}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        t={t}
      />
    );
  }

  // Fetch succeeded but there's nothing to show — suppress the whole block
  // rather than render a headed section with zero cards.
  if (!isLoading && !isError && courses.length === 0) {
    return null;
  }

  const cardIsHidden = (course: UICourse) =>
    Boolean(activeLevel) && course.level?.trim() !== activeLevel;

  // Desktop solo-tile column span (prevents the dark promo tile orphaning).
  // The prototype's grid works by luck: 5 courses + the tile = 6 cells = exactly
  // two full 3-col rows, so the tile is always the bottom-right cell, a NORMAL
  // single-column card. Our live catalogue count varies (and the level filter
  // changes how many cards are VISIBLE — hidden cards use `display:none` so they
  // leave grid flow), so the tile can land as the start of a new partial row.
  // Fix: span the tile across only the REMAINING columns of that last partial
  // row so it always fills to the row's right edge without ever becoming an
  // empty full-width band. When the visible cards already fill the last row
  // exactly (`count % 3 === 0`, e.g. the live 6-course catalogue), the tile
  // starts a fresh row ALONE — it must stay a single-column card (span 1), not
  // stretch across all 3 columns. This adapts to every filter state; the value
  // is inert on mobile (the container is flex there, not a grid).
  const visibleCount = baseCourses.filter((c) => !cardIsHidden(c)).length;
  const soloTileSpan = visibleCount % 3 === 0 ? 1 : 3 - (visibleCount % 3);

  // Slow, eased in-page scroll for the "solo" promo tile, matching the
  // prototype's smooth-scroll (CSS `scroll-behavior:smooth` in academy.html).
  // scrollIntoView honours the target's `scroll-margin-top` so it clears the
  // fixed header; 'auto' under prefers-reduced-motion. The href stays intact
  // for keyboard/no-JS navigation. No-ops on pages without the target (Home).
  const handleSoloScroll = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById('solo');
    if (!el) return;
    e.preventDefault();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <section className="bg-white text-[#1d1d1f] overflow-hidden pt-14 lg:pt-[88px] lg:pb-0 scroll-mt-24 lg:scroll-mt-28" id="courses">
      <div className="container-premium lg:!max-w-[976px] lg:mx-auto">
        {/* Heading — centered on mobile (unchanged); left, with filter pills to
            the right, on desktop (prototype flex-end space-between row). */}
        {/* Primo1 `.acad-head`: eyebrow + title, level pills (a scroll row on phones, right-aligned on desktop). */}
        <div className="max-lg:px-2 lg:flex lg:items-end lg:justify-between lg:gap-8">
          <div className="text-left">
            <div className="flex flex-col items-start">
                            <span className="block font-sans text-[11px] leading-4 font-bold tracking-[1.8px] uppercase text-[#c8742d]">{t('courses.listEyebrow')}</span>
              <h2 className="mt-2 text-[30px] leading-9 font-semibold tracking-[-0.9px] text-[#111] text-balance lg:text-[38px] lg:leading-[44px] lg:tracking-[-1.2px]">
                {t('courses.listHeading')}
              </h2>
            </div>
          </div>

          {/* Level filter pills — DESKTOP only. */}
          {showFilter && (
            <div
              role="group"
              aria-label={t('courses.filterLabel')}
              className="flex gap-2 mt-5 -mx-6 px-6 overflow-x-auto no-scrollbar lg:mt-0 lg:mx-0 lg:px-0 lg:overflow-visible lg:flex-none"
            >
              {['', ...levels].map((lvl) => {
                const pressed = activeLevel === lvl;
                return (
                  <button
                    key={lvl || '__all'}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => setActiveLevel(lvl)}
                    className={`flex-none h-[38px] px-[18px] rounded-full border text-[13.5px] font-semibold transition-colors duration-200 ${
                      pressed
                        ? 'bg-[#111] border-[#111] text-white'
                        : 'bg-white border-[#e6e1dc] text-[#555] hover:border-[#111] hover:text-[#111]'
                    }`}
                  >
                    {lvl || t('courses.filterAll')}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Card list. Mobile: single-column stack of horizontal cards (unchanged).
            Desktop: 3-column grid of vertical cards + solo tile, mirroring the
            prototype `academy.css .acad-cards` (`grid-template-columns:repeat(3,1fr)`,
            NO `grid-auto-rows`). Rows auto-size to their content and grid's
            default per-row `align-items:stretch` equalises cards WITHIN a row —
            but a tile that lands ALONE in a fresh last row (e.g. the live
            6-course catalogue) stays a normal card height instead of being
            forced to a full `1fr` track and rendering as an over-tall band. The
            solo tile's column span (above) keeps it filling its partial row. */}
        <div className={`flex flex-col mx-auto lg:max-w-none lg:grid lg:grid-cols-3 lg:gap-6 lg:mt-9 ${showAll ? 'gap-3 mt-5 max-lg:px-2' : 'gap-5 sm:gap-6 max-w-5xl'}`}>
          {isLoading ? (
            // Skeleton placeholders mirroring the card layout while the fetch runs.
            // Academy (showAll) → compact horizontal skeleton; Home teaser → the
            // original stacked skeleton. Both collapse to the shared desktop grid.
            Array.from({ length: 3 }).map((_, i) =>
              showAll ? (
              <div
                key={i}
                className="grid grid-cols-[108px_minmax(0,1fr)] items-center gap-4 bg-white border border-[#e6e1dc] p-2.5 pr-3.5 rounded-[22px] animate-pulse lg:flex lg:flex-col lg:items-stretch lg:gap-0 lg:p-2.5 lg:rounded-[28px]"
              >
                <div className="self-stretch aspect-square rounded-[16px] bg-[#F0EEEA] lg:w-full lg:aspect-[4/3] lg:rounded-[20px]" />
                <div className="min-w-0 flex flex-col gap-2.5 lg:w-full lg:px-3 lg:pt-[18px] lg:pb-2.5">
                  <div className="h-2.5 w-1/3 rounded bg-[#F0EEEA]" />
                  <div className="h-4 w-3/4 rounded bg-[#F0EEEA]" />
                  <div className="h-3 w-2/3 rounded bg-[#F0EEEA]" />
                  <div className="mt-2 h-3 w-full rounded bg-[#F0EEEA]" />
                </div>
              </div>
              ) : (
              <div
                key={i}
                className="bg-white border border-black/5 rounded-[1.25rem] sm:rounded-[1.5rem] overflow-hidden flex flex-col md:flex-row items-stretch animate-pulse lg:rounded-[28px] lg:flex-col lg:p-2.5"
              >
                <div className="flex flex-col w-full md:w-[58%] p-6 sm:p-8 md:pl-10 gap-4 order-2 md:order-1 lg:w-full lg:order-2 lg:p-3">
                  <div className="h-8 w-3/4 rounded-lg bg-[#F0EEEA]" />
                  <div className="h-3 w-2/3 rounded bg-[#F0EEEA]" />
                  <div className="h-3 w-1/2 rounded bg-[#F0EEEA]" />
                  <div className="mt-4 h-10 w-32 rounded-full bg-[#F0EEEA]" />
                </div>
                <div className="w-full md:w-[42%] aspect-[16/9] md:aspect-[4/3] bg-[#F0EEEA] order-1 md:order-2 lg:w-full lg:order-1 lg:rounded-[20px]" />
              </div>
              ),
            )
          ) : isError ? (
            <div className="py-14 sm:py-20 text-center flex flex-col items-center gap-6 lg:col-span-3">
              <p className="text-base sm:text-lg text-muted-foreground font-medium max-w-md">
                {t('catalog.loadError' as any)}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="h-12 sm:h-14 px-8 sm:px-10 bg-foreground text-background text-[10px] sm:text-[11px] font-black tracking-[0.25em] sm:tracking-[0.3em] uppercase rounded-full transition-all duration-500 hover:bg-foreground/85 shadow-lg shadow-black/10"
              >
                {t('errorBoundary.retry')}
              </button>
            </div>
          ) : (
            baseCourses.map((course, i) => {
            // Single calendar meta line matching the Academy prototype `.ac-meta`
            // ("date · N lezioni"). The course data has no numeric lesson count,
            // so we approximate it from the fields that DO exist: the start date
            // (day + month) and the free-text `duration`. We never fabricate a date
            // or lesson count — each half is included only when present, joined by
            // " · ", and the whole line is dropped when both are missing.
            // FLAG (data): per-course start dates and a numeric lesson count are not
            // in the course model yet; `duration` is a free-text stand-in.
            const metaText = [
              course.nextDates ? `${course.nextDates.day} ${course.nextDates.month}` : '',
              course.duration?.trim(),
            ]
              .filter((part): part is string => Boolean(part && part.trim()))
              .join(' · ');
            // Legacy grey meta lines used by the HOME teaser mobile layout only.
            const metaLines = [
              [course.level, t('courses.academyLabel')].filter(Boolean).join(' · '),
              course.duration,
            ].filter((line): line is string => Boolean(line && line.trim()));
            // Per-card tint for the desktop multiply photo frame (prototype
            // cycles three warm/cool pastels). Purely presentational.
            const tint = ['#eef2e3', '#f4e8ee', '#f6eedf'][i % 3];

            // Two mobile/tablet layouts share the SAME desktop (`lg:`) grid card:
            //  • Academy (`/corsi`, showAll) → the prototype `.acard`: compact
            //    horizontal card, square image LEFT, meta + footer rating/Details.
            //  • Home teaser (showAll=false) → the original stacked card: image
            //    RIGHT, star row on top, grey meta lines, outline "Explore" pill.
            // The `lg:` appearance is identical in both so the desktop grid never
            // changes between pages.
            return showAll ? (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              hidden={cardIsHidden(course) ? true : undefined}
              className="group relative grid grid-cols-[108px_minmax(0,1fr)] items-center gap-4 bg-white p-2.5 pr-3.5 rounded-[22px] transition-all duration-300 border border-[#e6e1dc] hover:border-[#cfc8c1] hover:shadow-[0_18px_36px_-24px_rgba(0,0,0,0.28)] lg:flex lg:flex-col lg:items-stretch lg:gap-0 lg:p-2.5 lg:rounded-[28px] lg:hover:-translate-y-1 lg:[&[hidden]]:hidden"
            >
              {/* Nail-art image — square on the LEFT on mobile/tablet (prototype
                  `.ac-img`, aspect 1:1, radius 16px); full-width on TOP on desktop. */}
              <Link
                to={`/corsi/${course.handle}`}
                aria-label={course.title}
                style={{ ['--tint' as string]: tint }}
                className="relative block self-stretch aspect-square overflow-hidden rounded-[16px] bg-[#F9F8F6] lg:w-full lg:aspect-[4/3] lg:rounded-[20px]"
              >
                <img
                  src={course.image || PRODUCT_PLACEHOLDER}
                  alt={course.title}
                  loading="lazy"
                  decoding="async"
                  sizes="(min-width: 1024px) 300px, 108px"
                  className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500 ease-out"
                />
              </Link>

              {/* Text block — to the RIGHT of the image on mobile; below the photo on
                  desktop as a flex column whose footer pins to the card bottom.
                  min-w-0 lets the grid/flex child shrink so long EN strings wrap
                  instead of overflowing the card. */}
              <div className="relative z-10 min-w-0 flex flex-col lg:flex-1 lg:py-0 lg:px-3 lg:pt-[18px] lg:pb-2.5">
                {/* Uppercase accent level/tag label (prototype `.ac-lvl`). */}
                {(course.tag || course.level) && (
                  <p className="font-sans text-[10.5px] font-bold tracking-[1.5px] uppercase text-[#c8742d] leading-[14px]">
                    {course.tag || course.level}
                  </p>
                )}

                <h3 className="mt-1 text-[17px] leading-[21px] font-semibold tracking-[-0.3px] text-[#111] lg:mt-1.5 lg:text-[21px] lg:leading-[26px]">
                  <Link to={`/corsi/${course.handle}`} className="hover:text-accent-gold transition-colors lg:hover:text-[#111]">
                    {course.title}
                  </Link>
                </h3>

                {/* Desktop-only description line (prototype `.ac-txt`), clamped to
                    two lines so longer EN copy can't push the footer around. */}
                {course.description && (
                  <p className="hidden lg:block lg:mt-2 text-[14px] leading-[21px] text-[#666] line-clamp-2">
                    {course.description}
                  </p>
                )}

                {/* Meta line (prototype `.ac-meta`): calendar + date · lessons.
                    Built only from existing fields; the whole line is suppressed
                    when the course has neither a date nor a duration. */}
                {metaText && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[13px] leading-[18px] text-[#666] lg:mt-3.5 lg:mb-4 lg:text-[13.5px]">
                    <Calendar className="w-[15px] h-[15px] shrink-0 text-[#111]" strokeWidth={1.7} />
                    <span className="min-w-0">{metaText}</span>
                  </p>
                )}

                {/* Footer (prototype `.ac-foot`): "Details →" affordance, pinned
                    to the right. Shown on BOTH mobile and desktop; the hairline
                    top border is desktop-only (prototype). The whole card is a
                    link — this is a visual affordance. The prototype's rating is
                    omitted — the course model has no rating/review field and we
                    don't fabricate one. */}
                <div className="mt-2 flex items-center justify-end gap-x-2 lg:mt-auto lg:pt-4 lg:border-t lg:border-[#e6e1dc]">
                  <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[12.5px] font-semibold text-[#111]">
                    {t('courses.details')}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[3px]" strokeWidth={2} />
                  </span>
                </div>
              </div>
            </motion.div>
            ) : (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              hidden={cardIsHidden(course) ? true : undefined}
              className="group relative bg-white rounded-[1.25rem] sm:rounded-[1.5rem] overflow-hidden transition-all duration-500 flex flex-col md:flex-row items-stretch hover:shadow-[0_18px_50px_-20px_rgba(0,0,0,0.12)] border border-black/[0.07] hover:border-accent-gold hover:ring-1 hover:ring-accent-gold/30 lg:flex-col lg:items-stretch lg:gap-0 lg:p-2.5 lg:rounded-[28px] lg:border lg:border-[#e6e1dc] lg:hover:border-[#cfc8c1] lg:hover:ring-0 lg:hover:-translate-y-1 lg:hover:shadow-[0_18px_36px_-24px_rgba(0,0,0,0.28)] lg:[&[hidden]]:hidden"
            >
              {/* Nail-art image — RIGHT on mobile/tablet, TOP on desktop. */}
              <Link
                to={`/corsi/${course.handle}`}
                aria-label={course.title}
                style={{ ['--tint' as string]: tint }}
                className="relative block w-full md:w-[42%] aspect-[16/9] md:aspect-[4/3] overflow-hidden bg-[#F9F8F6] order-1 md:order-2 lg:w-full lg:order-1 lg:rounded-[20px]"
              >
                <img
                  src={course.image || PRODUCT_PLACEHOLDER}
                  alt={course.title}
                  loading="lazy"
                  decoding="async"
                  sizes="(min-width: 1024px) 300px, (min-width: 768px) 42vw, 100vw"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out lg:duration-500 lg:group-hover:scale-[1.05]"
                />
                {course.tag && (
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-accent-gold text-foreground text-[9px] font-black tracking-widest uppercase shadow-sm lg:hidden">
                    {course.tag}
                  </span>
                )}
              </Link>

              {/* Text block — BELOW the image on mobile; below the photo on
                  desktop as a flex column whose footer pins to the card bottom. */}
              <div className="relative z-10 flex flex-col w-full md:w-[58%] px-6 sm:px-8 md:pl-10 lg:px-3 py-6 sm:py-8 order-2 md:order-1 lg:order-2 lg:flex-1 lg:py-0 lg:pt-[18px] lg:pb-2.5">
                {/* Uppercase accent level label — DESKTOP only. */}
                {course.level && (
                  <p className="hidden lg:block font-sans text-[10.5px] font-bold tracking-[1.5px] uppercase text-[#c8742d] leading-[14px]">
                    {course.tag || course.level}
                  </p>
                )}

                <h3 className="text-[clamp(20px,3vw,28px)] font-bold tracking-tight text-[#1d1d1f] leading-[1.15] mb-3 lg:mt-1.5 lg:mb-0 lg:text-[21px] lg:leading-[26px] lg:font-semibold lg:tracking-[-0.3px]">
                  <Link to={`/corsi/${course.handle}`} className="hover:text-accent-gold transition-colors lg:hover:text-[#1d1d1f]">
                    {course.title}
                  </Link>
                </h3>

                {/* Desktop description line (prototype `.ac-txt`). */}
                {course.description && (
                  <p className="hidden lg:block lg:mt-2 text-[14px] leading-[21px] text-[#666] line-clamp-2">
                    {course.description}
                  </p>
                )}

                {/* Small grey meta lines — MOBILE only (desktop uses the date meta). */}
                {metaLines.length > 0 && (
                  <div className="space-y-1 mb-4 lg:hidden">
                    {metaLines.map((line, j) => (
                      <p key={j} className="text-[11px] sm:text-xs text-muted-foreground font-medium tracking-wide">
                        {line}
                      </p>
                    ))}
                  </div>
                )}

                {/* Start-date meta — only when the course actually carries one. */}
                {course.nextDates && (
                  <div className="flex items-center gap-2 mb-6 text-[#1d1d1f] lg:mt-3.5 lg:mb-0 lg:text-[#666]">
                    <Calendar className="w-4 h-4 text-muted-foreground lg:w-[15px] lg:h-[15px] lg:text-[#111]" strokeWidth={1.75} />
                    <span className="text-xs sm:text-sm font-semibold tracking-wide lg:text-[13.5px] lg:font-normal">
                      {course.nextDates.day} {course.nextDates.month}
                      {course.duration ? ` · ${course.duration}` : ''}
                    </span>
                  </div>
                )}

                {/* Small outline CTA pill — MOBILE/tablet. Reuses the existing
                    `courses.explore` key ("Scopri"/"Explore"). */}
                <div className="mt-auto pt-2 flex lg:hidden">
                  <Link
                    to={`/corsi/${course.handle}`}
                    className="inline-flex items-center justify-center gap-2 h-10 px-7 rounded-pill border border-primary bg-transparent text-primary text-xs font-sans font-medium tracking-widest uppercase transition-[background-color,color] duration-200 hover:bg-primary hover:text-primary-foreground active:scale-[0.98] group/btn"
                  >
                    {t('courses.explore')} <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* DESKTOP footer — "Dettagli" affordance, pinned to the card
                    bottom. The prototype's rating is omitted (no rating/review
                    field on the course model; we don't fabricate one). */}
                <div className="hidden lg:flex lg:items-center lg:justify-end lg:gap-2 lg:mt-auto lg:pt-4 lg:border-t lg:border-[#e6e1dc]">
                  <span aria-hidden="true" className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold text-[#111]">
                    {t('courses.details')}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[3px]" strokeWidth={2} />
                  </span>
                </div>
              </div>
            </motion.div>
            );
            })
          )}

          {/* Inverted "solo" promo tile — DESKTOP only, last grid cell. Stays
              visible across all filters. Scrolls to the individual-training
              section (#solo). `gridColumn: span N` fills the remaining columns of
              the last partial row so the tile never orphans as a lonely narrow
              cell (see `soloTileSpan` above). The inline span is inert on mobile,
              where the container is a flex column rather than a CSS grid. */}
          {showAll && !isLoading && !isError && (
            <a
              href="#solo"
              onClick={handleSoloScroll}
              style={{ gridColumn: `span ${soloTileSpan}` }}
              className="grid grid-cols-[1fr_auto] items-center gap-4 pt-5 pb-5 pl-[22px] pr-5 rounded-[22px] bg-[#111] text-white border border-[#111] lg:flex lg:flex-col lg:items-stretch lg:justify-between lg:p-[30px] lg:rounded-[28px] lg:transition-transform lg:duration-300 lg:hover:-translate-y-1 group/solo"
            >
              <div>
                <p className="font-sans text-[10.5px] font-bold tracking-[1.5px] uppercase text-[#e2a46d] leading-[14px]">
                  {t('courses.soloTileEyebrow')}
                </p>
                <h3 className="mt-1 text-[17px] leading-[21px] tracking-[-0.3px] lg:mt-2 lg:text-[26px] lg:leading-[31px] font-semibold lg:tracking-[-0.6px] text-white">
                  {t('courses.soloTileTitle')}
                </h3>
                <p className="mt-1.5 font-inter text-[13.5px] leading-5 lg:font-sans lg:text-[15px] lg:leading-[23px] text-[#c9c4bf]">
                  {t('courses.soloTileBody')}
                </p>
              </div>
              <span
                aria-hidden="true"
                className="inline-grid place-items-center w-11 h-11 lg:mt-6 lg:w-[52px] lg:h-[52px] rounded-full bg-white text-[#111]"
              >
                <ArrowRight className="w-[18px] h-[18px] transition-transform group-hover/solo:translate-x-[3px]" strokeWidth={2} />
              </span>
            </a>
          )}
        </div>

        {!showAll && !isLoading && !isError && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center mt-14 sm:mt-20 md:mt-24 lg:mt-14"
          >
            {/* Outline "view full catalogue" pill — kept as a react-router Link
                to preserve client-side nav to the courses list. */}
            <Link
              to="/corsi"
              className="group inline-flex items-center justify-center gap-2 h-12 px-8 rounded-pill border border-primary bg-transparent text-primary text-sm font-sans font-medium uppercase tracking-widest transition-[background-color,color] duration-200 hover:bg-primary hover:text-primary-foreground active:scale-[0.98] lg:h-[52px] lg:border-[#c9c4bf] lg:text-[#111] lg:normal-case lg:tracking-normal lg:hover:bg-[#111] lg:hover:border-[#111] lg:hover:text-white"
            >
              {t('courses.viewFullCatalog')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
};
