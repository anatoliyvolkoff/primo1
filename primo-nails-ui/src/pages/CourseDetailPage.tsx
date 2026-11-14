import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    Clock,
    ChevronLeft,
    ChevronRight,
    Check,
    Plus,
    MessageCircle,
    Sparkles,
    Calendar,
    CreditCard,
    GraduationCap,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSeo } from '../lib/useSeo';
import { courseJsonLd, toMetaDescription } from '../lib/seo';
import { useCourse } from '../hooks/useCourses';
import { useStoreSetting } from '../hooks/useStoreContent';
import { waLinkWithText } from '../lib/whatsapp';
import { AcademyGallery } from '../components/AcademyGallery';
import { CourseEnrollModal } from '../components/CourseEnrollModal';
import { Button } from '../components/ui';

// Real academy assets that already ship in /public. The split-hero image falls
// back to this editorial founder photo when a course has no per-course image.
const HERO_FALLBACK_IMAGE = '/about-editorial/editorial-1.jpg';
// Teacher section portrait — the real founder photo already shipping in /public.
const FOUNDER_IMAGE = '/irina_primo.png';

// Our course `level` values are stored in English (Base/Intermediate/Master/
// Grand Master/Creative/PRO). Map them to the localized label via i18n keys so
// the DISPLAY reflects the UI language while the underlying data stays English.
const LEVEL_KEY: Record<string, string> = {
    base: 'courseDetail.level.base',
    intermediate: 'courseDetail.level.intermediate',
    master: 'courseDetail.level.master',
    'grand master': 'courseDetail.level.grandMaster',
    creative: 'courseDetail.level.creative',
    pro: 'courseDetail.level.pro',
};

export function CourseDetailPage() {
    const { id: handle } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useLanguage();
    // Course enrollment CTAs deep-link straight to WhatsApp. The URL is
    // configured in Medusa Admin → Content → Course WhatsApp link.
    // Empty string disables the buttons until the client provides one.
    const whatsappUrl = useStoreSetting<string>('course_whatsapp_url', '');
    const { data: course, isLoading } = useCourse(handle);
    // Enroll CTA opens a modal: choose WhatsApp (prefilled deep-link) or Email
    // (a form that mails the PriMo team). Same prefilled message for both.
    const [enrollOpen, setEnrollOpen] = useState(false);
    const enrollMessage = course
        ? t('courseDetail.enrollMessage', {
              course: course.title,
              price: course.price ? `€${course.price}` : '',
          })
        : '';
    const enrollHref = course ? waLinkWithText(whatsappUrl, enrollMessage) : whatsappUrl;

    const courseDescription = toMetaDescription(course?.description, 160);
    useSeo({
        titleKey: 'pageTitle.courseDetail',
        titleVars: { title: course?.title || 'Course' },
        description: courseDescription || undefined,
        descriptionKey: 'seo.courses.description',
        canonicalPath: handle ? `/corsi/${handle}` : undefined,
        type: 'article',
        // A "course not found" view is a soft 404 — keep it out of the index.
        noindex: !isLoading && !course,
        jsonLd: course && handle
            ? courseJsonLd({
                name: course.title,
                description: courseDescription || undefined,
                url: `/corsi/${handle}`,
              })
            : null,
    });

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [handle]);

    // Phone enrol bar (primo1 `.cx-bar`): slides up once the hero CTAs have
    // scrolled away, and hides again over the closing CTA panel. Callback refs
    // because the observed nodes only mount after the course has loaded.
    const [heroCtas, setHeroCtas] = useState<HTMLDivElement | null>(null);
    const [finalPanel, setFinalPanel] = useState<HTMLElement | null>(null);
    const [barVisible, setBarVisible] = useState(false);
    useEffect(() => {
        if (!heroCtas || !finalPanel || typeof IntersectionObserver === 'undefined') return;
        const seen = new Map<Element, boolean>([[heroCtas, true], [finalPanel, false]]);
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => seen.set(e.target, e.isIntersecting));
            setBarVisible(!seen.get(heroCtas) && !seen.get(finalPanel));
        });
        io.observe(heroCtas);
        io.observe(finalPanel);
        return () => io.disconnect();
    }, [heroCtas, finalPanel]);
    // Lift the global back-to-top button above the enrol bar (see index.css).
    useEffect(() => {
        document.body.classList.add('has-enrol-bar');
        return () => document.body.classList.remove('has-enrol-bar');
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Sparkles className="w-8 h-8 text-muted-foreground animate-pulse" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-8">
                <div className="flex flex-col items-center text-center space-y-8">
                    <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h1 className="font-heading text-3xl font-bold tracking-tight text-card-foreground">{t('courseDetail.courseNotFound')}</h1>
                    <Link to="/corsi" className="inline-flex h-12 items-center justify-center rounded-pill border border-primary bg-primary px-8 text-sm font-sans font-medium uppercase tracking-widest text-primary-foreground shadow-card transition-[background-color,color,box-shadow] duration-200 hover:bg-transparent hover:text-primary hover:shadow-subtle active:scale-[0.98]">
                        {t('courseDetail.backToAcademy')}
                    </Link>
                </div>
            </div>
        );
    }

    // Localized level label (English data → UI-language label). Falls back to
    // the raw value when the level isn't in the known set.
    const levelKey = course.level ? LEVEL_KEY[course.level.trim().toLowerCase()] : undefined;
    const levelLabel = levelKey ? t(levelKey as any) : course.level;

    const heroImage = course.image || HERO_FALLBACK_IMAGE;
    const usingFallbackHero = !course.image;

    // Facts strip rows: Inizio · Durata · Pagamento · Certificati. Inizio/Durata
    // come from real course fields (hidden when absent); Pagamento/Certificati
    // use the Academy-wide i18n copy.
    const facts = [
        course.nextDates
            ? {
                  label: t('courseDetail.startDate'),
                  value: `${course.nextDates.day} ${course.nextDates.month}`,
                  icon: Calendar,
              }
            : null,
        { label: t('courseDetail.duration'), value: course.duration, icon: Clock },
        {
            label: t('courseDetail.payment'),
            value: t('courseDetail.paymentValue'),
            icon: CreditCard,
        },
        {
            label: t('courseDetail.certificates'),
            value: t('courseDetail.certificatesValue'),
            icon: GraduationCap,
        },
    ].filter((r): r is NonNullable<typeof r> => Boolean(r));

    // "Cosa imparerai" check-list. Prefer per-course learning outcomes managed
    // in Admin; when the course has none, GRACEFULLY fall back to the Academy-wide
    // "what you get" points (existing i18n) so courses without the new data stay
    // intact. Only the title is shown in the flat list.
    const fallbackLearnItems = [
        t('courseDetail.workKitTitle'),
        t('courseDetail.training360Title'),
        t('courseDetail.certificationTitle'),
        t('courseDetail.communityTitle'),
        t('courseDetail.monthlyPlansTitle'),
        t('courseDetail.cadenceTitle'),
    ];
    const learnItems =
        course.learningOutcomes && course.learningOutcomes.length > 0
            ? course.learningOutcomes
            : fallbackLearnItems;

    // Programme — real curriculum lessons. Each lesson has a title and an
    // OPTIONAL per-lesson description (managed in Admin); the description block
    // is only rendered when present, so legacy title-only courses are unchanged.
    const lessons = course.curriculum ?? [];

    // Sticky enrol-card spec rows — all from existing course fields (hidden when
    // absent) + the Academy-wide static payment/certificate copy. No new data.
    const bookRows = [
        { label: t('courseDetail.duration'), value: course.duration },
        levelLabel ? { label: t('courseDetail.levelRow'), value: levelLabel } : null,
        { label: t('courseDetail.payment'), value: t('courseDetail.paymentValue') },
        { label: t('courseDetail.certificates'), value: t('courseDetail.certificatesValue') },
    ].filter((r): r is { label: string; value: string } => Boolean(r));

    // FAQ — real <details> accordion. We have no FAQ data model; the Q&A below
    // reuses the prototype's pre-enrol questions via new i18n keys.
    // ⚠️ placeholder content — confirm final answers with PriMo (needs-client).
    const faqItems = [
        { q: t('courseDetail.faq.q1'), a: t('courseDetail.faq.a1') },
        { q: t('courseDetail.faq.q2'), a: t('courseDetail.faq.a2') },
        { q: t('courseDetail.faq.q3'), a: t('courseDetail.faq.a3') },
        { q: t('courseDetail.faq.q4'), a: t('courseDetail.faq.a4') },
    ];

    return (
        <main className="min-h-screen bg-white text-foreground pt-[61px] pb-24 lg:pt-[95px] lg:pb-0">
            {/* 1. SPLIT HERO — desktop: 50/50 content-left / image-right.
                Mobile: stacked image-top / content below (unchanged intent). */}
            <section className="relative isolate overflow-hidden bg-surface lg:grid lg:grid-cols-2 lg:min-h-[560px]">
                {/* Floating back pill (top-left of hero) */}
                <div className="absolute z-20 top-3 left-3 lg:top-12 lg:left-[max(24px,calc(50%-488px))]">
                    <button
                        type="button"
                        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/corsi'))}
                        className="group inline-flex h-9 items-center gap-1 rounded-pill bg-white/92 backdrop-blur-md px-3.5 pl-2 font-inter text-[13px] font-medium text-[#111] transition-colors hover:text-accent-gold lg:gap-1.5 lg:font-sans lg:shadow-subtle"
                    >
                        <ChevronLeft className="w-[21.8px] h-[21.8px] stroke-[1.6] lg:w-4 lg:h-4 lg:stroke-2 group-hover:-translate-x-0.5 transition-transform" />
                        <span>{t('courseDetail.backToAcademy')}</span>
                    </button>
                </div>

                {/* Image — mobile: block on top; desktop: absolute right half */}
                <div className="h-[380px] overflow-hidden lg:order-2 lg:h-auto lg:min-h-[560px]">
                    <img
                        src={heroImage}
                        alt={usingFallbackHero ? '' : course.title}
                        aria-hidden={usingFallbackHero ? 'true' : undefined}
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                        className="h-full w-full object-cover object-[50%_38%] lg:absolute lg:inset-0 lg:left-1/2 lg:w-1/2 lg:object-[50%_40%]"
                    />
                </div>

                {/* Content — course-specific intro */}
                <div className="relative -mt-7 rounded-t-[28px] bg-surface px-6 pt-[30px] pb-8 lg:order-1 lg:mt-0 lg:self-center lg:rounded-none lg:bg-transparent lg:px-0 lg:pl-[max(24px,calc(50vw-488px))] lg:pr-14 lg:py-24">
                    <p className="text-[11px] font-bold uppercase tracking-[1.8px] text-accent-gold">
                        {levelLabel
                            ? t('courseDetail.heroEyebrow', { level: levelLabel })
                            : t('courses.academyLabel')}
                    </p>
                    <h1 className="mt-2.5 font-heading text-[40px] font-bold leading-[42px] tracking-[-1.6px] text-[#111] text-balance lg:text-[56px] lg:leading-[58px] lg:tracking-[-2.4px]">
                        {course.title}
                    </h1>
                    <p className="mt-4 max-w-[460px] font-inter text-[16px] leading-[24px] text-[#555] lg:font-sans lg:text-[17px] lg:leading-[27px]">
                        {course.description}
                    </p>
                    <div ref={setHeroCtas} className="mt-[26px] flex flex-col gap-2.5 sm:flex-row lg:mt-8">
                        <Button
                            type="button"
                            onClick={() => setEnrollOpen(true)}
                            variant="primary"
                            size="lg"
                            className="whitespace-nowrap"
                            leadingIcon={<MessageCircle className="w-5 h-5" />}
                        >
                            {t('courseDetail.whatsappCta')}
                        </Button>
                        {lessons.length > 0 && (
                            <a
                                href="#programma"
                                className="inline-flex h-[52px] items-center justify-center whitespace-nowrap rounded-pill border-[1.2px] border-[#c9c4bf] px-6 text-[15px] font-medium text-[#222] transition-colors hover:border-[#111]"
                            >
                                {t('courseDetail.viewProgram')}
                            </a>
                        )}
                    </div>
                </div>
            </section>

            {/* 2. FACTS STRIP — white 4-col dl overlapping the hero bottom (desktop) */}
            <section
                aria-label={t('courseDetail.essentialInfo')}
                className="relative z-10 -mt-px bg-[linear-gradient(var(--surface)_50%,#fff_50%)] px-4 lg:mx-auto lg:-mt-12 lg:w-full lg:max-w-[976px] lg:bg-none lg:px-0"
            >
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[24px] border border-[#e6e1dc] bg-[#e6e1dc] shadow-[0_30px_60px_-36px_rgba(0,0,0,0.3)] lg:grid-cols-4 lg:gap-0 lg:border-0 lg:bg-white">
                    {facts.map((item, i) => (
                        <div
                            key={i}
                            className="bg-white px-[18px] pt-[18px] pb-5 max-lg:last:odd:col-span-2 lg:px-[26px] lg:py-6 lg:border-r lg:border-[#e6e1dc] lg:last:border-r-0"
                        >
                            <dt className="flex flex-col gap-3 text-[10.5px] leading-[14px] font-bold uppercase tracking-[1.5px] text-[#8a8580] lg:flex-row lg:items-center lg:gap-2 lg:text-[10px] lg:leading-normal lg:tracking-[0.22em]">
                                <item.icon className="w-[26px] h-[26px] stroke-[1.5] text-[#111] lg:w-4 lg:h-4 lg:stroke-[1.6]" aria-hidden="true" />
                                {item.label}
                            </dt>
                            <dd className="mt-1 text-[16px] leading-[21px] font-semibold text-[#111] lg:mt-2 lg:text-[18px] lg:leading-normal lg:tracking-tight">
                                {item.value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </section>

            {/* BODY — desktop 2-col: main content left, sticky enrol card right */}
            <div className="mx-auto grid w-full max-w-[976px] grid-cols-1 gap-x-[72px] px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:px-0">
              <div className="min-w-0">
                {/* 3a. WHAT YOU'LL LEARN — flat, always-visible 2-col check-list */}
                <section aria-labelledby="learn-h" className="pt-14 lg:pt-20">
                    <p className="text-[11px] font-bold uppercase tracking-[1.8px] text-accent-gold">
                        {t('courseDetail.learnEyebrow')}
                    </p>
                    <h2
                        id="learn-h"
                        className="mt-2 font-heading text-[30px] font-semibold leading-[36px] tracking-[-0.9px] text-[#111] lg:text-[38px] lg:leading-[44px] lg:tracking-[-1.2px]"
                    >
                        {t('courseDetail.learnHeading')}
                    </h2>
                    <ul className="mt-6 grid gap-3.5 lg:mt-8 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-[18px]">
                        {learnItems.map((item, i) => (
                            <li key={i} className="relative pl-9 text-[15.5px] leading-[22px] text-[#222]">
                                <span
                                    aria-hidden="true"
                                    className="absolute left-0 top-[-1px] flex h-6 w-6 items-center justify-center rounded-full bg-[#111]"
                                >
                                    <Check className="h-3.5 w-3.5 text-white stroke-[2.4]" />
                                </span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </section>

                {/* 3b. PROGRAMME — flat numbered list (real curriculum lessons) */}
                {lessons.length > 0 && (
                    <section id="programma" aria-labelledby="prog-h" className="scroll-mt-28 pt-14 lg:pt-20">
                        <p className="text-[11px] font-bold uppercase tracking-[1.8px] text-accent-gold">
                            {t('courseDetail.programEyebrow')}
                        </p>
                        <h2
                            id="prog-h"
                            className="mt-2 font-heading text-[30px] font-semibold leading-[36px] tracking-[-0.9px] text-[#111] lg:text-[38px] lg:leading-[44px] lg:tracking-[-1.2px]"
                        >
                            {t('courseDetail.programHeading')}
                        </h2>
                        <ol className="mt-6 border-t border-[#e6e1dc] lg:mt-8">
                            {lessons.map((lesson, i) => (
                                <li
                                    key={`${i}-${lesson.title}`}
                                    className="grid grid-cols-[52px_1fr] items-baseline border-b border-[#e6e1dc] py-5 lg:grid-cols-[80px_1fr] lg:py-[26px]"
                                >
                                    <span className="text-[22px] font-light leading-[26px] text-accent-gold tabular-nums lg:text-[28px] lg:leading-[30px]">
                                        {(i + 1).toString().padStart(2, '0')}
                                    </span>
                                    <div className="min-w-0">
                                        <h3 className="text-[18px] font-semibold leading-[26px] tracking-[-0.3px] text-[#111] lg:text-[20px] lg:leading-[28px]">
                                            {lesson.title}
                                        </h3>
                                        {lesson.description && (
                                            <p className="mt-1.5 font-inter text-[14.5px] leading-[22px] text-[#666] whitespace-pre-line lg:font-sans lg:text-[#555]">
                                                {lesson.description}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

                {course.fullDescription && (
                    <section className="pt-14 lg:pt-20">
                        <p className="max-w-[640px] whitespace-pre-line font-inter text-[15px] leading-[23px] text-[#555] lg:font-sans lg:leading-relaxed">
                            {course.fullDescription}
                        </p>
                    </section>
                )}

                {/* 3c. TEACHER — photo + bio + stats. Founder photo + bio reused
                    from existing About content; stats are placeholder (⚠️ needs-client). */}
                <section
                    aria-labelledby="teach-h"
                    className="grid grid-cols-1 items-center gap-6 pt-14 sm:grid-cols-[180px_1fr] sm:gap-9 lg:pt-20"
                >
                    <img
                        src={FOUNDER_IMAGE}
                        alt={t('courseDetail.teacherName')}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/3] w-full rounded-[24px] sm:max-w-[220px] object-cover object-[50%_25%] lg:aspect-square lg:rounded-[28px]"
                    />
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[1.8px] text-accent-gold">
                            {t('courseDetail.teacherEyebrow')}
                        </p>
                        <h2
                            id="teach-h"
                            className="mt-2 font-heading text-[30px] font-semibold leading-[36px] tracking-[-0.9px] text-[#111] lg:mt-1.5 lg:text-[32px] lg:leading-[38px]"
                        >
                            {t('courseDetail.teacherName')}
                        </h2>
                        <p className="mt-3 max-w-[520px] font-inter text-[15px] leading-[23px] text-[#555] lg:font-sans">
                            {t('courseDetail.teacherBio')}
                        </p>
                        <dl className="mt-[22px] flex gap-10 lg:mt-6">
                            <div className="flex flex-col-reverse">
                                <dt className="text-[12px] tracking-[0.4px] text-[#8a8580]">
                                    {t('courseDetail.teacherExpLabel')}
                                </dt>
                                <dd className="m-0 text-[26px] font-bold leading-[32px] tracking-[-0.6px] text-[#111]">
                                    {t('courseDetail.teacherExpValue')}
                                </dd>
                            </div>
                            <div className="flex flex-col-reverse">
                                <dt className="text-[12px] tracking-[0.4px] text-[#8a8580]">
                                    {t('courseDetail.teacherStudentsLabel')}
                                </dt>
                                <dd className="m-0 text-[26px] font-bold leading-[32px] tracking-[-0.6px] text-[#111]">
                                    {t('courseDetail.teacherStudentsValue')}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </section>

                {/* 3d. FAQ — native <details> accordion, first item open,
                    non-exclusive, +→× icon rotate. ⚠️ placeholder Q&A (needs-client). */}
                <section aria-labelledby="faq-h" className="pt-14 lg:pt-20">
                    <p className="text-[11px] font-bold uppercase tracking-[1.8px] text-accent-gold">
                        {t('courseDetail.faqEyebrow')}
                    </p>
                    <h2
                        id="faq-h"
                        className="mt-2 font-heading text-[30px] font-semibold leading-[36px] tracking-[-0.9px] text-[#111] lg:text-[38px] lg:leading-[44px] lg:tracking-[-1.2px]"
                    >
                        {t('courseDetail.faqHeading')}
                    </h2>
                    <div className="mt-6 border-t border-[#e6e1dc] lg:mt-7">
                        {faqItems.map((item, i) => (
                            <details
                                key={i}
                                open={i === 0}
                                className="group border-b border-[#e6e1dc]"
                            >
                                <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-[16px] font-semibold text-[#111] marker:hidden [&::-webkit-details-marker]:hidden lg:text-[17px]">
                                    {item.q}
                                    <Plus
                                        aria-hidden="true"
                                        className="h-5 w-5 shrink-0 stroke-[1.8] text-[#111] transition-transform duration-[250ms] ease-[cubic-bezier(.22,.8,.24,1)] motion-reduce:transition-none group-open:rotate-45"
                                    />
                                </summary>
                                <p className="pb-5 pr-9 font-inter text-[15px] leading-[23px] text-[#555] lg:font-sans">
                                    {item.a}
                                </p>
                            </details>
                        ))}
                    </div>
                </section>
              </div>

              {/* STICKY ENROL CARD — desktop-only (lg:) right column.
                  Pure CSS position:sticky; CTA opens the existing CourseEnrollModal. */}
              <aside
                aria-label={t('courseDetail.nextEditionEyebrow')}
                className="hidden lg:sticky lg:top-[120px] lg:mt-20 lg:block lg:rounded-[28px] lg:border lg:border-[#e6e1dc] lg:bg-white lg:p-[28px] lg:pb-7 lg:shadow-[0_30px_60px_-36px_rgba(0,0,0,0.3)]"
              >
                <p className="text-[11px] font-bold uppercase tracking-[1.8px] text-accent-gold">
                    {t('courseDetail.nextEditionEyebrow')}
                </p>
                {course.nextDates ? (
                    <p className="mt-1.5 text-[32px] font-bold leading-[38px] tracking-[-1px] text-[#111]">
                        {course.nextDates.day} {course.nextDates.month}
                    </p>
                ) : (
                    <p className="mt-1.5 text-[26px] font-bold leading-[32px] tracking-[-1px] text-[#111]">
                        {course.title}
                    </p>
                )}
                {course.price && (
                    <p className="mt-1 text-[18px] font-semibold text-[#111]">€{course.price}</p>
                )}
                <ul className="my-[22px] mb-[26px] list-none border-t border-[#e6e1dc] p-0">
                    {bookRows.map((row, i) => (
                        <li
                            key={i}
                            className="flex justify-between gap-4 border-b border-[#e6e1dc] py-[13px] text-[14px]"
                        >
                            <span className="shrink-0 text-[#8a8580]">{row.label}</span>
                            <b className="min-w-0 text-right font-semibold text-[#111]">{row.value}</b>
                        </li>
                    ))}
                </ul>
                <Button
                    type="button"
                    onClick={() => setEnrollOpen(true)}
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="whitespace-nowrap px-4"
                    leadingIcon={<MessageCircle className="w-5 h-5" />}
                >
                    {t('courseDetail.whatsappCta')}
                </Button>
                <p className="mt-3.5 text-center text-[12.5px] text-[#8a8580]">
                    {t('courseDetail.respondNote')}
                </p>
              </aside>
            </div>

            {/* 5. CLOSING DARK CTA PANEL — full-bleed-feel dark panel; enroll CTA
                opens the existing CourseEnrollModal. */}
            <section
                ref={setFinalPanel}
                aria-labelledby="final-h"
                className="mx-4 mt-16 max-w-[976px] rounded-[28px] bg-[#111] px-7 py-11 text-center text-white lg:mx-auto lg:w-full lg:my-24 lg:rounded-[36px] lg:px-12 lg:py-[72px]"
            >
                <div>
                    <h2
                        id="final-h"
                        className="font-heading text-[28px] font-semibold leading-[34px] tracking-[-0.8px] text-balance lg:text-[40px] lg:leading-[46px] lg:tracking-[-1.4px]"
                    >
                        {t('courseDetail.finalHeading')}{' '}
                        <span className="text-[#bdb6ae] lg:block">
                            {t('courseDetail.finalHeadingSpan')}
                        </span>
                    </h2>
                    <p className="mx-auto mt-3.5 max-w-[340px] font-inter text-[15px] leading-[22px] text-[#c9c4bf] lg:max-w-none lg:font-sans lg:text-[16px]">
                        {t('courseDetail.finalBody')}
                    </p>
                    <div className="mt-7 flex justify-center">
                        {/* White-on-dark variant (prototype .cx-btn.light) */}
                        <Button
                            type="button"
                            onClick={() => setEnrollOpen(true)}
                            variant="primary"
                            size="lg"
                            leadingIcon={<MessageCircle className="w-5 h-5" />}
                            className="!border-white !bg-white !text-[#111] shadow-none hover:!bg-surface-strong"
                        >
                            {t('courseDetail.whatsappCta')}
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer branding */}
            {/* GALLERIA — shared with /corsi: swipe / arrow scroll + enlarge. Per-course
                photos (Admin) when set, else the Academy defaults. */}
            <AcademyGallery images={course.gallery} />

            <footer className="hidden border-t border-border py-24 text-center lg:block">
                <Link to="/corsi" className="inline-flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.4em] text-muted-foreground transition-colors hover:text-foreground sm:gap-4 sm:tracking-[0.6em]">
                    <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" /> {t('courseDetail.returnToAcademy')}
                </Link>
            </footer>

            {/* PHONE ENROL BAR — primo1 `.cx-bar`; shown by the observer above. */}
            <div
                aria-hidden={!barVisible}
                className={`fixed bottom-0 left-1/2 z-[25] flex w-full max-w-[440px] -translate-x-1/2 items-center justify-between gap-4 rounded-t-[22px] bg-white/97 py-3 pl-6 pr-4 pb-[calc(12px+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md transition-transform duration-300 ease-[cubic-bezier(.22,.8,.24,1)] lg:hidden ${barVisible ? 'translate-y-0' : 'translate-y-[110%]'}`}
            >
                <div className="flex min-w-0 flex-col">
                    <span className="text-[11px] tracking-[0.4px] text-[#8a8580]">
                        {course.nextDates ? t('courseDetail.nextEditionEyebrow') : t('courses.academyLabel')}
                    </span>
                    <b className="truncate text-[16px] font-bold text-[#111]">
                        {course.nextDates ? `${course.nextDates.day} ${course.nextDates.month}` : course.title}
                    </b>
                </div>
                <button
                    type="button"
                    tabIndex={barVisible ? 0 : -1}
                    onClick={() => setEnrollOpen(true)}
                    className="inline-flex h-12 shrink-0 items-center justify-center gap-2.5 rounded-full bg-black px-[26px] text-[15px] font-semibold tracking-[0.2px] text-white transition-[background-color,transform] hover:bg-[#2a2a2a] active:scale-[0.98]"
                >
                    <MessageCircle className="h-5 w-5 stroke-[1.8]" aria-hidden="true" />
                    {t('courseDetail.enrollShort')}
                </button>
            </div>

            <CourseEnrollModal
                open={enrollOpen}
                onClose={() => setEnrollOpen(false)}
                whatsappUrl={enrollHref}
                courseTitle={course.title}
                coursePrice={course.price}
                defaultMessage={enrollMessage}
            />
        </main>
    );
}
