import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NailSwatch, PILL_INSET_SHADOW } from './NailSwatch';

describe('NailSwatch', () => {
  it('renders the photo branch (an <img>) when the swatch has a moodPhoto', () => {
    const { container } = render(
      <NailSwatch
        swatch={{ color: '#D91A2A', moodPhoto: '/moods/mood-rosso.webp' }}
        alt="Rosso"
      />
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', '/moods/mood-rosso.webp');
    expect(img).toHaveAttribute('alt', 'Rosso');
    // No CSS-fallback shape element when a photo is present.
    expect(container.querySelector('span')).toBeNull();
  });

  it('renders the CSS fallback (glossy ellipse + 3 highlight layers) when there is no moodPhoto', () => {
    const { container } = render(
      <NailSwatch
        swatch={{ color: 'linear-gradient(90deg, #FFDB00 50%, #FF8C00 50%)' }}
      />
    );
    // No photo in the fallback branch.
    expect(container.querySelector('img')).toBeNull();
    const root = container.querySelector('span');
    expect(root).not.toBeNull();
    // The glossy nail shape carries the swatch colour + the inset gloss shadow.
    expect(root).toHaveStyle({
      background: 'linear-gradient(90deg, #FFDB00 50%, #FF8C00 50%)',
      boxShadow: PILL_INSET_SHADOW,
    });
    // Root + exactly three blurred highlight layers.
    expect(container.querySelectorAll('span').length).toBe(4);
  });

  it('a glittery CSS-fallback swatch still renders the glossy nail shape', () => {
    // NOTE: the glitter grain is an inline `background-image` data-URL that
    // jsdom's CSS parser drops, so it can't be asserted via the DOM here (it's
    // exercised visually in a real browser). This guards that the glitter branch
    // still renders the fallback shape rather than crashing / going blank.
    const { container } = render(
      <NailSwatch swatch={{ color: '#C89B90', isGlitter: true }} />
    );
    expect(container.querySelector('img')).toBeNull();
    const root = container.querySelector('span') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root).toHaveStyle({ background: '#C89B90' });
    // Root + three blurred highlight layers.
    expect(container.querySelectorAll('span').length).toBe(4);
  });

  it('size="grid" photo swatch uses the fixed 26x62 footprint', () => {
    const { container } = render(
      <NailSwatch
        swatch={{ color: '#000', moodPhoto: '/moods/mood-bw.webp' }}
        size="grid"
      />
    );
    const img = container.querySelector('img') as HTMLElement;
    expect(img.className).toContain('w-[26px]');
    expect(img.className).toContain('h-[62px]');
  });

  it('size="palette" (default) photo swatch fills the wrapper with a soft drop shadow', () => {
    const { container } = render(
      <NailSwatch
        swatch={{ color: '#D91A2A', moodPhoto: '/moods/mood-rosso.webp' }}
        size="palette"
      />
    );
    const img = container.querySelector('img') as HTMLElement;
    expect(img.className).toContain('w-full');
    expect(img.className).toContain('h-full');
    expect(img.className).toContain('object-contain');
    expect(img.className).toContain('drop-shadow-');
  });

  it('size="grid" CSS-fallback swatch uses the fixed 26x62 footprint + group-hover lift', () => {
    const { container } = render(
      <NailSwatch swatch={{ color: '#111' }} size="grid" />
    );
    const root = container.querySelector('span') as HTMLElement;
    expect(root.className).toContain('w-[26px]');
    expect(root.className).toContain('h-[62px]');
    expect(root.className).toContain('group-hover:-translate-y-[3px]');
  });

  it('size="palette" CSS-fallback swatch fills the wrapper (w-full h-full)', () => {
    const { container } = render(
      <NailSwatch swatch={{ color: '#111' }} size="palette" />
    );
    const root = container.querySelector('span') as HTMLElement;
    expect(root.className).toContain('w-full');
    expect(root.className).toContain('h-full');
  });

  // O&Y / black-&-white style swatches carry their split via a linear-gradient
  // in the `color` string (the `background` shorthand), NOT a backgroundImage —
  // an explicit `none` would wipe the gradient. Guard the two-tone fallback shape.
  it('renders an O&Y two-tone fallback via the background shorthand (no backgroundImage wipe)', () => {
    const { container } = render(
      <NailSwatch
        swatch={{ color: 'linear-gradient(90deg, #000 50%, #FFDB00 50%)' }}
      />
    );
    const root = container.querySelector('span') as HTMLElement;
    expect(root).toHaveStyle({
      background: 'linear-gradient(90deg, #000 50%, #FFDB00 50%)',
    });
    // Non-glitter → the gradient carried by the `background` shorthand survives
    // (it is NOT wiped to `none` by a glitter backgroundImage, which only the
    // isGlitter branch adds — here it keeps the two-tone split intact).
    expect(root.style.backgroundImage).toContain('linear-gradient');
    expect(root.style.backgroundImage).not.toBe('none');
    expect(container.querySelector('img')).toBeNull();
  });

  it('the forwarded className is merged onto the rendered element in BOTH branches', () => {
    const photo = render(
      <NailSwatch
        swatch={{ color: '#000', moodPhoto: '/m.webp' }}
        className="ring-2"
      />
    );
    expect(photo.container.querySelector('img')!.className).toContain('ring-2');

    const css = render(
      <NailSwatch swatch={{ color: '#000' }} className="ring-2" />
    );
    expect(css.container.querySelector('span')!.className).toContain('ring-2');
  });
});
