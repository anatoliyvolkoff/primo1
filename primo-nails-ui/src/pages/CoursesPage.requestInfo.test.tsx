import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ──────────────────────────────────────────────────────────────────
// i18n: return the key itself so assertions can target stable keys, and support
// the {{var}} interpolation shape CourseEnrollModal / the page rely on.
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, vars?: Record<string, string>) =>
      vars
        ? key + ' ' + Object.values(vars).join(' ')
        : key,
  }),
}));

// Toast is used by the modal; stub to no-ops.
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}));

// Store-setting hook (course_whatsapp_url) + banner hook the page reads.
vi.mock('../hooks/useStoreContent', () => ({
  useStoreSetting: () => 'https://wa.me/393893193049',
  useBanner: () => ({ image: '/x.png', mobileImage: undefined }),
}));

// SEO side-effect hook — no-op in tests.
vi.mock('../lib/useSeo', () => ({ useSeo: () => {} }));

// CoursesList pulls the courses query; stub it out entirely.
vi.mock('../components/CoursesList', () => ({
  CoursesList: () => <div data-testid="courses-list" />,
}));

// Banner is a heavy layout leaf — stub it.
vi.mock('../components/layout/Banner', () => ({
  Banner: () => <div data-testid="banner" />,
}));

// Spy on the modal so we can assert it opens (open=true) with a sane context,
// without depending on its full internal markup.
const modalCalls: Array<Record<string, unknown>> = [];
vi.mock('../components/CourseEnrollModal', () => ({
  CourseEnrollModal: (props: Record<string, unknown>) => {
    modalCalls.push(props);
    return props.open ? <div data-testid="enroll-modal" /> : null;
  },
}));

import { CoursesPage } from './CoursesPage';

const lastModalProps = () => modalCalls[modalCalls.length - 1];

describe('CoursesPage — Request Info (one-on-one) form', () => {
  beforeEach(() => {
    modalCalls.length = 0;
  });

  const fillAndSubmit = ({ name, email, message }: { name?: string; email?: string; message?: string }) => {
    const nameInput = screen.getByLabelText('courses.fullName') as HTMLInputElement;
    const emailInput = screen.getByLabelText('courses.emailPlaceholder') as HTMLInputElement;
    const messageInput = screen.getByLabelText('courses.whatDoYouNeed') as HTMLTextAreaElement;
    if (name !== undefined) fireEvent.change(nameInput, { target: { value: name } });
    if (email !== undefined) fireEvent.change(emailInput, { target: { value: email } });
    if (message !== undefined) fireEvent.change(messageInput, { target: { value: message } });
    fireEvent.click(screen.getByRole('button', { name: 'courses.submitRequest' }));
  };

  it('opens the CourseEnrollModal on a valid submission (real delivery path, not a dead form)', () => {
    render(<CoursesPage />, { wrapper: MemoryRouter });

    // Modal starts closed.
    expect(lastModalProps().open).toBe(false);
    expect(screen.queryByTestId('enroll-modal')).not.toBeInTheDocument();

    fillAndSubmit({ name: 'Anna Rossi', email: 'anna@example.com', message: 'Need gel focus' });

    // The modal opens → the user gets the WhatsApp-or-email choice backed by
    // /store/course-enrollment. This is the real fix: the form no longer no-ops.
    expect(lastModalProps().open).toBe(true);
    expect(screen.getByTestId('enroll-modal')).toBeInTheDocument();

    // WhatsApp deep-link (from the store setting) is passed through.
    expect(String(lastModalProps().whatsappUrl)).toContain('wa.me');
    // The entered context is carried into the prefilled message.
    expect(String(lastModalProps().defaultMessage)).toContain('Anna Rossi');
    expect(String(lastModalProps().defaultMessage)).toContain('anna@example.com');
    expect(String(lastModalProps().defaultMessage)).toContain('Need gel focus');
  });

  it('renders the four prototype facts (Experience / Students / Certificate / Payment)', () => {
    render(<CoursesPage />, { wrapper: MemoryRouter });

    // The desktop facts strip must mirror academy.html `.acad-facts`: the
    // experience + students claims (reused keys, not fabricated) and the
    // certificate/payment pair. Keys are echoed by the mocked t().
    expect(screen.getByText('courseDetail.teacherExpLabel')).toBeInTheDocument();
    expect(screen.getByText('courseDetail.teacherExpValue')).toBeInTheDocument();
    expect(screen.getByText('courseDetail.teacherStudentsLabel')).toBeInTheDocument();
    expect(screen.getByText('courseDetail.teacherStudentsValue')).toBeInTheDocument();
    expect(screen.getByText('courseDetail.certificates')).toBeInTheDocument();
    expect(screen.getByText('courseDetail.payment')).toBeInTheDocument();
    expect(screen.getByText('courseDetail.paymentValue')).toBeInTheDocument();

    // The old redundant "PriMo Academy / PriMo Academy" + "Su misura /
    // One-on-One Mastery" facts must be gone from the strip. `oneOnOneLabel`
    // still appears elsewhere on the page (solo section), so scope the check to
    // the facts <dl>.
    const facts = document.querySelector('dl');
    expect(facts).toBeTruthy();
    expect(facts?.textContent).not.toContain('courses.oneOnOneLabel');
    expect(facts?.textContent).not.toContain('courses.soloEyebrow');
    expect(facts?.textContent).not.toContain('courses.bannerTitle');
  });

  it('renders a per-stat icon in each of the four facts (prototype `.cx-facts dt svg`)', () => {
    render(<CoursesPage />, { wrapper: MemoryRouter });

    // The prototype's `.acad-facts` renders an SVG icon above every stat label.
    // A previous content edit set the four stats but dropped the icons; assert
    // each of the four facts cells carries exactly one svg so they can't be
    // silently removed again. Scope strictly to the facts <dl> / its cells.
    const facts = document.querySelector('dl');
    expect(facts).toBeTruthy();
    const cells = facts!.querySelectorAll(':scope > div');
    expect(cells).toHaveLength(4);
    cells.forEach((cell) => {
      // The icon lives inside the <dt> (above the label), matching the prototype.
      const dt = cell.querySelector('dt');
      expect(dt).toBeTruthy();
      expect(dt!.querySelectorAll('svg')).toHaveLength(1);
    });
  });

  it('blocks submission and shows an error when the email is missing/invalid', () => {
    render(<CoursesPage />, { wrapper: MemoryRouter });

    // Invalid email → must NOT open the modal.
    fillAndSubmit({ name: 'Anna', email: 'not-an-email', message: 'hi' });
    expect(lastModalProps().open).toBe(false);
    expect(screen.queryByTestId('enroll-modal')).not.toBeInTheDocument();

    // An error is surfaced (aria-invalid on the email field).
    const emailInput = screen.getByLabelText('courses.emailPlaceholder');
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');

    // Empty email likewise blocks.
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'courses.submitRequest' }));
    expect(lastModalProps().open).toBe(false);
  });
});
