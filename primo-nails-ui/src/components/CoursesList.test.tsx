import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UICourse } from '../hooks/useCourses';

// ── Mocks ──────────────────────────────────────────────────────────────────
// i18n: echo the key so assertions can target stable keys.
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

// Animation wrapper → plain div (strip motion-only props so they don't leak to
// the DOM and warn).
vi.mock('motion/react', () => {
  // Strip motion-only props so they don't leak onto the DOM node.
  const strip = ({ initial: _i, whileInView: _w, viewport: _v, transition: _t, ...rest }: any) => rest;
  return {
    motion: {
      div: (props: any) => <div {...strip(props)} />,
      create: (Comp: any) => (props: any) => <Comp {...strip(props)} />,
    },
  };
});

// Drive the course list the component renders.
const coursesState: { data: UICourse[]; isLoading: boolean; isError: boolean } = {
  data: [],
  isLoading: false,
  isError: false,
};
vi.mock('../hooks/useCourses', () => ({
  useCourses: () => ({ ...coursesState, refetch: vi.fn() }),
}));

import { CoursesList } from './CoursesList';

const FULL: UICourse = {
  id: 'c1',
  handle: 'onicotecnica-base',
  title: 'Onicotecnica Corso Base',
  description: 'A long English description that should be clamped to two lines so it can never push the footer around.',
  level: 'Base',
  duration: '7 lessons',
  students: '',
  tag: 'Base',
  image: '/img/a.jpg',
  nextDates: { day: '12', month: 'Mar' },
};

// A course missing every optional field — proves we never fabricate a
// level/date/duration/image and that the card still renders.
const SPARSE: UICourse = {
  id: 'c2',
  handle: 'bare',
  title: 'Bare Course',
  description: '',
  level: '',
  duration: '',
  students: '',
};

function renderList(props: { showAll?: boolean }, data: UICourse[]) {
  coursesState.data = data;
  coursesState.isLoading = false;
  coursesState.isError = false;
  return render(
    <MemoryRouter>
      <CoursesList {...props} />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('CoursesList — Academy (/corsi) compact card', () => {
  it('renders the prototype card parts from the data fields that exist', () => {
    renderList({ showAll: true }, [FULL]);

    // Title (and image) link to the course detail. Both carry the title as their
    // accessible name, so assert every such link points at the handle.
    const titleLinks = screen.getAllByRole('link', { name: FULL.title });
    expect(titleLinks.length).toBeGreaterThan(0);
    titleLinks.forEach((l) => expect(l).toHaveAttribute('href', `/corsi/${FULL.handle}`));

    // Level/tag eyebrow + "Details" footer are present. No fabricated rating:
    // the course model has no rating/review field so we don't render one.
    expect(screen.getByText('Base')).toBeTruthy();
    expect(screen.queryByText('courses.ratingLabel')).toBeNull();
    expect(screen.queryByText(/recensioni|reviews/i)).toBeNull();
    expect(screen.getByText('courses.details')).toBeTruthy();

    // Meta line = "date · duration", built from existing fields only.
    expect(screen.getByText('12 Mar · 7 lessons')).toBeTruthy();
  });

  it('does not fabricate meta/level/date when the course lacks them', () => {
    renderList({ showAll: true }, [SPARSE]);

    // Title still renders.
    expect(screen.getAllByRole('link', { name: SPARSE.title }).length).toBeGreaterThan(0);
    // No invented level eyebrow, no calendar meta line.
    expect(screen.queryByText('Base')).toBeNull();
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it('is EN-adaptive: shrinkable children (min-w-0) and clamped description', () => {
    const { container } = renderList({ showAll: true }, [FULL]);

    // Long description is clamped so it cannot overflow the card height.
    const desc = screen.getByText(FULL.description);
    expect(desc.className).toContain('line-clamp-2');

    // At least one min-w-0 child so long EN strings wrap instead of overflowing
    // a fixed-width track.
    expect(container.querySelector('.min-w-0')).toBeTruthy();
  });
});

describe('CoursesList — Home teaser renders the redesign rail', () => {
  it('renders the prototype heading, card, and "view full catalogue" CTA', () => {
    renderList({ showAll: false }, [FULL]);

    // Prototype heading "I corsi di Irina PriMo" (dedicated courses.railTitle key).
    expect(screen.getByText('courses.railTitle')).toBeTruthy();
    // Title links to the detail page; blurb is rendered.
    const titleLinks = screen.getAllByRole('link', { name: FULL.title });
    expect(titleLinks.length).toBeGreaterThan(0);
    titleLinks.forEach((l) => expect(l).toHaveAttribute('href', `/corsi/${FULL.handle}`));
    expect(screen.getByText(FULL.description)).toBeTruthy();
    // The outline "Tutti i corsi" / view-full-catalogue CTA links to /corsi.
    const allLink = screen.getByRole('link', { name: /courses\.allCourses/ });
    expect(allLink).toHaveAttribute('href', '/corsi');
  });

  it('does NOT fabricate a review count and has no Academy grid / solo tile', () => {
    // The course model has no review-count field; the prototype's "N recensioni"
    // pill is intentionally omitted rather than fabricated.
    const { container } = renderList({ showAll: false }, [FULL]);
    expect(screen.queryByText(/recensioni|reviews/i)).toBeNull();
    // The rail is not the Academy 3-col grid, and there is no dark "solo" tile.
    expect(container.querySelector('.lg\\:grid-cols-3')).toBeNull();
    expect(container.querySelector('a[href="#solo"]')).toBeNull();
    // Academy-only "Details" footer affordance is absent from the teaser.
    expect(screen.queryByText('courses.details')).toBeNull();
  });
});

describe('CoursesList — Academy dark "solo" promo tile sizing', () => {
  // Helper: build N identical courses so we can drive the grid's fill.
  const makeCourses = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ ...FULL, id: `c${i}`, handle: `h${i}` }));

  it('does NOT force equal-height tracks, so a lone tile stays a normal card height', () => {
    const { container } = renderList({ showAll: true }, makeCourses(6));

    const grid = container.querySelector('.lg\\:grid');
    expect(grid).toBeTruthy();
    // Prototype `.acad-cards` has NO grid-auto-rows rule: rows auto-size to
    // their content. Forcing `1fr` tracks made the lone row-3 tile (6 courses)
    // stretch into an over-tall full-width band — the regression this fixes.
    expect(grid?.className).not.toContain('grid-auto-rows');

    // The dark promo tile is present, links to #solo, and carries the inverted
    // (#111) styling + full card padding — not a shrunken variant.
    const tile = container.querySelector('a[href="#solo"]');
    expect(tile).toBeTruthy();
    expect(tile?.className).toContain('bg-[#111]');
    expect(tile?.className).toContain('lg:p-[30px]');
  });

  it('spans only the REMAINING columns of the last partial row (never a full-width band)', () => {
    // In a 3-col grid the tile lands at grid position = visible card count.
    // Span = (count % 3 === 0) ? 1 : 3 − count%3, so the tile fills the trailing
    // slots of a partial row but, when the cards already fill the last row
    // exactly, stays a single-column card rather than stretching to full width.
    // This holds for every course count — and, with the level filter, for every
    // filtered VISIBLE count.
    const spanOf = (tile: Element | null) =>
      (tile as HTMLElement | null)?.style.gridColumn;

    // 6 courses (the live "All" view): 6 % 3 === 0 → the tile starts a fresh
    // row ALONE and stays a normal single-column card (span 1), NOT a full-width
    // span-3 black band. This is the regression under test.
    {
      const { container } = renderList({ showAll: true }, makeCourses(6));
      expect(spanOf(container.querySelector('a[href="#solo"]'))).toBe('span 1');
    }

    // 5 courses (the prototype count): tile is the last cell of a full row →
    // spans 1 column, a normal single-cell card, exactly as the prototype renders.
    {
      const { container } = renderList({ showAll: true }, makeCourses(5));
      expect(spanOf(container.querySelector('a[href="#solo"]'))).toBe('span 1');
    }

    // 4 courses: one full row + 1 card, so the tile fills the 2 trailing columns.
    {
      const { container } = renderList({ showAll: true }, makeCourses(4));
      expect(spanOf(container.querySelector('a[href="#solo"]'))).toBe('span 2');
    }
  });

  it('recomputes the span from the VISIBLE card count when a level filter hides cards', () => {
    // Two levels → the filter renders. Hidden cards use display:none (they leave
    // grid flow), so the span must follow the visible count, not the total.
    const mixed = [
      { ...FULL, id: 'a0', handle: 'a0', level: 'Base', tag: 'Base' },
      { ...FULL, id: 'a1', handle: 'a1', level: 'Base', tag: 'Base' },
      { ...FULL, id: 'a2', handle: 'a2', level: 'Base', tag: 'Base' },
      { ...FULL, id: 'a3', handle: 'a3', level: 'Avanzato', tag: 'Avanzato' },
    ];
    const { container } = renderList({ showAll: true }, mixed);
    const spanOf = () =>
      (container.querySelector('a[href="#solo"]') as HTMLElement | null)?.style.gridColumn;

    // Unfiltered: 4 visible → 4 % 3 === 1 → tile spans the 2 trailing columns.
    expect(spanOf()).toBe('span 2');

    // Filter to "Avanzato" (1 visible card): 1 % 3 === 1 → tile spans 2 columns
    // so it still fills the row's right edge rather than orphaning.
    fireEvent.click(screen.getByRole('button', { name: 'Avanzato' }));
    expect(spanOf()).toBe('span 2');
  });
});

// The whole card is one link to the course: a click on the photo, the blurb or the
// empty space opens it, and there are no nested links inside.
describe('CoursesList — the whole course card is clickable', () => {
  it.each([
    ['Home rail', false],
    ['Academy grid', true],
  ])('%s: card is a single link to the course, named by its title', (_label, showAll) => {
    const { container } = renderList({ showAll }, [FULL]);

    const card = screen.getByRole('link', { name: FULL.title });
    expect(card).toHaveAttribute('href', `/corsi/${FULL.handle}`);
    // Photo, blurb and CTA all sit inside that one link.
    expect(card).toContainElement(screen.getByText(FULL.description));
    expect(card.querySelector('img')).toBeTruthy();
    expect(card.querySelector('a')).toBeNull();
    // Exactly one link per course.
    expect(container.querySelectorAll(`a[href="/corsi/${FULL.handle}"]`)).toHaveLength(1);
  });
});
