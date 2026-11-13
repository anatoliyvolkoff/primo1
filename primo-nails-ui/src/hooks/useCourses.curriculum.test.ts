import { describe, it, expect } from "vitest"
import { toUICurriculum } from "./useCourses"

describe("toUICurriculum — backward-compatible curriculum normalization", () => {
  it("returns undefined for null / undefined / empty", () => {
    expect(toUICurriculum(null)).toBeUndefined()
    expect(toUICurriculum(undefined)).toBeUndefined()
    expect(toUICurriculum([])).toBeUndefined()
  })

  it("maps legacy string[] rows to { title }", () => {
    expect(toUICurriculum(["Lesson A", "Lesson B"])).toEqual([
      { title: "Lesson A" },
      { title: "Lesson B" },
    ])
  })

  it("keeps { title, description } objects, trimming values", () => {
    expect(
      toUICurriculum([{ title: "  Prep  ", description: "  Clean the nail  " }])
    ).toEqual([{ title: "Prep", description: "Clean the nail" }])
  })

  it("omits description when empty/whitespace/null", () => {
    expect(
      toUICurriculum([
        { title: "A", description: "" },
        { title: "B", description: "   " },
        { title: "C", description: null },
      ])
    ).toEqual([{ title: "A" }, { title: "B" }, { title: "C" }])
  })

  it("tolerates a mixed legacy + new array", () => {
    expect(
      toUICurriculum(["Legacy title", { title: "New", description: "d" }])
    ).toEqual([{ title: "Legacy title" }, { title: "New", description: "d" }])
  })

  it("drops rows without a title and collapses an all-empty list to undefined", () => {
    expect(
      toUICurriculum(["", "  ", { title: "" }, { title: "   " }])
    ).toBeUndefined()
    expect(
      toUICurriculum(["", { title: "Kept", description: "x" }])
    ).toEqual([{ title: "Kept", description: "x" }])
  })
})
