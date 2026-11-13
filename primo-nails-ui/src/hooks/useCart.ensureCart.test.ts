import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the SDK and region helper that useCart imports. ensureCart only
// touches sdk.store.cart.create and getRegionId on the create path.
// vi.hoisted lets the factory (which is hoisted above imports) reference it.
const { create } = vi.hoisted(() => ({ create: vi.fn() }))

vi.mock("../lib/medusa", () => ({
  sdk: {
    store: {
      cart: {
        create,
      },
    },
  },
}))

vi.mock("./useProducts", () => ({
  getRegionId: vi.fn(async () => "reg_test"),
}))

import { ensureCart } from "./useCart"

const CART_ID_KEY = "primo_cart_id"

beforeEach(() => {
  localStorage.clear()
  create.mockReset()
})

describe("ensureCart — single-flight create-cart guard (LB166-1)", () => {
  it("creates only ONE cart when two calls race with no stored cart id", async () => {
    // Each create() call is slow (resolves next tick) and returns a UNIQUE
    // cart id. So if the lock is missing and two creates fire, the callers
    // resolve to DIFFERENT ids — a divergence the assertions below catch
    // (and create is called twice), rather than hanging.
    let seq = 0
    create.mockImplementation(
      () =>
        new Promise((res) => {
          const id = `cart_race_${++seq}`
          setTimeout(() => res({ cart: { id } }), 0)
        })
    )

    // Fire both without awaiting between them (the "click A then B fast" case).
    const p1 = ensureCart()
    const p2 = ensureCart()

    const [id1, id2] = await Promise.all([p1, p2])

    // Exactly one cart was created...
    expect(create).toHaveBeenCalledTimes(1)
    // ...and both callers got the SAME id (nothing orphaned).
    expect(id1).toBe("cart_race_1")
    expect(id2).toBe("cart_race_1")
    // The persisted id matches the single created cart.
    expect(localStorage.getItem(CART_ID_KEY)).toBe("cart_race_1")
  })

  it("returns the stored cart id without creating a new cart (fast path)", async () => {
    localStorage.setItem(CART_ID_KEY, "cart_existing")

    const id = await ensureCart()

    expect(id).toBe("cart_existing")
    expect(create).not.toHaveBeenCalled()
  })

  it("releases the lock on error so a later call can retry", async () => {
    // First attempt fails; the in-flight promise must be cleared so a
    // subsequent call is free to create a cart rather than joining a
    // permanently-rejected promise.
    create.mockRejectedValueOnce(new Error("network"))

    await expect(ensureCart()).rejects.toThrow("network")

    create.mockResolvedValueOnce({ cart: { id: "cart_retry" } })

    const id = await ensureCart()
    expect(id).toBe("cart_retry")
    expect(create).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem(CART_ID_KEY)).toBe("cart_retry")
  })
})
