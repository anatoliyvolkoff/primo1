import { Fragment, type Key } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSeo } from '../lib/useSeo';
import type { BilingualDoc, LegalBody } from '../data/legal';
import { Container, Heading } from './ui';
import { LegalSectionIndex } from './legal/LegalSectionIndex';

/** Render text, highlighting [[placeholder]] tokens the client still needs to fill. */
function renderText(text: string) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  return parts.map((part, i) =>
    /^\[\[[^\]]+\]\]$/.test(part) ? (
      <mark
        key={i}
        className="bg-brand-accent/20 text-foreground rounded px-1 py-0.5 font-semibold"
        title="To be completed before publishing"
      >
        {part.slice(2, -2)}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

function renderBody(body: LegalBody, key: Key) {
  if (typeof body === 'string') {
    return (
      <p key={key} className="text-muted-foreground leading-relaxed mb-4 text-[15px] sm:text-base">
        {renderText(body)}
      </p>
    );
  }
  return (
    <ul key={key} className="list-disc pl-5 mb-4 space-y-2 text-muted-foreground text-[15px] sm:text-base marker:text-accent-gold">
      {body.list.map((item, i) => (
        <li key={i} className="leading-relaxed">{renderText(item)}</li>
      ))}
    </ul>
  );
}

interface LegalPageProps {
  doc: BilingualDoc;
  canonicalPath: string;
}

export function LegalPage({ doc, canonicalPath }: LegalPageProps) {
  const { language } = useLanguage();
  const d = language === 'en' ? doc.en : doc.it;
  const eyebrow = language === 'en' ? 'Legal' : 'Legale';

  useSeo({
    title: d.title,
    description: d.metaDescription,
    canonicalPath,
    // Legal boilerplate shouldn't compete with product/content pages in search.
    noindex: true,
  });

  const indexItems = d.sections.map((section, i) => ({
    id: `sec-${i}`,
    heading: section.heading,
  }));

  return (
    <main className="flex-1 pt-24 sm:pt-28 pb-20 sm:pb-28">
      <Container>
        <header className="max-w-[68ch] mx-auto mb-8 sm:mb-12">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-accent-gold">
            {eyebrow}
          </p>
          <h1 className="font-heading font-bold leading-none tracking-tight text-card-foreground text-[clamp(30px,6vw,48px)] mt-3">
            {d.title}
          </h1>
          <p className="font-sans text-[13px] text-muted-foreground font-medium mt-4">
            {d.updatedLabel}: {d.updated}
          </p>
        </header>

        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 lg:items-start">
          <div className="mb-8 lg:mb-0">
            <LegalSectionIndex items={indexItems} />
          </div>

          <article className="max-w-[68ch] lg:max-w-[72ch] rounded-[1.5rem] border border-border bg-card p-6 sm:p-10 shadow-sm">
            {d.intro.map((b, i) => renderBody(b, `intro-${i}`))}

            <div className="mt-6 divide-y divide-accent-gold/25">
              {d.sections.map((section, i) => (
                <section
                  key={i}
                  aria-labelledby={`sec-${i}`}
                  className="py-8 first:pt-0 last:pb-0"
                >
                  <Heading level={2} size="md" id={`sec-${i}`} className="mb-4 scroll-mt-28">
                    {section.heading}
                  </Heading>
                  {section.body.map((b, j) => renderBody(b, j))}
                </section>
              ))}
            </div>

            {d.disclaimer && (
              <p className="font-sans mt-8 pt-8 border-t border-border text-[12px] leading-relaxed text-muted-foreground italic">
                {d.disclaimer}
              </p>
            )}
          </article>
        </div>
      </Container>
    </main>
  );
}
