import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Product } from '../types';
import {
  useMedusaCart,
  useAddLineItem,
  useUpdateLineItem,
  useRemoveLineItem,
  useApplyPromotion,
  useRemovePromotion,
  useClearCart,
} from '../hooks/useCart';
import { useToast } from './ToastContext';
import { useLanguage } from './LanguageContext';

export interface CartItem {
  // Line item fields from Medusa
  lineItemId: string;
  variantId: string;
  quantity: number;
  // Product display fields (from line item data)
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  category: string;
  capacity?: string;
  handle?: string;
}

export interface AppliedPromotion {
  code: string;
  amount: number;
}

interface CartContextType {
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  /** Freshest quantity for a line (reads the optimistic cache), so steppers
   * don't compute from a stale rendered value under rapid clicks. */
  liveQuantity: (id: string) => number;
  /** Remove every line item from the cart. */
  clearCart: () => void;
  /** Confirmation banner shown inside the cart drawer (add/remove/clear). */
  cartNotice: { variant: 'success' | 'info'; message: string } | null;
  dismissCartNotice: () => void;
  /** Sum of line-item totals before discounts/shipping/tax, in EUR. */
  cartSubtotal: number;
  /**
   * Post-discount gross item total in EUR (what the customer actually pays for
   * items, i.e. cart.item_total). Used for the free-shipping threshold check so
   * the cart sidebar and the GLS backend use the same basis (OA-14).
   */
  cartItemTotal: number;
  /** Total monetary value of any applied promotions, in EUR (≥ 0). */
  cartDiscountTotal: number;
  /** Promotions Medusa has attached to the cart. */
  cartPromotions: AppliedPromotion[];
  /** Post-discount item total in EUR (subtotal − discount). */
  cartTotal: number;
  cartCount: number;
  isCartLoading: boolean;
  applyPromotion: (code: string) => Promise<void>;
  removePromotion: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function lineItemToCartItem(item: any): CartItem {
  // Medusa v2 stores all amounts in DECIMAL MAJOR UNITS. `unit_price`
  // for a €17 product is already 17, not 1700 — no /100 needed.
  const priceEur = (item.unit_price ?? 0) as number;

  return {
    lineItemId: item.id,
    variantId: item.variant_id,
    quantity: item.quantity,
    id: item.product_id || item.id,
    name: item.product_title || item.title || '',
    description: item.product_description || '',
    price: priceEur.toFixed(2),
    image: item.thumbnail || '',
    category: '',
    capacity: item.variant_title || '',
    handle: item.product_handle,
  };
}

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const toast = useToast();

  const { t } = useLanguage();
  const queryClient = useQueryClient();

  // Add/remove/clear confirmations show as a banner INSIDE the cart drawer
  // (which is always open for these actions) — so they read as "in the cart"
  // and never cover the header or checkout button. Errors still use the
  // global toast (the drawer may be closed).
  const [cartNotice, setCartNotice] = useState<{ variant: 'success' | 'info'; message: string } | null>(null);
  const cartNoticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notifyCart = useCallback((variant: 'success' | 'info', message: string) => {
    setCartNotice({ variant, message });
    clearTimeout(cartNoticeTimer.current);
    cartNoticeTimer.current = setTimeout(() => setCartNotice(null), 3000);
  }, []);
  const dismissCartNotice = useCallback(() => {
    clearTimeout(cartNoticeTimer.current);
    setCartNotice(null);
  }, []);
  useEffect(() => () => clearTimeout(cartNoticeTimer.current), []);
  const { data: cart, isLoading: isCartLoading } = useMedusaCart();
  const addLineItem = useAddLineItem();
  const clearCartMutation = useClearCart();
  const updateLineItem = useUpdateLineItem();
  const removeLineItem = useRemoveLineItem();
  const applyPromotionMutation = useApplyPromotion();
  const removePromotionMutation = useRemovePromotion();

  // Stable order by creation time (oldest first → newest-added always last).
  // Medusa doesn't guarantee a consistent line-item order across refetches /
  // quantity updates, which made items appear to jump around in the drawer.
  const cartItems: CartItem[] = useMemo(
    () =>
      [...(cart?.items || [])]
        .sort((a: any, b: any) => {
          const ta = a?.created_at ? Date.parse(a.created_at) : 0;
          const tb = b?.created_at ? Date.parse(b.created_at) : 0;
          if (ta !== tb) return ta - tb;
          return String(a?.id).localeCompare(String(b?.id)); // deterministic tiebreak
        })
        .map(lineItemToCartItem),
    [cart?.items]
  );

  // Medusa cart fields used to render the order summary. All amounts
  // are DECIMAL MAJOR UNITS in v2 — no /100 anywhere.
  //
  // The store is tax-INCLUSIVE, so line prices are GROSS (VAT already inside).
  // We show the GROSS subtotal so the numbers match the line-item prices and
  // exactly what the customer is charged. IMPORTANT: use *_item_total (gross),
  // NOT item_subtotal — under tax-inclusive pricing item_subtotal is the NET
  // figure (e.g. €27.87 for a €34 cart) and would understate the price.
  //   original_item_total — gross, BEFORE discounts (what we label "Subtotal").
  //   item_total          — gross, AFTER discounts.
  //   item_tax_total      — the VAT already contained in the gross amount.
  const cartSubtotal = useMemo(
    () =>
      cart?.original_item_total != null
        ? (cart.original_item_total as number)
        : cart?.item_total != null
          ? (cart.item_total as number)
          : cartItems.reduce((t, item) => t + parseFloat(item.price) * item.quantity, 0),
    [cart?.original_item_total, cart?.item_total, cartItems]
  );

  // Post-discount gross item total — mirrors the GLS backend basis (item.total,
  // which is gross after discounts). Used only for the free-ship progress bar so
  // the sidebar and the server agree on whether the threshold is met (OA-14).
  // Falls back to cartSubtotal − cartDiscountTotal if item_total is unavailable.
  const cartItemTotal = useMemo(
    () =>
      cart?.item_total != null
        ? (cart.item_total as number)
        : cartItems.reduce((t, item) => t + parseFloat(item.price) * item.quantity, 0),
    [cart?.item_total, cartItems]
  );

  const cartDiscountTotal = useMemo(
    () => (cart?.discount_total != null ? (cart.discount_total as number) : 0),
    [cart?.discount_total]
  );

  const cartTotal = useMemo(
    () => Math.max(0, cartSubtotal - cartDiscountTotal),
    [cartSubtotal, cartDiscountTotal]
  );

  const cartPromotions = useMemo<AppliedPromotion[]>(() => {
    const promos = (cart as any)?.promotions;
    if (!Array.isArray(promos)) return [];
    return promos
      .filter((p: any) => p?.code)
      .map((p: any) => ({
        code: p.code as string,
        amount: (p.application_method?.value ?? 0) as number,
      }));
  }, [cart]);

  const cartCount = useMemo(
    () => cartItems.reduce((c, item) => c + item.quantity, 0),
    [cartItems]
  );

  const applyPromotion = useCallback(
    async (code: string) => {
      await applyPromotionMutation.mutateAsync(code);
    },
    [applyPromotionMutation]
  );

  const removePromotion = useCallback(async () => {
    await removePromotionMutation.mutateAsync();
  }, [removePromotionMutation]);

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    // Use the first variant by default
    const variantId = product.variants?.[0]?.id;
    if (!variantId) {
      toast.error(t('cart.unavailable'));
      return;
    }

    addLineItem.mutate(
      { variantId, quantity },
      {
        onSuccess: () => {
          setIsCartOpen(true);
          notifyCart('success', t('cart.added', { name: product.name }));
        },
        onError: () => {
          toast.error(t('cart.addFailed'));
        },
      }
    );
  }, [addLineItem, toast, t, notifyCart]);

  const clearCart = useCallback(() => {
    if (!cartItems.length) return;
    // Cancel any pending debounced quantity writes first.
    Object.values(qtyWriteTimers.current).forEach(clearTimeout);
    qtyWriteTimers.current = {};
    clearCartMutation.mutate(cartItems.map(i => i.lineItemId), {
      onSuccess: () => notifyCart('info', t('cart.cleared')),
      onError: () => toast.error(t('cart.clearFailed')),
    });
  }, [cartItems, clearCartMutation, toast, t, notifyCart]);

  const removeFromCart = useCallback((id: string) => {
    // id could be product_id or lineItemId - find the matching line item
    const item = cartItems.find(i => i.id === id || i.lineItemId === id);
    if (item) {
      // Cancel any pending debounced quantity write for this line so it can't
      // fire against a line we're about to delete (which would 404).
      clearTimeout(qtyWriteTimers.current[item.lineItemId]);
      delete qtyWriteTimers.current[item.lineItemId];
      removeLineItem.mutate(item.lineItemId, {
        onSuccess: () => notifyCart('info', t('cart.removed', { name: item.name })),
        onError: () => toast.error(t('cart.removeFailed')),
      });
    }
  }, [cartItems, removeLineItem, toast, t, notifyCart]);

  // Per-line debounce timers for quantity writes. Rapid "+"/"−" clicks patch
  // the cached quantity instantly (so the UI keeps up and each click reads the
  // incremented value) but only flush ONE request per line once clicks settle.
  // Firing a request per click instead sends concurrent absolute-set updates
  // that conflict on the server and collapse — the item appears stuck.
  const qtyWriteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const timers = qtyWriteTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    const item = cartItems.find(i => i.id === id || i.lineItemId === id);
    if (!item) return;

    if (quantity < 1) {
      clearTimeout(qtyWriteTimers.current[item.lineItemId]);
      delete qtyWriteTimers.current[item.lineItemId];
      removeLineItem.mutate(item.lineItemId);
      return;
    }

    const { lineItemId } = item;

    // Optimistic, immediate cache patch so the displayed quantity updates this
    // tick — the next click then reads the new value instead of a stale one.
    // Also drop the server-computed money totals (item_subtotal/item_total/
    // original_item_total) so the footer recomputes from the patched quantities
    // via the cartItems fallback, keeping line prices and the Total consistent
    // until the debounced write + refetch returns authoritative figures.
    // original_item_total is the primary path into cartSubtotal (line 151)
    // and MUST also be stripped, otherwise the stale server total is displayed.
    queryClient.setQueryData(['cart'], (old: any) => {
      if (!old?.items) return old;
      const { item_subtotal, item_total, original_item_total, ...rest } = old;
      return {
        ...rest,
        items: old.items.map((it: any) =>
          it.id === lineItemId ? { ...it, quantity } : it
        ),
      };
    });

    // Debounce the server write; the last click within the window wins.
    clearTimeout(qtyWriteTimers.current[lineItemId]);
    qtyWriteTimers.current[lineItemId] = setTimeout(() => {
      delete qtyWriteTimers.current[lineItemId];
      updateLineItem.mutate(
        { lineItemId, quantity },
        {
          onError: (err: any) => {
            // The line may have been removed/cleared meanwhile — a 404/410 is
            // expected, not a real failure, so don't surface a toast for it.
            const status = err?.status ?? err?.response?.status;
            if (status === 404 || status === 410) return;
            toast.error(t('cart.updateFailed'));
          },
        }
      );
    }, 400);
  }, [cartItems, updateLineItem, removeLineItem, toast, t, queryClient]);

  // Freshest line-item quantity, read from the query cache (which updateQuantity
  // patches synchronously) rather than a possibly-stale rendered prop. The +/-
  // buttons compute their target from this, so rapid clicks accumulate correctly
  // instead of all reading the same not-yet-re-rendered value.
  const liveQuantity = useCallback((id: string): number => {
    const item = cartItems.find(i => i.id === id || i.lineItemId === id);
    if (!item) return 0;
    const cached = queryClient.getQueryData<any>(['cart']);
    const cacheItem = cached?.items?.find((it: any) => it.id === item.lineItemId);
    return (cacheItem?.quantity ?? item.quantity) as number;
  }, [cartItems, queryClient]);

  const value = useMemo(
    () => ({
      isCartOpen,
      setIsCartOpen,
      isSearchOpen,
      setIsSearchOpen,
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      liveQuantity,
      clearCart,
      cartNotice,
      dismissCartNotice,
      cartSubtotal,
      cartItemTotal,
      cartDiscountTotal,
      cartPromotions,
      cartTotal,
      cartCount,
      isCartLoading,
      applyPromotion,
      removePromotion,
    }),
    [
      isCartOpen,
      isSearchOpen,
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      liveQuantity,
      clearCart,
      cartNotice,
      dismissCartNotice,
      cartSubtotal,
      cartItemTotal,
      cartDiscountTotal,
      cartPromotions,
      cartTotal,
      cartCount,
      isCartLoading,
      applyPromotion,
      removePromotion,
    ]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
