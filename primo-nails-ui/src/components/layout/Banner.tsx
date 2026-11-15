import React from 'react';

interface BannerProps {
  title: string;
  subtitle?: string;
  imageUrl: string;
  /** Optional separate crop shown on small screens (≤640px). Falls back to imageUrl. */
  mobileImageUrl?: string;
  overlayOpacity?: string;
  /**
   * `catalog` follows the Primo1 catalogue hero (`.cat-hero`): a 196px photo
   * on phones (391px on tablets) (the heading stays for screen readers), and on desktop a
   * 356px band with the text left-aligned in the 976px column. The default
   * keeps the centred title over the photo.
   */
  variant?: 'center' | 'catalog';
}

export const Banner: React.FC<BannerProps> = ({
  title,
  subtitle,
  imageUrl,
  mobileImageUrl,
  overlayOpacity = 'bg-black/30',
  variant = 'center',
}) => {
  const isCatalog = variant === 'catalog';
  const picture = (
    <picture>
      {mobileImageUrl && (
        <source media="(max-width: 640px)" srcSet={mobileImageUrl} />
      )}
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        sizes="100vw"
        className="w-full h-full object-cover object-center"
      />
    </picture>
  );

  if (isCatalog) {
    return (
      <div className="relative h-[196px] sm:h-[391px] lg:h-[356px] overflow-hidden bg-[#1d1d1d]">
        {picture}
        {/* The photo is admin-set, so desktop keeps a light scrim behind the
            white text for legibility; phones show the photo alone. */}
        <div aria-hidden="true" className="hidden lg:block absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.45)_0%,rgba(0,0,0,.2)_55%,rgba(0,0,0,0)_100%)]" />
        <div data-banner-text className="max-lg:sr-only lg:absolute lg:left-[calc(50%-478px)] lg:top-[183.5px] lg:max-w-[700px] text-left text-white">
          <h1 className="lg:text-[35px] lg:leading-[45px] lg:font-bold lg:tracking-[-0.08px] drop-shadow-md">
            {title}
          </h1>
          {subtitle && (
            <p className="lg:mt-1 lg:text-[19px] lg:leading-[30px] lg:font-bold lg:tracking-[0.31px] text-white/90 drop-shadow-md">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[38vh] min-h-[256px] sm:h-[40vh] sm:min-h-[300px] md:min-h-[360px] lg:min-h-[440px] overflow-hidden">
      {picture}
      <div className={`absolute inset-0 ${overlayOpacity} flex items-center justify-center px-4`}>
        <div data-banner-text className="container-premium text-center text-white">
          <h1 className="text-[clamp(32px,7vw,80px)] font-semibold tracking-tighter mb-3 sm:mb-4 drop-shadow-2xl leading-[1.05]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-white/80 max-w-2xl mx-auto text-sm sm:text-base md:text-xl font-light drop-shadow-md">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
