import { render, screen } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────────────────────
// i18n: echo the key so assertions target stable keys rather than translated copy.
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

vi.mock('../components/CourseEnrollModal', () => ({
  CourseEnrollModal: () => null,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'onicotecnica-base' }),
    useNavigate: () => vi.fn(),
  };
});

// Course curriculum is swapped per-test via this mutable holder.
const courseState: { curriculum: string[] | null } = { curriculum: ['Lezione uno'] };
vi.mock('../hooks/useCourses', () => ({
  useCourse: () => ({
    data: {
      id: 'c1',
      handle: 'onicotecnica-base',
      title: 'Onicotecnica Base',
      description: 'Corso base.',
      level: 'base',
      duration: '3 giorni',
      students: '12',
      curriculum: courseState.curriculum,
      price: '690',
      nextDates: { day: '14', month: 'settembre' },
    },
    isLoading: false,
  }),
}));

import { MemoryRouter } from 'react-router-dom';
import { CourseDetailPage } from './CourseDetailPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <CourseDetailPage />
    </MemoryRouter>,
  );

describe('CourseDetailPage — hero "view program" CTA', () => {
  it('renders the #programma anchor CTA when the course has a curriculum', () => {
    courseState.curriculum = ['Lezione uno'];
    renderPage();
    const cta = screen.getByText('courseDetail.viewProgram');
    expect(cta).toHaveAttribute('href', '#programma');
  });

  it('hides the CTA when the curriculum is empty (no #programma target)', () => {
    courseState.curriculum = [];
    renderPage();
    expect(screen.queryByText('courseDetail.viewProgram')).toBeNull();
  });

  it('hides the CTA when the curriculum is null', () => {
    courseState.curriculum = null;
    renderPage();
    expect(screen.queryByText('courseDetail.viewProgram')).toBeNull();
  });
});
