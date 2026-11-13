import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { HeroSlide } from '../../hooks/useStoreContent';

// ── Mocks ──────────────────────────────────────────────────────────────────
// i18n: echo the key so assertions stay stable.
vi.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));

// Legacy content.json fallback + hero layout geometry the component reads.
vi.mock('../../context/ContentContext', () => ({
  useContent: () => ({
    content: {
      hero: {
        images: ['/legacy-1.jpg'],
        layout: {
          imageHeight: 80,
          paddingTop: 140,
          imageObjectFit: 'cover',
          contentMaxWidth: 700,
        },
      },
    },
  }),
}));

// motion/react → plain nodes; strip motion-only props so they don't leak.
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: (props: any) => {
      const {
        initial: _i, animate: _a, exit: _e, transition: _t,
        drag: _d, dragConstraints: _dc, dragElastic: _de,
        onDragStart: _ds, onDragEnd: _den, ...rest
      } = props;
      return <div {...rest}>{props.children}</div>;
    },
  },
}));

// Drive the hero slides the component renders.
const storeState: { data: { heroSlides: HeroSlide[] } | undefined } = { data: undefined };
vi.mock('../../hooks/useStoreContent', () => ({
  useStoreContent: () => ({ data: storeState.data }),
}));

import { Hero } from './Hero';

const renderHero = () => render(<MemoryRouter><Hero /></MemoryRouter>);

afterEach(() => {
  cleanup();
  storeState.data = undefined;
});

const videoSlide = (over: Partial<HeroSlide> = {}): HeroSlide => ({
  id: 'v1',
  image_url: '/still.jpg',
  video_url: '/hero.mp4',
  ...over,
} as HeroSlide);

describe('Hero video slide', () => {
  // B1: the <video> must actually carry a source so it isn't a black box.
  it('renders a <video> with the slide video as its src', () => {
    storeState.data = { heroSlides: [videoSlide()] };
    const { container } = renderHero();
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('src', '/hero.mp4');
    // Playback attributes preserved.
    expect(video).toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('loop');
    expect(video).toHaveAttribute('playsinline');
    expect((video as HTMLVideoElement).muted).toBe(true);
  });

  // B3: the still image must survive — as poster + a native <img> fallback.
  it('keeps the still image as poster and native <img> fallback', () => {
    storeState.data = { heroSlides: [videoSlide({ poster_url: null })] };
    const { container } = renderHero();
    const video = container.querySelector('video');
    // poster falls back to the still image when no explicit poster_url.
    expect(video).toHaveAttribute('poster', '/still.jpg');
    // native fallback child <img> points at the still image.
    const fallbackImg = video?.querySelector('img');
    expect(fallbackImg).not.toBeNull();
    expect(fallbackImg).toHaveAttribute('src', '/still.jpg');
  });

  it('prefers an explicit poster_url over the still image', () => {
    storeState.data = { heroSlides: [videoSlide({ poster_url: '/poster.jpg' })] };
    const { container } = renderHero();
    expect(container.querySelector('video')).toHaveAttribute('poster', '/poster.jpg');
  });

  // B3: a broken video degrades to the image, never a black box.
  it('swaps to the still image when the video errors', () => {
    storeState.data = { heroSlides: [videoSlide()] };
    const { container } = renderHero();
    const video = container.querySelector('video')!;
    fireEvent.error(video);
    expect(container.querySelector('video')).toBeNull();
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/still.jpg');
  });
});

describe('Hero image slide (no video)', () => {
  // Geometry + empty-field fallback intact: no video → a plain image slide.
  it('renders only the image when the slide has no video', () => {
    storeState.data = { heroSlides: [{ id: 'i1', image_url: '/pic.jpg' } as HeroSlide] };
    const { container } = renderHero();
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('src', '/pic.jpg');
  });

  it('falls back to legacy content images when no remote slides exist', () => {
    storeState.data = undefined;
    const { container } = renderHero();
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('src', '/legacy-1.jpg');
  });
});

describe('Hero per-slide copy + CTA binding', () => {
  // The full-copy slide: title/subtitle/both CTAs all set → all bound verbatim.
  const fullSlide: HeroSlide = {
    id: 's1',
    image_url: '/pic.jpg',
    title: 'Slide Title',
    subtitle: 'Slide subtitle copy',
    cta_label: 'Shop Gel',
    cta_link: '/semipermanente',
    cta2_label: 'Our Story',
    cta2_link: '/about-us',
  } as HeroSlide;

  it('binds per-slide title, subtitle and both CTAs when present', () => {
    storeState.data = { heroSlides: [fullSlide] };
    renderHero();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Slide Title');
    expect(screen.getByText('Slide subtitle copy')).toBeTruthy();
    const primary = screen.getByRole('link', { name: 'Shop Gel' });
    expect(primary).toHaveAttribute('href', '/semipermanente');
    const secondary = screen.getByRole('link', { name: 'Our Story' });
    expect(secondary).toHaveAttribute('href', '/about-us');
  });

  it('falls back to the default copy + default CTAs when the slide leaves them blank', () => {
    storeState.data = { heroSlides: [{ id: 's2', image_url: '/pic.jpg' } as HeroSlide] };
    renderHero();
    // Default hero copy keys (echoed by the mocked t()).
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('hero.title');
    expect(screen.getByText('hero.subtitle')).toBeTruthy();
    // Default CTA labels + Primo1's in-page targets.
    expect(screen.getByRole('link', { name: 'hero.cta' })).toHaveAttribute(
      'href',
      '#bestsellers',
    );
    expect(screen.getByRole('link', { name: 'hero.secondaryCta' })).toHaveAttribute(
      'href',
      '#founder',
    );
  });

  it('uses the default CTA when only a label (but no link) is provided', () => {
    // A CTA renders custom ONLY when BOTH label and link are set; a half-filled
    // CTA must degrade to the default rather than link nowhere.
    storeState.data = {
      heroSlides: [{ id: 's3', image_url: '/pic.jpg', cta_label: 'Dangling' } as HeroSlide],
    };
    renderHero();
    expect(screen.queryByRole('link', { name: 'Dangling' })).toBeNull();
    expect(screen.getByRole('link', { name: 'hero.cta' })).toHaveAttribute(
      'href',
      '#bestsellers',
    );
  });

  it('renders an external CTA link as a new-tab <a> with rel safety', () => {
    storeState.data = {
      heroSlides: [
        {
          id: 's4',
          image_url: '/pic.jpg',
          cta_label: 'External',
          cta_link: 'https://example.com/promo',
        } as HeroSlide,
      ],
    };
    renderHero();
    const link = screen.getByRole('link', { name: 'External' });
    expect(link).toHaveAttribute('href', 'https://example.com/promo');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('wraps the media in the slide link when a slide-level link is set', () => {
    storeState.data = {
      heroSlides: [{ id: 's5', image_url: '/pic.jpg', link: '/semipermanente' } as HeroSlide],
    };
    const { container } = renderHero();
    // The image is wrapped by an anchor pointing at the slide link.
    const wrapped = container.querySelector('a[href="/semipermanente"] img');
    expect(wrapped).toBeTruthy();
  });
});

describe('Hero video — reduced motion', () => {
  afterEach(() => {
    // Restore the matchMedia stub installed below.
    vi.unstubAllGlobals();
  });

  it('does not auto-play the video under prefers-reduced-motion', () => {
    // Stub matchMedia so the reduced-motion branch pauses rather than plays.
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});

    storeState.data = { heroSlides: [videoSlide()] };
    renderHero();

    // The slide renders a <video>, but the reduced-motion branch never starts it.
    expect(play).not.toHaveBeenCalled();
    play.mockRestore();
    pause.mockRestore();
  });
});
