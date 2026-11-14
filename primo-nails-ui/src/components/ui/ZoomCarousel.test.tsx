import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ZoomCarousel } from './ZoomCarousel';

const base = {
  src: 'https://cdn.test/a.jpg',
  alt: 'Alt',
  errorKey: 'k',
  multiply: true,
};

describe('ZoomCarousel (G: shared 2-slide zoom; B7 NaN guard)', () => {
  it('renders the same photo twice (slide 0 at 1×, slide 1 pre-scaled)', () => {
    const { container } = render(
      <ZoomCarousel
        {...base}
        interaction="dots"
        imgFitClassName="w-full h-full object-cover"
        zoomClassName="scale-[1.9] origin-[76%_52%]"
      />
    );
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBe(2);
    expect(imgs[0].getAttribute('src')).toBe(base.src);
    expect(imgs[1].getAttribute('src')).toBe(base.src);
    // The zoom close-up carries the pre-scale.
    expect(imgs[1].className).toContain('scale-[1.9]');
    expect(imgs[1].className).toContain('origin-[76%_52%]');
    // multiply=true → blend applied to both.
    expect(imgs[0].className).toContain('mix-blend-multiply');
  });

  it('dots variant exposes TWO real clickable dots + carousel a11y', () => {
    render(
      <ZoomCarousel
        {...base}
        interaction="dots"
        imgFitClassName="w-full h-full object-cover"
        zoomClassName="scale-[1.9] origin-[76%_52%]"
      />
    );
    // Two dot buttons labelled "Alt — 1" / "Alt — 2".
    expect(screen.getByRole('button', { name: 'Alt — 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alt — 2' })).toBeInTheDocument();
  });

  it('hover variant uses DECORATIVE dots (no dot buttons) and no carousel role', () => {
    const { container } = render(
      <ZoomCarousel
        {...base}
        interaction="hover"
        imgFitClassName="w-full h-full object-contain"
        zoomClassName="scale-[1.7] origin-[80%_45%]"
      />
    );
    // No clickable dot buttons in the hover variant.
    expect(container.querySelectorAll('button').length).toBe(0);
    // The track is not an ARIA carousel in the hover variant.
    expect(container.querySelector('[aria-roledescription="carousel"]')).toBeNull();
  });

  // B7: a scroll firing while clientWidth === 0 (jsdom default, or mid entrance
  // animation) must NOT produce an aria-current="NaN" / crash. The guard returns
  // early, so no dot flips to active.
  it('does not set an active dot (no NaN) when a scroll fires at clientWidth === 0', () => {
    const { container } = render(
      <ZoomCarousel
        {...base}
        interaction="dots"
        imgFitClassName="w-full h-full object-cover"
        zoomClassName="scale-[1.9] origin-[76%_52%]"
      />
    );
    const track = container.querySelector('[aria-roledescription="carousel"]')!;
    const dot0 = screen.getByRole('button', { name: 'Alt — 1' });
    const dot1 = screen.getByRole('button', { name: 'Alt — 2' });
    // Precondition: dot 0 active initially.
    expect(dot0.getAttribute('aria-current')).toBe('true');
    // jsdom reports clientWidth === 0; fire a scroll — the guard (clientWidth>0)
    // must swallow it so `active` never becomes Math.round(x/0) (NaN/Infinity).
    fireEvent.scroll(track);
    // Active dot unchanged; dot 1 never flips active; no "NaN" rendered anywhere.
    expect(dot0.getAttribute('aria-current')).toBe('true');
    expect(dot1.getAttribute('aria-current')).toBeNull();
    expect(screen.queryByText('NaN')).toBeNull();
  });

  // Active-dot tracking — with a non-zero clientWidth the onScroll handler maps
  // scrollLeft → the nearest slide index and flips the active dot.
  it('tracks the active dot from scrollLeft when clientWidth > 0', () => {
    const { container } = render(
      <ZoomCarousel
        {...base}
        interaction="dots"
        imgFitClassName="w-full h-full object-cover"
        zoomClassName="scale-[1.9] origin-[76%_52%]"
      />
    );
    const track = container.querySelector('[aria-roledescription="carousel"]') as HTMLElement;
    const dot0 = screen.getByRole('button', { name: 'Alt — 1' });
    const dot1 = screen.getByRole('button', { name: 'Alt — 2' });
    // jsdom has no layout; stub a real clientWidth + scrollLeft for the math.
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 200 });
    Object.defineProperty(track, 'scrollLeft', { configurable: true, value: 200 });
    fireEvent.scroll(track);
    // round(200/200) = 1 → dot 1 active, dot 0 no longer.
    expect(dot1.getAttribute('aria-current')).toBe('true');
    expect(dot0.getAttribute('aria-current')).toBeNull();
    // Scroll back towards the start.
    Object.defineProperty(track, 'scrollLeft', { configurable: true, value: 40 });
    fireEvent.scroll(track);
    expect(dot0.getAttribute('aria-current')).toBe('true');
    expect(dot1.getAttribute('aria-current')).toBeNull();
  });

  // The hover variant's active (zoom) state is threshold-based: past half a
  // viewport width it switches to slide 1, flipping the decorative widening dot.
  it('hover variant flips the decorative zoom dot past the half-width threshold', () => {
    const { container } = render(
      <ZoomCarousel
        {...base}
        interaction="hover"
        imgFitClassName="w-full h-full object-contain"
        zoomClassName="scale-[1.7] origin-[80%_45%]"
      />
    );
    const track = container.querySelector('.snap-x') as HTMLElement;
    const dotsWrap = container.querySelector('[aria-hidden="true"].absolute') as HTMLElement;
    // Two decorative <i> markers; initially the FIRST is the wide one.
    const markers = () => Array.from(dotsWrap.querySelectorAll('i'));
    expect(markers()[0].className).toContain('w-3.5');
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 200 });
    Object.defineProperty(track, 'scrollLeft', { configurable: true, value: 180 }); // > half
    fireEvent.scroll(track);
    // Now the SECOND marker is the wide/active one (active === 1).
    expect(markers()[1].className).toContain('w-3.5');
    expect(markers()[0].className).toContain('w-1.5');
  });

  it('slide 0 carries the sizes attr when provided; slide 1 never does', () => {
    const { container } = render(
      <ZoomCarousel
        {...base}
        interaction="hover"
        imgFitClassName="w-full h-full object-contain"
        zoomClassName="scale-[1.7] origin-[80%_45%]"
        slide0Sizes="(min-width: 1024px) 25vw, 100vw"
      />
    );
    const imgs = container.querySelectorAll('img');
    expect(imgs[0].getAttribute('sizes')).toBe('(min-width: 1024px) 25vw, 100vw');
    expect(imgs[1].getAttribute('sizes')).toBeNull();
  });
});
