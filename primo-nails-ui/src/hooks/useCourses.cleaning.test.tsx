import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ──────────────────────────────────────────────────────────────────
// The SDK fetch is the single network seam; drive it per-test.
const fetchMock = vi.fn();
vi.mock('../lib/medusa', () => ({
  sdk: { client: { fetch: (...args: unknown[]) => fetchMock(...args) } },
}));

// Language is swapped per-test to exercise the locale re-projection.
const langState = { language: 'it' };
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ language: langState.language }),
}));

import { useCourses, useCourse, type Course } from './useCourses';

// A fully-populated raw Medusa course row. Individual tests spread/override it.
const rawCourse = (over: Partial<Course> = {}): Course =>
  ({
    id: 'c1',
    handle: 'onicotecnica-base',
    title: 'Corso Base',
    description: 'Descrizione IT',
    full_description: 'Full IT',
    level: 'Base',
    duration: '3 giorni',
    students_label: '12 studenti',
    tag: 'Base',
    image_url: '/img/a.jpg',
    price_eur: 690,
    next_date_day: '14',
    next_date_month: 'settembre',
    curriculum: ['Lezione uno', 'Lezione due'],
    learning_outcomes: ['Outcome A', 'Outcome B'],
    gallery: ['/g1.jpg', '/g2.jpg'],
    sort_order: 0,
    is_published: true,
    metadata: null,
    ...over,
  }) as Course;

// A fresh client per-test so cached data never leaks between cases, and retries
// are off so a thrown queryFn surfaces as isError immediately.
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  langState.language = 'it';
});

describe('useCourses — list mapping + field cleaning', () => {
  it('maps a raw row to the UI shape with cleaned curriculum / outcomes / gallery', async () => {
    fetchMock.mockResolvedValue({ courses: [rawCourse()] });
    const { result } = renderHook(() => useCourses(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [c] = result.current.data;
    expect(c).toMatchObject({
      id: 'c1',
      handle: 'onicotecnica-base',
      title: 'Corso Base',
      description: 'Descrizione IT',
      fullDescription: 'Full IT',
      level: 'Base',
      duration: '3 giorni',
      students: '12 studenti',
      tag: 'Base',
      image: '/img/a.jpg',
      price: '690',
      nextDates: { day: '14', month: 'settembre' },
    });
    // Curriculum normalized to {title}[]; outcomes/gallery passed through clean.
    expect(c.curriculum).toEqual([{ title: 'Lezione uno' }, { title: 'Lezione due' }]);
    expect(c.learningOutcomes).toEqual(['Outcome A', 'Outcome B']);
    expect(c.gallery).toEqual(['/g1.jpg', '/g2.jpg']);
  });

  it('drops empty/whitespace outcome + gallery rows and collapses all-empty to undefined', async () => {
    fetchMock.mockResolvedValue({
      courses: [
        rawCourse({
          learning_outcomes: ['  Keep  ', '', '   ', null as unknown as string],
          gallery: ['', '  '],
        }),
      ],
    });
    const { result } = renderHook(() => useCourses(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [c] = result.current.data;
    // cleanStrings keeps only truthy-after-trim entries (but does NOT trim the
    // kept value itself — the component trims where it matters).
    expect(c.learningOutcomes).toEqual(['  Keep  ']);
    // An all-empty gallery collapses to undefined so the UI falls back.
    expect(c.gallery).toBeUndefined();
  });

  it('leaves optional fields undefined when the row omits them (never fabricated)', async () => {
    fetchMock.mockResolvedValue({
      courses: [
        rawCourse({
          full_description: null,
          students_label: null,
          tag: null,
          image_url: null,
          price_eur: null,
          next_date_day: null,
          next_date_month: null,
          curriculum: null,
          learning_outcomes: null,
          gallery: null,
        }),
      ],
    });
    const { result } = renderHook(() => useCourses(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [c] = result.current.data;
    expect(c.fullDescription).toBeUndefined();
    expect(c.students).toBe('');
    expect(c.tag).toBeUndefined();
    expect(c.image).toBeUndefined();
    expect(c.price).toBeUndefined();
    expect(c.nextDates).toBeUndefined();
    expect(c.curriculum).toBeUndefined();
    expect(c.learningOutcomes).toBeUndefined();
    expect(c.gallery).toBeUndefined();
  });

  it('drops nextDates when only one of day/month is present', async () => {
    fetchMock.mockResolvedValue({
      courses: [rawCourse({ next_date_day: '14', next_date_month: null })],
    });
    const { result } = renderHook(() => useCourses(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].nextDates).toBeUndefined();
  });

  it('coerces a zero price to the string "0" (price present, not dropped)', async () => {
    fetchMock.mockResolvedValue({ courses: [rawCourse({ price_eur: 0 })] });
    const { result } = renderHook(() => useCourses(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // price_eur != null, so a free course keeps its "0" rather than vanishing.
    expect(result.current.data[0].price).toBe('0');
  });

  it('tolerates a missing `courses` key in the response (empty list)', async () => {
    fetchMock.mockResolvedValue({});
    const { result } = renderHook(() => useCourses(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe('useCourses — EN translation overlay', () => {
  it('overlays EN title/description/full_description from metadata.translations', async () => {
    langState.language = 'en';
    fetchMock.mockResolvedValue({
      courses: [
        rawCourse({
          metadata: {
            translations: {
              title: { en: 'Base Course' },
              description: { en: 'EN description' },
              full_description: { en: 'EN full' },
            },
          },
        }),
      ],
    });
    const { result } = renderHook(() => useCourses(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [c] = result.current.data;
    expect(c.title).toBe('Base Course');
    expect(c.description).toBe('EN description');
    expect(c.fullDescription).toBe('EN full');
  });

  it('falls back to the IT base when an EN override is blank or absent', async () => {
    langState.language = 'en';
    fetchMock.mockResolvedValue({
      courses: [
        rawCourse({
          metadata: { translations: { title: { en: '   ' } } },
        }),
      ],
    });
    const { result } = renderHook(() => useCourses(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Whitespace-only EN → IT base kept; missing description override → IT base.
    expect(result.current.data[0].title).toBe('Corso Base');
    expect(result.current.data[0].description).toBe('Descrizione IT');
  });
});

describe('useCourse — single course + not-found vs error', () => {
  it('maps the single course when the handle resolves', async () => {
    fetchMock.mockResolvedValue({ course: rawCourse() });
    const { result } = renderHook(() => useCourse('onicotecnica-base'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.handle).toBe('onicotecnica-base');
    expect(result.current.data?.curriculum).toEqual([
      { title: 'Lezione uno' },
      { title: 'Lezione due' },
    ]);
  });

  it('returns null (not an error) on a genuine 404', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('nope'), { status: 404 }));
    const { result } = renderHook(() => useCourse('ghost'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('surfaces a non-404 failure as isError (so retry/5xx is not masked as not-found)', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }));
    const { result } = renderHook(() => useCourse('onicotecnica-base'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('is disabled (no fetch) when the handle is undefined', async () => {
    const { result } = renderHook(() => useCourse(undefined), { wrapper: makeWrapper() });
    // enabled:false → stays idle, never fetches.
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });
});
