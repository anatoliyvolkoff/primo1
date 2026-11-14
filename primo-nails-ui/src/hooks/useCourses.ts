import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { sdk } from "../lib/medusa"
import { useLanguage } from "../context/LanguageContext"
import { resolveTranslation } from "../lib/entityTranslations"

/**
 * A curriculum lesson. Legacy rows are a bare `string` (title only); new rows
 * are `{ title, description }`. The mapper tolerates both.
 */
export interface CurriculumLesson {
  title: string
  description?: string | null
}

export interface Course {
  id: string
  handle: string
  title: string
  description: string
  full_description: string | null
  level: string
  duration: string
  students_label: string | null
  tag: string | null
  image_url: string | null
  price_eur: number | null
  next_date_day: string | null
  next_date_month: string | null
  curriculum: (string | CurriculumLesson)[] | null
  learning_outcomes: string[] | null
  gallery: string[] | null
  sort_order: number
  is_published: boolean
  /** EN overrides: { translations: { <field>: { en } } }. IT = base columns. */
  metadata: Record<string, any> | null
}

/** A curriculum lesson normalized for the storefront. */
export interface UICurriculumLesson {
  title: string
  description?: string
}

/**
 * Maps a Medusa course row to the shape the existing storefront UI
 * already understands. Title / description / full description are
 * overlaid with their English translation when locale is `en`.
 */
export interface UICourse {
  id: string
  handle: string
  title: string
  description: string
  fullDescription?: string
  level: string
  duration: string
  students: string
  tag?: string
  image?: string
  /** Normalized `{ title, description? }[]`; undefined when the course has none. */
  curriculum?: UICurriculumLesson[]
  /** "What you'll learn" bullets; undefined when the course has none. */
  learningOutcomes?: string[]
  /** Per-course gallery image URLs; undefined when the course has none. */
  gallery?: string[]
  price?: string
  nextDates?: { day: string; month: string }
}

/**
 * Normalize a curriculum array into `{ title, description? }[]`, tolerating the
 * legacy `string[]` shape. Rows without a title are dropped.
 */
export function toUICurriculum(
  list: (string | CurriculumLesson)[] | null | undefined
): UICurriculumLesson[] | undefined {
  if (!list?.length) return undefined
  const lessons = list
    .map((item): UICurriculumLesson | null => {
      if (typeof item === "string") {
        const title = item.trim()
        return title ? { title } : null
      }
      const title = (item?.title ?? "").trim()
      if (!title) return null
      const description = (item?.description ?? "").trim()
      return description ? { title, description } : { title }
    })
    .filter((l): l is UICurriculumLesson => l !== null)
  return lessons.length ? lessons : undefined
}

function cleanStrings(list: string[] | null | undefined): string[] | undefined {
  if (!list?.length) return undefined
  const out = list.filter((s) => typeof s === "string" && s.trim())
  return out.length ? out : undefined
}

function toUICourse(c: Course, locale: string): UICourse {
  return {
    id: c.id,
    handle: c.handle,
    title: resolveTranslation(c.metadata, "title", c.title, locale),
    description: resolveTranslation(c.metadata, "description", c.description, locale),
    fullDescription:
      c.full_description != null
        ? resolveTranslation(c.metadata, "full_description", c.full_description, locale)
        : undefined,
    level: c.level,
    duration: c.duration,
    students: c.students_label ?? "",
    tag: c.tag ?? undefined,
    image: c.image_url ?? undefined,
    curriculum: toUICurriculum(c.curriculum),
    learningOutcomes: cleanStrings(c.learning_outcomes),
    gallery: cleanStrings(c.gallery),
    price: c.price_eur != null ? String(c.price_eur) : undefined,
    nextDates:
      c.next_date_day && c.next_date_month
        ? { day: c.next_date_day, month: c.next_date_month }
        : undefined,
  }
}

export function useCourses() {
  const { language } = useLanguage()
  const query = useQuery<Course[]>({
    queryKey: ["courses", "raw"],
    queryFn: async () => {
      const data = await (sdk.client.fetch as any)("/store/courses", { method: "GET" })
      return (data as { courses: Course[] }).courses || []
    },
    staleTime: 10 * 60 * 1000,
  })
  // Re-project to the locale without refetching when the language changes.
  const data = useMemo(
    () => (query.data ?? []).map((c) => toUICourse(c, language)),
    [query.data, language]
  )
  return { ...query, data }
}

export function useCourse(handle: string | undefined) {
  const { language } = useLanguage()
  const query = useQuery<Course | null>({
    queryKey: ["courses", "raw", handle],
    queryFn: async () => {
      if (!handle) return null
      try {
        const data = await (sdk.client.fetch as any)(`/store/courses/${handle}`, {
          method: "GET",
        })
        return (data as { course: Course }).course ?? null
      } catch (err: any) {
        // A genuine 404 means "no such course" → null. Any other error
        // (server down, network, 5xx) must surface so React Query sets
        // isError/error and runs its retry, instead of masquerading as
        // not-found.
        if (err?.status === 404) return null
        throw err
      }
    },
    enabled: !!handle,
    staleTime: 10 * 60 * 1000,
  })
  const data = useMemo(
    () => (query.data ? toUICourse(query.data, language) : null),
    [query.data, language]
  )
  return { ...query, data }
}
