import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"

// Mock the SDK region.list so we can count round-trips.
const regionList = vi.fn()
vi.mock("../../lib/medusa", () => ({
  sdk: { store: { region: { list: (...args: unknown[]) => regionList(...args) } } },
}))

import { queryClient } from "../../lib/queryClient"
import { getRegionId } from "../useProducts"
import { useRegionCountries } from "../useRegionCountries"

const REGIONS = [
  {
    id: "reg_1",
    countries: [
      { iso_2: "it", display_name: "Italy" },
      { iso_2: "fr", display_name: "France" },
    ],
  },
]

describe("OA-40: getRegionId + useRegionCountries share one region cache", () => {
  beforeEach(() => {
    queryClient.clear()
    regionList.mockReset()
    regionList.mockResolvedValue({ regions: REGIONS })
  })

  it("fires region.list only ONCE across both consumers", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    // Hook consumer (checkout country dropdown) + imperative consumer (pricing),
    // both against the shared singleton client → one network call.
    const { result } = renderHook(() => useRegionCountries(), { wrapper })
    const regionId = await getRegionId()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(regionId).toBe("reg_1")
    expect(result.current.data).toEqual([
      { iso_2: "fr", display_name: "France" },
      { iso_2: "it", display_name: "Italy" },
    ])
    expect(regionList).toHaveBeenCalledTimes(1)
  })

  it("getRegionId called repeatedly reuses the cached fetch", async () => {
    const a = await getRegionId()
    const b = await getRegionId()
    expect(a).toBe("reg_1")
    expect(b).toBe("reg_1")
    expect(regionList).toHaveBeenCalledTimes(1)
  })
})
