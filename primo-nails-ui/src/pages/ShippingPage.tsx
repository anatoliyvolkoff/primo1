import { Fragment } from 'react';
import { Check, ChevronLeft, MessageCircle, Plus, Truck, Clock, Gift, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useSeo } from '../lib/useSeo';
import { formatPrice } from '../lib/formatPrice';
import { useShippingRates, useMinFreeThreshold, type DisplayZone } from '../lib/shippingZones';
import { useStoreSetting } from '../hooks/useStoreContent';
import { waLinkWithText, WHOLESALE_EMAIL, WHATSAPP_FALLBACK } from '../lib/whatsapp';
import { SHIPPING, type LegalBody } from '../data/legal';

/**
 * Shipping info page (/spedizioni) — redesign (desktop ≥1024px), 976px column.
 *
 * Visual rebuild of the prototype's spedizioni.html: warm hero + 4-fact strip,
 * two rate TABLES (Italy / Europe), a country legend, a 4-step delivery timeline,
 * an FAQ accordion, and a dark WhatsApp/email closing panel.
 *
 * NO logic/data changes: the rate tables stay DATA-DRIVEN from the live
 * `shipping_rates` store setting (`useShippingRates`), the free-ship threshold
 * comes from the same source (`useMinFreeThreshold`), and the FAQ reshapes the
 * existing translated `SHIPPING` legal doc into `<details>` — same data source,
 * just a different presentation. The old data-driven zone cards + legal TOC are
 * replaced by the prototype's table/accordion layout.
 */

/** Render a legal-doc body (string or bullet list), highlighting [[…]] placeholders. */
function renderFaqBody(body: LegalBody, key: number) {
  if (typeof body === 'string') {
    return (
      <p key={key} className="mt-3 first:mt-0 text-[15px] leading-[23px] text-[#555] lg:pr-14">
        {highlightPlaceholders(body)}
      </p>
    );
  }
  return (
    <ul key={key} className="mt-3 first:mt-0 list-disc space-y-1.5 pl-5 text-[15px] leading-[23px] text-[#555] marker:text-accent-gold lg:pr-14">
      {body.list.map((item, i) => (
        <li key={i}>{highlightPlaceholders(item)}</li>
      ))}
    </ul>
  );
}

/** Wrap [[bracketed]] content markers in a highlighted <mark> so they stay visible. */
function highlightPlaceholders(text: string) {
  const parts = text.split(/(\[\[[^\]]*\]\])/g);
  return parts.map((part, i) =>
    /^\[\[[^\]]*\]\]$/.test(part) ? (
      <mark key={i} className="rounded-[4px] bg-[rgba(200,116,45,0.12)] px-[3px] text-[#8a4f1c]">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

// Local cn to keep the table self-contained (mirrors ui/cn).
function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

interface RateTableProps {
  title: string;
  desc: string;
  caption: string;
  weightLabel: string;
  freeFromLabel: string;
  kgLabel: (kg: number) => string;
  zones: DisplayZone[];
  headers: { zone: string; area: string }[];
  weightColCls: string;
  language: 'it' | 'en';
}

const COL_CLS =
  'px-2.5 text-right tabular-nums first:pl-[18px] first:text-left last:pr-[18px] lg:px-5 lg:first:pl-8 lg:last:pr-8';

/** Header + <table> for one rate zone group (Italy or Europe). Pivots the live
 *  zones: columns = zones, rows = the union of their weight bands (data-driven,
 *  so the figures can never drift from what checkout charges). */
function RateTableInner({
  title,
  desc,
  caption,
  weightLabel,
  freeFromLabel,
  kgLabel,
  zones,
  headers,
  weightColCls,
  language,
}: RateTableProps) {
  const bandKgs = Array.from(new Set(zones.flatMap((z) => z.bands.map((b) => b.maxKg)))).sort(
    (a, b) => a - b,
  );
  const priceFor = (zone: DisplayZone, kg: number) => {
    const band = zone.bands.find((b) => b.maxKg === kg);
    return band ? formatPrice(band.price, language) : '—';
  };

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3 px-[18px] pb-4 pt-5 lg:px-8 lg:pb-5 lg:pt-7">
        <h3 className="font-heading text-[22px] font-semibold leading-7 tracking-[-0.5px] text-[#111] lg:text-[26px] lg:leading-8 lg:tracking-[-0.7px]">
          {title}
        </h3>
        <p className="font-sans text-[13px] leading-[19px] text-[#8a8580] lg:text-[14px]">{desc}</p>
      </div>
      <div className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className={cn(COL_CLS, weightColCls, 'border-t border-[#e6e1dc] bg-[#fbf9f6] pb-3 pt-3 align-bottom text-[10.5px] font-bold uppercase tracking-[1.5px] text-[#8a8580] lg:pb-4 lg:pt-4')}
              >
                {weightLabel}
              </th>
              {headers.map((h, i) => (
                <th key={i} scope="col" className={cn(COL_CLS, 'border-t border-[#e6e1dc] bg-[#fbf9f6] pb-3 pt-3 align-bottom lg:pb-4 lg:pt-4')}>
                  <span className="block text-[13px] font-bold leading-[17px] text-[#111] lg:text-[15px] lg:leading-5">{h.zone}</span>
                  <span className="mt-[3px] block font-sans text-[11px] font-normal leading-[14px] text-[#8a8580] lg:text-[12.5px] lg:leading-[17px]">{h.area}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Free-ship highlighted row (data-driven freeThreshold per zone). */}
            <tr className="border-t border-[#e6e1dc] [&>*]:h-11 [&>*]:bg-[rgba(31,122,58,0.07)] [&>*]:text-[#1f7a3a] lg:[&>*]:h-[52px] lg:[&>*]:text-[17px]">
              <th scope="row" className={cn(COL_CLS, 'whitespace-nowrap font-heading text-[11px] font-bold uppercase tracking-[1.2px] lg:text-[11.5px]')}>
                <Check className="mr-1.5 -mb-0.5 inline h-[13px] w-[13px] [stroke-width:2.4]" aria-hidden="true" />
                {freeFromLabel}
              </th>
              {zones.map((z) => (
                <td key={z.key} className={cn(COL_CLS, 'font-bold')}>
                  {z.freeThreshold != null ? formatPrice(z.freeThreshold, language) : '—'}
                </td>
              ))}
            </tr>
            {bandKgs.map((kg) => (
              <tr key={kg} className="border-t border-[#e6e1dc] transition-colors lg:hover:bg-[#fbf9f6]">
                <th scope="row" className={cn(COL_CLS, 'h-[46px] whitespace-nowrap font-sans text-[14.5px] font-normal text-[#555] lg:h-[50px] lg:text-[15.5px]')}>
                  {kgLabel(kg)}
                </th>
                {zones.map((z) => (
                  <td key={z.key} className={cn(COL_CLS, 'h-[46px] text-[14.5px] font-bold text-[#111] lg:h-[50px] lg:text-[15.5px]')}>
                    {priceFor(z, kg)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ShippingPage() {
  const { language, t } = useLanguage();
  const doc = language === 'en' ? SHIPPING.en : SHIPPING.it;
  const zones = useShippingRates(language);
  const minFree = useMinFreeThreshold();

  // Store-configured WhatsApp base (same setting the Courses pages reuse); fall
  // back to the canonical store number if the setting is unset.
  const whatsappBase = useStoreSetting<string>('course_whatsapp_url', '') || WHATSAPP_FALLBACK;
  const whatsappHref = waLinkWithText(whatsappBase);

  useSeo({
    title: doc.title,
    description: doc.metaDescription,
    canonicalPath: '/spedizioni',
  });

  const kgLabel = (kg: number) => (language === 'en' ? `Up to ${kg} kg` : `Fino a ${kg} kg`);

  const itZones = zones.filter((z) => z.key.startsWith('it_'));
  const euZones = zones.filter((z) => z.key.startsWith('eu'));

  // Column headers derive from the same zone metadata as the data (label + a
  // short area descriptor pulled from the zone's own copy — no hardcoded prices).
  const itHeaders = itZones.map((z) => ({ zone: z.label, area: shortArea(z, language) }));
  const euHeaders = euZones.map((z, i) => ({
    zone: i === 0 ? t('shipping.euZone1Label') : t('shipping.euZone2Label'),
    area: t('shipping.euZoneCount', { count: countCountries(z.desc) }),
  }));

  // Reuse the translated SHIPPING legal sections as FAQ items, dropping two
  // sections that live elsewhere in this layout: the hard-coded "costs" section
  // (prices now live in the rate tables above) and the "contacts" section (its
  // email + phone are surfaced by the dark closing panel below). This matches
  // the prototype's FAQ set, whose 7th/last item is the Art. 59 "products that
  // can't be returned" exclusion rather than a Contatti accordion.
  const faqItems = doc.sections.filter(
    (s) => !/costi|costs/i.test(s.heading) && !/contatti|contact/i.test(s.heading),
  );

  const facts = [
    { Icon: Truck, label: t('shipping.factCourierLabel'), value: t('shipping.factCourierValue') },
    { Icon: Clock, label: t('shipping.factDeliveryLabel'), value: t('shipping.factDeliveryValue') },
    {
      Icon: Gift,
      label: t('shipping.factFreeLabel'),
      value: minFree != null
        ? t('shipping.factFreeValue', { amount: formatPrice(minFree, language) })
        : t('shipping.factFreeValue', { amount: '—' }),
    },
    { Icon: RotateCcw, label: t('shipping.factReturnsLabel'), value: t('shipping.factReturnsValue') },
  ];

  const steps = [
    { n: '01', title: t('shipping.step1Title'), body: t('shipping.step1Body') },
    { n: '02', title: t('shipping.step2Title'), body: t('shipping.step2Body') },
    { n: '03', title: t('shipping.step3Title'), body: t('shipping.step3Body') },
    { n: '04', title: t('shipping.step4Title'), body: t('shipping.step4Body') },
  ];

  return (
    <main className="flex-1 pt-20 sm:pt-24 pb-10 lg:pb-0">
      {/* ── Hero (warm full-bleed band) ── */}
      <section className="bg-[#f6f3ef] pb-10 lg:pb-12">
        <div className="mx-auto w-full max-w-[976px] px-6 sm:px-4">
          <div className="pt-6 lg:pt-10">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#555] transition-colors hover:text-[#111]"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {t('shipping.back')}
            </Link>
          </div>
          <div className="pb-8 pt-2.5 lg:grid lg:grid-cols-[1fr_440px] lg:items-end lg:gap-x-[72px] lg:pb-14 lg:pt-6">
            <p className="font-sans text-[11px] font-bold uppercase tracking-[1.8px] text-accent-gold lg:col-span-full">
              {t('shipping.heroEyebrow')}
            </p>
            <h1 className="mt-2.5 font-heading text-[40px] font-bold leading-[42px] tracking-[-1.6px] text-balance text-[#111] lg:min-w-0 lg:text-[56px] lg:leading-[58px] lg:tracking-[-2.4px]">
              {doc.title}
            </h1>
            <p className="mt-4 font-sans text-[16px] leading-6 text-pretty text-[#555] lg:mb-1.5 lg:mt-0 lg:text-[17px] lg:leading-[27px]">
              {t('shipping.heroLead')}
            </p>
          </div>
        </div>
      </section>

      {/* ── Key-facts strip (overlaps hero on desktop) ── */}
      <section aria-label={t('shipping.heroEyebrow')} className="relative px-6 sm:px-4">
        <dl className="mx-auto -mt-14 grid w-full max-w-[976px] grid-cols-2 overflow-hidden rounded-[24px] border border-[#e6e1dc] bg-white shadow-[0_20px_40px_-28px_rgba(0,0,0,0.25)] lg:-mt-12 lg:grid-cols-4">
          {facts.map(({ Icon, label, value }, i) => (
            <div
              key={i}
              className={cn(
                'p-[18px] pb-5 lg:px-[26px] lg:pb-[26px] lg:pt-6',
                i % 2 === 0 ? 'border-r border-[#e6e1dc]' : '',
                i < 2 ? 'border-b border-[#e6e1dc]' : '',
                'lg:border-b-0 lg:border-r lg:last:border-r-0',
              )}
            >
              <dt className="flex flex-col gap-3 text-[10.5px] font-bold uppercase leading-[14px] tracking-[1.5px] text-[#8a8580]">
                <Icon className="h-[26px] w-[26px] text-[#111] [stroke-width:1.5]" aria-hidden="true" />
                {label}
              </dt>
              <dd className="mt-1 text-[15px] font-semibold leading-[21px] text-[#111] lg:text-[17px]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Body (976px column) ── */}
      <div className="mx-auto w-full max-w-[976px] px-6 sm:px-4">
        {/* Tariffe */}
        <section id="tariffe" aria-labelledby="rates-h" className="scroll-mt-24 pt-14 lg:pt-24">
          <p className="font-sans text-[11px] font-bold uppercase tracking-[1.8px] text-accent-gold">{t('shipping.ratesEyebrow')}</p>
          <h2 id="rates-h" className="mt-2 font-heading text-[30px] font-semibold leading-9 tracking-[-0.9px] text-balance text-[#111] lg:text-[38px] lg:leading-[44px] lg:tracking-[-1.2px]">
            {t('shipping.ratesHeading')}
          </h2>
          <p className="mt-2.5 font-sans text-[15px] leading-[23px] text-[#555] lg:text-[16px] lg:leading-6">{t('shipping.ratesSub')}</p>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-[#e6e1dc] bg-white shadow-[0_20px_40px_-28px_rgba(0,0,0,0.25)] lg:mt-8 lg:rounded-[28px]">
            <RateTableInner
              title={t('shipping.ratesItalyTitle')}
              desc={t('shipping.ratesItalyDesc')}
              caption={t('shipping.ratesItalyCaption')}
              weightLabel={t('shipping.weightLabel')}
              freeFromLabel={t('shipping.freeFromRow')}
              kgLabel={kgLabel}
              zones={itZones}
              headers={itHeaders}
              weightColCls="w-[30%] lg:w-[28%]"
              language={language}
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-[24px] border border-[#e6e1dc] bg-white shadow-[0_20px_40px_-28px_rgba(0,0,0,0.25)] lg:mt-5 lg:rounded-[28px]">
            <RateTableInner
              zones={euZones}
              headers={euHeaders}
              weightLabel={t('shipping.weightLabel')}
              freeFromLabel={t('shipping.freeFromRow')}
              title={t('shipping.ratesEuropeTitle')}
              desc={t('shipping.ratesEuropeDesc')}
              caption={t('shipping.ratesEuropeCaption')}
              kgLabel={kgLabel}
              weightColCls="w-[34%] lg:w-[28%]"
              language={language}
            />
            {/* Country legend — derived from the zone descriptions (same data
                source as the rate zones), reformatted as a 2-col list. */}
            <dl className="grid gap-3.5 border-t border-[#e6e1dc] bg-[#fbf9f6] px-[18px] pb-5 pt-[18px] lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pb-[26px] lg:pt-[22px]">
              {euZones.map((z, i) => (
                <div key={z.key}>
                  <dt className="text-[10.5px] font-bold uppercase leading-[14px] tracking-[1.5px] text-accent-gold">
                    {i === 0 ? t('shipping.euZone1Label') : t('shipping.euZone2Label')}
                  </dt>
                  <dd className="mt-1 font-sans text-[13.5px] leading-5 text-[#555] lg:text-[14px] lg:leading-[21px]">
                    {cleanCountryList(z.desc)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Consegna — 4-step delivery timeline */}
        <section id="consegna" aria-labelledby="steps-h" className="scroll-mt-24 pt-14 lg:pt-24">
          <p className="font-sans text-[11px] font-bold uppercase tracking-[1.8px] text-accent-gold">{t('shipping.stepsEyebrow')}</p>
          <h2 id="steps-h" className="mt-2 font-heading text-[30px] font-semibold leading-9 tracking-[-0.9px] text-balance text-[#111] lg:text-[38px] lg:leading-[44px] lg:tracking-[-1.2px]">
            {t('shipping.stepsHeading')}
          </h2>
          <ol className="mt-6 border-t border-[#e6e1dc] lg:mt-8 lg:grid lg:grid-cols-4 lg:gap-x-8 lg:border-t-0">
            {steps.map((s, i) => (
              <li
                key={s.n}
                className={cn(
                  'grid grid-cols-[52px_1fr] border-b border-[#e6e1dc] py-5',
                  'lg:block lg:border-b-0 lg:border-t-2 lg:py-0 lg:pt-6',
                  i === 0 ? 'lg:border-t-[#111]' : 'lg:border-t-[#e6e1dc]',
                )}
              >
                <span className="font-heading text-[22px] font-light leading-[26px] tabular-nums text-accent-gold lg:mb-3.5 lg:block lg:text-[28px] lg:leading-[30px]">
                  {s.n}
                </span>
                <div>
                  <h3 className="font-heading text-[18px] font-semibold leading-[26px] tracking-[-0.3px] text-[#111] lg:text-[20px] lg:leading-7">{s.title}</h3>
                  <p className="mt-1.5 font-sans text-[14.5px] leading-[22px] text-[#666] lg:text-[15px] lg:leading-[23px]">{highlightPlaceholders(s.body)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Resi e condizioni — sticky head + FAQ accordion */}
        <section id="condizioni" aria-labelledby="terms-h" className="scroll-mt-24 pt-14 lg:grid lg:grid-cols-[320px_1fr] lg:items-start lg:gap-x-[72px] lg:pt-24">
          <div className="lg:sticky lg:top-[130px]">
            <p className="font-sans text-[11px] font-bold uppercase tracking-[1.8px] text-accent-gold">{t('shipping.faqEyebrow')}</p>
            <h2 id="terms-h" className="mt-2 font-heading text-[30px] font-semibold leading-9 tracking-[-0.9px] text-balance text-[#111] lg:text-[38px] lg:leading-[44px] lg:tracking-[-1.2px]">
              {t('shipping.faqHeading')}
            </h2>
            <p className="mt-2.5 font-sans text-[15px] leading-[23px] text-[#555] lg:text-[16px] lg:leading-6">{t('shipping.faqSub')}</p>
          </div>

          <div className="mt-6 lg:mt-0">
            {faqItems.map((section, i) => (
              <details
                key={i}
                open={i === 0}
                className="group border-b border-[#e6e1dc] [&_a]:text-[#111] [&_a]:underline [&_a]:decoration-[#c9c4bf] [&_a]:underline-offset-[3px]"
              >
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold leading-snug text-[#111] marker:hidden [&::-webkit-details-marker]:hidden lg:text-[17px]">
                  {stripLeadingNumber(section.heading)}
                  <Plus
                    className="h-5 w-5 shrink-0 text-[#8a8580] transition-transform duration-[250ms] group-open:rotate-45"
                    aria-hidden="true"
                  />
                </summary>
                <div className="pb-[22px] lg:pb-5">
                  {section.body.map((b, j) => (
                    <Fragment key={j}>{renderFaqBody(b, j)}</Fragment>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>

      {/* ── Closing dark WhatsApp/email panel ── */}
      <section
        aria-labelledby="final-h"
        className="mx-auto mt-16 w-full max-w-[976px] rounded-[28px] bg-[#111] px-6 py-11 text-center text-white sm:px-8 lg:my-24 lg:rounded-[36px] lg:px-12 lg:py-[72px]"
      >
        <h2 id="final-h" className="font-heading text-[28px] font-semibold leading-[34px] tracking-[-0.8px] text-balance lg:text-[40px] lg:leading-[46px] lg:tracking-[-1.4px]">
          {t('shipping.finalHeading')}{' '}
          <span className="text-[#bdb6ae] lg:block">{t('shipping.finalHeadingSpan')}</span>
        </h2>
        <p className="mx-auto mt-3.5 max-w-[340px] text-[15px] leading-[22px] text-[#c9c4bf] lg:max-w-none lg:text-[16px]">
          {t('shipping.finalBody')}
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-2.5 lg:mt-9 lg:flex-row lg:gap-3">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-pill bg-white px-8 text-[15px] font-medium text-[#111] transition-colors hover:bg-[#ece8e3] active:scale-[0.98]"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              {t('shipping.finalWhatsapp')}
            </a>
          )}
          <a
            href={`mailto:${WHOLESALE_EMAIL}`}
            className="inline-flex h-[52px] items-center justify-center rounded-pill border-[1.2px] border-white/40 px-6 text-[15px] font-medium text-white transition-colors hover:border-white"
          >
            {WHOLESALE_EMAIL}
          </a>
        </div>
      </section>
    </main>
  );
}

/** Short area descriptor for IT table column headers (reuses the zone desc). */
function shortArea(zone: DisplayZone, language: 'it' | 'en') {
  switch (zone.key) {
    case 'it_main':
      return language === 'en' ? 'Except islands & Calabria' : 'Tranne isole e Calabria';
    case 'it_south':
    case 'it_sard':
      return language === 'en' ? 'All provinces' : 'Tutte le province';
    default:
      return '';
  }
}

/** Turn a zone description sentence into a clean, trailing-period-free country list. */
function cleanCountryList(desc: string) {
  return desc.replace(/\.$/, '');
}

/** Count the comma-separated countries in a zone description (for the "N countries" tag). */
function countCountries(desc: string) {
  return cleanCountryList(desc).split(',').filter((s) => s.trim().length > 0).length;
}

/** Drop a leading "1. " / "6. " numbering from legal headings for cleaner FAQ summaries. */
function stripLeadingNumber(heading: string) {
  return heading.replace(/^\s*\d+\.\s*/, '');
}
