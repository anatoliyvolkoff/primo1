import { describe, expect, it } from "vitest"

import { waLinkWithText } from "./whatsapp"

describe("waLinkWithText", () => {
  it("returns '' for an empty base", () => {
    expect(waLinkWithText("")).toBe("")
    expect(waLinkWithText("   ")).toBe("")
  })

  it("returns '' for a digit-less non-empty base (no numberless wa.me link)", () => {
    expect(waLinkWithText("abc")).toBe("")
    expect(waLinkWithText("+++")).toBe("")
    expect(waLinkWithText("abc", "hi")).toBe("")
  })

  it("builds a wa.me link from a bare number, stripping non-digits", () => {
    expect(waLinkWithText("+39 389 319 3049")).toBe("https://wa.me/393893193049")
  })

  it("appends url-encoded text when a message is supplied", () => {
    expect(waLinkWithText("393893193049", "Ciao & benvenuto")).toBe(
      "https://wa.me/393893193049?text=Ciao+%26+benvenuto"
    )
  })

  it("keeps a full URL base and sets/overrides its text param", () => {
    expect(waLinkWithText("https://wa.me/393893193049", "hello")).toBe(
      "https://wa.me/393893193049?text=hello"
    )
    expect(waLinkWithText("https://wa.me/393893193049?text=old", "new")).toBe(
      "https://wa.me/393893193049?text=new"
    )
  })
})
