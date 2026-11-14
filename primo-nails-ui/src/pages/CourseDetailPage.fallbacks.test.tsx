import { render, screen, within } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────────────────────
// i18n: echo the key (interpolated vars appended) so assertions target stable
// keys rather than translated copy.
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, vars?: Record<string, string>) =>
      vars ? key + ' ' + Object.values(vars).join(' ') : key,
  }),
}));

vi.mock('../hooks/useStoreContent', () => ({
  useStoreSetting: () => 'https://wa.me/393893193049',
}));

vi.mock('../lib/useSeo', () => ({ useSeo: () => {} }));

vi.mock('../components/CourseEnrollModal', () => ({ CourseEnrollModal: () => null }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ id: 'h' }), useNavigate: () => vi.fn() };
});

// The one course row rendered. Swapped per-test via the mutable holder.
type UICourse = Record<string, unknown>;
const courseState: { data: UICourse | null } = { data: null };
vi.mock('../hooks/useCourses', () => ({
  useCourse: () => ({ data: courseState.data, isLoading: false }),
}));

import { MemoryRouter } from 'react-router-dom';
import { CourseDetailPage } from './CourseDetailPage';

const base = {
  id: 'c1',
  handle: 'h',
  title: 'Corso Base',
  description: 'Corso base.',
  level: 'base',
  duration: '3 giorni',
  students: '12',
  price: '690',
  nextDates: { day: '14', month: 'settembre' },
};

const renderWith = (over: Record<string, unknown>) => {
  courseState.data = { ...base, ...over };
  return render(
    <MemoryRouter>
      <CourseDetailPage />
    </MemoryRouter>,
  );
};

// The Academy-wide "what you get" fallback titles (i18n keys echoed by t()).
const FALLBACK_LEARN_KEYS = [
  'courseDetail.workKitTitle',
  'courseDetail.training360Title',
  'courseDetail.certificationTitle',
  'courseDetail.communityTitle',
  'courseDetail.monthlyPlansTitle',
  'courseDetail.cadenceTitle',
];

describe('CourseDetailPage — "Cosa imparerai" outcomes', () => {
  it('falls back to the Academy-wide default points when the course has no outcomes', () => {
    renderWith({ learningOutcomes: undefined });
    const list = document.querySelector('ul');
    expect(list).toBeTruthy();
    for (const key of FALLBACK_LEARN_KEYS) {
      expect(screen.getByText(key)).toBeInTheDocument();
    }
  });

  it('binds the per-course outcomes verbatim when present (and drops the defaults)', () => {
    renderWith({ learningOutcomes: ['Capillarità', 'Rinforzo apice'] });
    expect(screen.getByText('Capillarità')).toBeInTheDocument();
    expect(screen.getByText('Rinforzo apice')).toBeInTheDocument();
    // The generic Academy defaults must NOT appear once real outcomes exist.
    expect(screen.queryByText('courseDetail.workKitTitle')).toBeNull();
  });
});

describe('CourseDetailPage — programme (curriculum) binding + fallbacks', () => {
  it('renders no programme section at all when the curriculum is empty', () => {
    renderWith({ curriculum: undefined });
    // Section is gated on lessons.length > 0 (B10 guard mirror).
    expect(screen.queryByText('courseDetail.programHeading')).toBeNull();
    expect(document.getElementById('programma')).toBeNull();
  });

  it('renders title-only lessons with a padded number and no description block', () => {
    renderWith({ curriculum: [{ title: 'Preparazione' }, { title: 'Applicazione' }] });
    const section = document.getElementById('programma')!;
    expect(section).toBeTruthy();
    expect(within(section).getByText('Preparazione')).toBeInTheDocument();
    expect(within(section).getByText('Applicazione')).toBeInTheDocument();
    // Two lessons → numbered 01, 02 (zero-padded).
    expect(within(section).getByText('01')).toBeInTheDocument();
    expect(within(section).getByText('02')).toBeInTheDocument();
    // Title-only → the <ol> carries no description <p> rows.
    expect(section.querySelectorAll('ol p').length).toBe(0);
  });

  it('renders the per-lesson description block only when a lesson has one', () => {
    renderWith({
      curriculum: [
        { title: 'Preparazione', description: 'Pulizia della lamina' },
        { title: 'Applicazione' },
      ],
    });
    const section = document.getElementById('programma')!;
    expect(within(section).getByText('Pulizia della lamina')).toBeInTheDocument();
    // Exactly one description paragraph for the two lessons.
    expect(section.querySelectorAll('ol p').length).toBe(1);
  });
});

describe('CourseDetailPage — gallery fallbacks + binding', () => {
  const galleryImgs = () =>
    Array.from(
      document.querySelectorAll<HTMLImageElement>('.acg-item img'),
    ).map((i) => i.getAttribute('src'));

  it('falls back to the shared Academy photos when the course has no gallery', () => {
    renderWith({ gallery: undefined });
    const srcs = galleryImgs();
    expect(srcs).toHaveLength(7);
    expect(srcs[0]).toBe('/about/course1.jpg');
  });

  it('binds the per-course gallery images when present', () => {
    renderWith({ gallery: ['/g1.jpg', '/g2.jpg', '/g3.jpg'] });
    expect(galleryImgs()).toEqual(['/g1.jpg', '/g2.jpg', '/g3.jpg']);
  });
});

describe('CourseDetailPage — hero image fallback', () => {
  it('uses the editorial fallback (decorative, aria-hidden) when no course image', () => {
    renderWith({ image: undefined });
    const hero = document.querySelector<HTMLImageElement>(
      'img[src="/about-editorial/editorial-1.jpg"]',
    );
    expect(hero).toBeTruthy();
    // Fallback hero is decorative: empty alt + aria-hidden.
    expect(hero).toHaveAttribute('aria-hidden', 'true');
    expect(hero).toHaveAttribute('alt', '');
  });

  it('uses the course image (with the title as alt) when present', () => {
    renderWith({ image: '/hero.jpg' });
    const hero = document.querySelector<HTMLImageElement>('img[src="/hero.jpg"]');
    expect(hero).toBeTruthy();
    expect(hero).toHaveAttribute('alt', 'Corso Base');
    expect(hero).not.toHaveAttribute('aria-hidden');
  });
});

describe('CourseDetailPage — not-found guard', () => {
  it('shows the course-not-found panel when the course is null', () => {
    courseState.data = null;
    render(
      <MemoryRouter>
        <CourseDetailPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('courseDetail.courseNotFound')).toBeInTheDocument();
    // No gallery / programme rendered in the not-found state.
    expect(document.getElementById('programma')).toBeNull();
    expect(document.querySelector('.acg-item img')).toBeNull();
  });
});
