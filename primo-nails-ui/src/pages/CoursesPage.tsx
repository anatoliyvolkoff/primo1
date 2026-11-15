import { useCallback, useState, type FormEvent, type MouseEvent } from 'react';
import { Check, Award, Users, FileBadge, CreditCard, ChevronLeft, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CoursesList } from '../components/CoursesList';
import { useLanguage } from '../context/LanguageContext';
import { useBanner, useStoreSetting } from '../hooks/useStoreContent';
import { useSeo } from '../lib/useSeo';
import { waLinkWithText } from '../lib/whatsapp';
import { AcademyGallery } from '../components/AcademyGallery';
import { CourseEnrollModal } from '../components/CourseEnrollModal';
import { Input, Textarea, Button } from '../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CoursesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const banner = useBanner('courses', '/courses/academy-banner.png');
  useSeo({ titleKey: 'pageTitle.courses', descriptionKey: 'seo.courses.description', canonicalPath: '/corsi' });

  // One-on-one "Request Info" lead form. Instead of silently discarding the
  // submission, it reuses the same enrollment mechanism as the course cards:
  // open CourseEnrollModal, which offers a WhatsApp deep-link or an email form
  // that POSTs to /store/course-enrollment. The WhatsApp base is the same
  // admin-configured store setting the course pages use.
  const whatsappBase = useStoreSetting<string>('course_whatsapp_url', '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);

  // Title used as the modal's course context — this is a generic 1:1 request,
  // not a specific catalogue course.
  const oneOnOneTitle = `${t('courses.individualTraining')} ${t('courses.individualTrainingAccent')}`;
  // Prefilled message for both channels, carrying whatever the visitor typed.
  // Reuses the existing enroll-message copy (same key the course pages use);
  // this is a generic 1:1 request with no price, so drop the empty "()" the
  // price placeholder would otherwise leave behind.
  const intro = t('courseDetail.enrollMessage', { course: oneOnOneTitle, price: '' })
    .replace(/\s*\(\s*\)/g, '')
    .trim();
  const enrollMessage = [
    intro,
    name.trim() ? `${t('courses.fullName')}: ${name.trim()}` : '',
    email.trim() ? `${t('courses.emailPlaceholder')}: ${email.trim()}` : '',
    message.trim() ? `${t('courses.whatDoYouNeed')}: ${message.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const enrollHref = waLinkWithText(whatsappBase, enrollMessage);

  // In-page CTA scroll, mirroring the prototype (academy.html): the hero
  // buttons are real anchors, but the scroll is the slow, eased browser
  // smooth-scroll rather than an instant jump. We intercept the click to call
  // scrollIntoView({ behavior: 'smooth' }) — which honours each target's
  // CSS `scroll-margin-top` so the block clears the fixed header — and fall
  // back to 'auto' under prefers-reduced-motion. The href is kept intact so
  // keyboard/anchor semantics and no-JS navigation still reach the block.
  const scrollToSection = useCallback(
    (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    },
    [],
  );

  const handleRequestInfo = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setEnrollOpen(true);
  };

  // Pill-shaped field styling (prototype `.fld input`): 52px, radius 99,
  // surface fill (--surface), focus → black border + white fill. `cn` doesn't merge
  // conflicting classes, so fill + font are `!` to beat the primitive's
  // `bg-card` / `font-sans`.
  const pillField =
    'h-[52px] rounded-full bg-surface! border-[#e6e1dc] px-[22px] font-inter! text-[15px] ' +
    'placeholder:text-[#9a948e] focus:border-[#111] focus:bg-white!';

  return (
      <main className="flex-1 pt-[61px] lg:pt-24 pb-0">
        {/* PHONE hero — primo1 `.acad-hero`: photo with a frosted "Indietro"
            pill, then a warm intro card lapping over its bottom edge. */}
        <section className="lg:hidden relative bg-surface">
          <div className="absolute z-[2] top-3 left-3">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
              className="inline-flex items-center gap-1 h-9 pl-2 pr-3.5 rounded-full bg-white/90 backdrop-blur-md font-inter text-[13px] font-medium text-[#111]"
            >
              <ChevronLeft aria-hidden="true" className="w-[21.8px] h-[21.8px]" strokeWidth={1.6} />
              {t('nav.back')}
            </button>
          </div>
          <img
            src={banner.mobileImage || banner.image}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            fetchPriority="high"
            className="w-full h-[320px] object-cover object-[50%_30%]"
          />
          <div className="relative -mt-7 px-6 pt-[30px] pb-8 rounded-t-[28px] bg-surface">
            <p className="font-sans text-[11px] leading-4 font-bold tracking-[1.8px] uppercase text-[#c8742d]">{t('courses.heroEyebrow')}</p>
            <h1 className="mt-2.5 text-[40px] leading-[42px] font-bold tracking-[-1.6px] text-[#111]">{t('courses.bannerTitle')}</h1>
            <p className="mt-4 font-inter text-[16px] leading-6 text-[#555]">{t('courses.bannerSubtitle')}</p>
            <div className="mt-[26px] flex flex-col gap-2.5">
              <a
                href="#courses"
                onClick={scrollToSection('courses')}
                className="inline-flex items-center justify-center h-[52px] px-7 rounded-full bg-black text-white text-[15px] font-semibold tracking-[0.2px] active:scale-[0.98]"
              >
                {t('courses.heroCtaCourses')}
              </a>
              <a
                href="#solo"
                onClick={scrollToSection('solo')}
                className="inline-flex items-center justify-center h-[52px] px-6 rounded-full border-[1.2px] border-[#c9c4bf] text-[#222] text-[15px] font-medium"
              >
                {t('courses.heroCtaIndividual')}
              </a>
            </div>
          </div>
        </section>

        {/* DESKTOP hero — 540px full-bleed dark band with an absolutely-positioned
            white intro aligned to the 976px content column + two in-page CTAs. */}
        <section className="hidden lg:block relative h-[540px] overflow-hidden bg-[#111]">
          <picture>
            {banner.mobileImage && <source media="(max-width: 640px)" srcSet={banner.mobileImage} />}
            <img
              src={banner.image}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="w-full h-[540px] object-cover object-center brightness-[0.55]"
            />
          </picture>
          <div className="absolute inset-0">
            <div className="h-full max-w-[976px] mx-auto px-6 relative">
              <div className="absolute left-6 bottom-[110px] text-white">
                <p className="font-sans text-[11px] font-bold tracking-[1.8px] uppercase text-[#e8b07c]">
                  {t('courses.heroEyebrow')}
                </p>
                <h1 className="mt-2.5 text-[56px] leading-[58px] font-bold tracking-[-2.4px] text-white">
                  {t('courses.bannerTitle')}
                </h1>
                <p className="mt-4 max-w-[540px] text-[17px] leading-[27px] text-[#ddd8d3]">
                  {t('courses.bannerSubtitle')}
                </p>
                <div className="mt-[30px] flex flex-row gap-3">
                  <a
                    href="#courses"
                    onClick={scrollToSection('courses')}
                    className="inline-flex items-center justify-center h-[52px] px-7 rounded-full bg-white text-black text-[15px] font-semibold transition-colors duration-200 hover:bg-surface-strong active:scale-[0.98]"
                  >
                    {t('courses.heroCtaCourses')}
                  </a>
                  <a
                    href="#solo"
                    onClick={scrollToSection('solo')}
                    className="inline-flex items-center justify-center h-[52px] px-6 rounded-full border-[1.2px] border-white/50 text-white text-[15px] font-medium transition-colors duration-200 hover:border-white active:scale-[0.98]"
                  >
                    {t('courses.heroCtaIndividual')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DESKTOP facts strip — white 4-column card pulled up to overlap the hero. */}
        <section aria-label={t('courses.academyLabel')} className="relative px-4 -mt-px bg-[linear-gradient(var(--surface)_50%,#fff_50%)] lg:bg-none lg:mt-0 lg:max-w-[976px] lg:mx-auto lg:px-6">
          <dl className="grid grid-cols-2 lg:grid-cols-4 lg:-mt-12 rounded-[24px] border border-[#e6e1dc] bg-white overflow-hidden shadow-[0_20px_40px_-28px_rgba(0,0,0,0.25)]">
            {([
              // Four marketing facts, matching the prototype's `.acad-facts`
              // (academy.html): Experience / Students / Certificate / Payment.
              // Values reuse existing storefront keys — the 20+ years and
              // 10 000+ students claims are the same the course-detail teacher
              // block and About page already show (not fabricated here).
              // Each stat carries its own icon ABOVE the label, mirroring the
              // prototype's `.cx-facts dt` (flex-column, 12px gap, 26px svg,
              // stroke-width 1.5, #111). Lucide equivalents of the prototype's
              // inline SVGs: award (experience/medal), users (students),
              // file-badge (certificate/diploma), credit-card (payment).
              { icon: Award, label: t('courseDetail.teacherExpLabel'), value: t('courseDetail.teacherExpValue') },
              { icon: Users, label: t('courseDetail.teacherStudentsLabel'), value: t('courseDetail.teacherStudentsValue') },
              { icon: FileBadge, label: t('courseDetail.certificates'), value: t('courses.academyLabel') },
              { icon: CreditCard, label: t('courseDetail.payment'), value: t('courseDetail.paymentValue') },
            ] as { icon: LucideIcon; label: string; value: string }[]).map((f, i, arr) => {
              const Icon = f.icon;
              return (
              <div key={f.label} className={`px-[18px] pt-[18px] pb-5 lg:px-[26px] lg:py-6 border-[#e6e1dc] ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'max-lg:border-b' : ''} ${i < arr.length - 1 ? 'lg:border-r' : 'lg:border-r-0'}`}>
                <dt className="flex flex-col gap-3 text-[10.5px] leading-[14px] font-bold tracking-[1.5px] uppercase text-[#8a8580]">
                  <Icon aria-hidden="true" className="w-[26px] h-[26px] text-[#111]" strokeWidth={1.5} />
                  {f.label}
                </dt>
                <dd className="mt-1 text-[16px] leading-[21px] lg:text-[18px] lg:leading-normal font-semibold text-[#111]">{f.value}</dd>
              </div>
              );
            })}
          </dl>
        </section>

        <CoursesList showAll />

        {/* Individual Inquiry Section — mobile card (unchanged structure) /
            desktop 2-column pitch + form card (prototype `.solo`). */}
        <section id="solo" className="bg-white scroll-mt-24 lg:scroll-mt-28">
          <div className="px-6 mt-16 lg:px-0 lg:max-w-[976px] lg:mx-auto lg:mt-28">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_480px] lg:gap-20 lg:items-center">
                <div>
                  <div>
                    <p className="font-sans text-[11px] leading-4 font-bold tracking-[1.8px] uppercase text-[#c8742d]">
                      {t('courses.oneOnOneLabel')}
                    </p>
                    <h2 className="font-sans mt-2 text-[30px] leading-9 font-semibold tracking-[-0.9px] text-[#111] lg:mt-2 lg:text-[38px] lg:leading-[44px] lg:tracking-[-1.2px] lg:font-semibold">
                      {t('courses.individualTraining')}{' '}
                      <span>{t('courses.individualTrainingAccent')}</span>
                    </h2>
                  </div>
                  <p className="mt-3 font-inter text-[15.5px] leading-6 text-[#555] lg:font-sans lg:mt-3 lg:text-[16px] lg:leading-[26px] lg:text-[#555]">
                    {t('courses.individualDescription')}
                  </p>
                  {/* Check-circle tick list (prototype `.cx-learn`). */}
                  <ul className="flex flex-col gap-[14px] mt-6">
                    {[t('courses.customProgram'), t('courses.specificTechniques'), t('courses.eliteCertificate')].map(item => (
                        <li key={item} className="flex items-center gap-3 text-[15.5px] leading-[22px] text-[#222]">
                                                    <span aria-hidden="true" className="inline-grid place-items-center w-6 h-6 rounded-full bg-[#111] text-white shrink-0">
                            <Check className="w-3.5 h-3.5" strokeWidth={2.4} />
                          </span>
                          {item}
                        </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 lg:mt-0 rounded-[28px] bg-white border border-[#e6e1dc] pt-7 px-[22px] pb-6 shadow-[0_30px_60px_-36px_rgba(0,0,0,0.3)] lg:rounded-[32px] lg:p-10">
                  <div>
                    <h3 className="font-sans text-[22px] leading-7 font-semibold tracking-[-0.4px] text-[#111] lg:font-sans lg:text-[26px] lg:leading-[32px] lg:font-semibold lg:tracking-[-0.4px]">{t('courses.requestInfo')}</h3>
                    <p className="mt-1 font-inter text-[14px] leading-5 text-[#8a8580]">{t('courses.buildSuccess')}</p>
                  </div>

                  <form className="mt-[22px] space-y-3" onSubmit={handleRequestInfo} noValidate>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('courses.fullName')}
                      aria-label={t('courses.fullName')}
                      className={pillField}
                    />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(false);
                      }}
                      placeholder={t('courses.emailPlaceholder')}
                      aria-label={t('courses.emailPlaceholder')}
                      error={emailError ? t('courseEnroll.errEmail') : undefined}
                      className={pillField}
                    />
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t('courses.whatDoYouNeed')}
                      aria-label={t('courses.whatDoYouNeed')}
                      rows={3}
                      className="h-28 rounded-[22px] bg-surface! border-[#e6e1dc] px-[22px] py-4 font-inter! text-[15px] placeholder:text-[#9a948e] focus:border-[#111] focus:bg-white!"
                    />
                    <Button type="submit" variant="primary" size="lg" fullWidth className="mt-1 h-[52px] normal-case tracking-[0.2px] text-[15px] font-semibold">
                      {t('courses.submitRequest')}
                    </Button>
                    <p className="mt-3 text-center font-inter text-[12.5px] text-[#8a8580]">{t('courses.respondWithin')}</p>
                  </form>
                </div>
            </div>
          </div>
          {/* Desktop bottom spacer (prototype `.acad::after`). */}
          <div aria-hidden="true" className="hidden lg:block lg:h-28" />
        </section>

        <AcademyGallery />

        <CourseEnrollModal
          open={enrollOpen}
          onClose={() => setEnrollOpen(false)}
          whatsappUrl={enrollHref}
          courseTitle={oneOnOneTitle}
          defaultMessage={enrollMessage}
        />
      </main>
  );
}
