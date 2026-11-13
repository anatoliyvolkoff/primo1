import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../lib/medusa"
import { getRegionId } from "./useProducts"
import { safeGetItem, safeSetItem, safeRemoveItem } from "../lib/safeStorage"

const CART_ID_KEY = "primo_cart_id"

// localStorage can throw in strict private-mode / blocked-storage contexts;
// route every access through the never-throw wrappers so the cart degrades to
// in-memory this session instead of crashing the hook (LB166-2).
const getStoredCartId = (): string | null => safeGetItem(CART_ID_KEY)
const setStoredCartId = (id: string) => safeSetItem(CART_ID_KEY, id)
const clearStoredCartId = () => safeRemoveItem(CART_ID_KEY)

export function useMedusaCart() {
  return useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const cartId = getStoredCartId()
      if (!cartId) return null
      try {
        const { cart } = await sdk.store.cart.retrieve(cartId)
        return cart
      } catch (err: any) {
        // Only clear the cart ID for "cart actually doesn't exist anymore"
        // (HTTP 404 / 410). For network failures or 5xx, keep the ID so
        // we can retry — otherwise a transient blip silently wipes the
        // user's cart.
        const status = err?.status ?? err?.response?.status
        if (status === 404 || status === 410) {
          clearStoredCartId()
          return null
        }
        // Re-throw so React Query surfaces it as a query error and can
        // retry per its retry policy.
        throw err
      }
    },
    staleTime: 0,
    retry: (failureCount, err: any) => {
      const status = err?.status ?? err?.response?.status
      if (status === 404 || status === 410) return false
      return failureCount < 2
    },
  })
}

// Single-flight guard for cart creation. Without it, two line-item
// mutations firing before the first cart round-trip resolves both see
// getStoredCartId() === null and each create a NEW cart; setStoredCartId
// is last-write-wins, so the item written to the losing cart is orphaned.
// React Query does not dedupe useMutation calls, so we lock here.
let inflightCart: Promise<string> | null = null

export async function ensureCart(): Promise<string> {
  const cartId = getStoredCartId()
  if (cartId) return cartId

  // A creation is already in flight — join it instead of starting a second.
  if (inflightCart) return inflightCart

  inflightCart = (async () => {
    const regionId = await getRegionId()
    const { cart } = await sdk.store.cart.create({ region_id: regionId })
    setStoredCartId(cart.id)
    return cart.id
  })().finally(() => {
    // Reset on both success and error so a failed create doesn't wedge the
    // lock; the next call is free to retry.
    inflightCart = null
  })

  return inflightCart
}

export function useAddLineItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      variantId,
      quantity,
    }: {
      variantId: string
      quantity: number
    }) => {
      const cartId = await ensureCart()
      const { cart } = await sdk.store.cart.createLineItem(cartId, {
        variant_id: variantId,
        quantity,
      })
      return cart
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}

export function useUpdateLineItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      lineItemId,
      quantity,
    }: {
      lineItemId: string
      quantity: number
    }) => {
      const cartId = getStoredCartId()
      if (!cartId) throw new Error("No cart")
      const { cart } = await sdk.store.cart.updateLineItem(
        cartId,
        lineItemId,
        { quantity }
      )
      return cart
    },
    // The caller (CartContext) patches the cached quantity optimistically and
    // debounces this mutation so only ONE request fires per burst of clicks.
    // Either outcome re-syncs with the server: success/refetch gives the true
    // totals; error refetch discards the bad optimistic value.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}

export function useApplyPromotion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (code: string) => {
      const cartId = getStoredCartId()
      if (!cartId) throw new Error("No cart")
      // Medusa v2 v2.x exposes promo codes via cart.update — passing
      // promo_codes triggers the promotions module to evaluate and
      // attach matching promotion entries. Server rejects unknown
      // codes with a 4xx; the mutation surfaces that.
      const { cart } = await sdk.store.cart.update(cartId, {
        promo_codes: [code],
      })
      return cart
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}

export function useRemovePromotion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const cartId = getStoredCartId()
      if (!cartId) throw new Error("No cart")
      // Passing an empty list detaches every currently-attached promo.
      const { cart } = await sdk.store.cart.update(cartId, {
        promo_codes: [],
      })
      return cart
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}

export function useClearCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lineItemIds: string[]) => {
      const cartId = getStoredCartId()
      if (!cartId) return null
      // Delete sequentially — concurrent writes to the same cart conflict.
      let cart = null
      for (const id of lineItemIds) {
        const { parent } = await sdk.store.cart.deleteLineItem(cartId, id)
        cart = parent
      }
      return cart
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}

export function useRemoveLineItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lineItemId: string) => {
      const cartId = getStoredCartId()
      if (!cartId) throw new Error("No cart")
      const { parent: cart } = await sdk.store.cart.deleteLineItem(
        cartId,
        lineItemId
      )
      return cart
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}
