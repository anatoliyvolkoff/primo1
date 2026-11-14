import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  SectionTitle,
  SECTION_TITLE_CLASS,
  SECTION_SUBTITLE_CLASS,
} from './SectionTitle';

describe('SectionTitle', () => {
  it('renders the title with the base token class and no eyebrow/subtitle by default', () => {
    render(<SectionTitle title="Palette" />);
    const heading = screen.getByRole('heading', { name: 'Palette' });
    // Phones use the Primo1 30px title; the desktop base is unchanged.
    expect(heading.className).toContain('max-lg:text-[30px]');
    expect(heading.className).toContain('text-[clamp(32px,6vw,48px)]');
    // Base token is applied verbatim.
    for (const tok of SECTION_TITLE_CLASS.split(' ')) {
      expect(heading.className).toContain(tok);
    }
    // No subtitle paragraph when none is passed.
    expect(document.querySelector('p')).toBeNull();
  });

  it('renders an optional eyebrow kicker above the title', () => {
    render(<SectionTitle eyebrow="Academy" title="Courses" />);
    const eyebrow = screen.getByText('Academy');
    expect(eyebrow.tagName).toBe('SPAN');
    expect(eyebrow.className).toContain('uppercase');
    expect(eyebrow.className).toContain('tracking-[0.3em]');
  });

  it('merges titleClassName / subtitleClassName overrides onto the base tokens', () => {
    render(
      <SectionTitle
        title="T"
        subtitle="S"
        titleClassName="lg:text-[38px]"
        subtitleClassName="lg:leading-[22px]"
      />
    );
    const heading = screen.getByRole('heading', { name: 'T' });
    expect(heading.className).toContain('lg:text-[38px]');
    // Base token still present (additive, not replaced).
    expect(heading.className).toContain('text-[clamp(32px,6vw,48px)]');

    const subtitle = screen.getByText('S');
    expect(subtitle.className).toContain('lg:leading-[22px]');
    for (const tok of SECTION_SUBTITLE_CLASS.split(' ')) {
      expect(subtitle.className).toContain(tok);
    }
  });
});
