import React, { useState, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import { X, Minus, Plus, ShoppingCart, Trash2, CheckCircle2, Info } from 'lucide-react';
import { useScrollLock } from '../../../lib/scrollLock';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../../../context/CartContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useVatRatePct } from '../../../hooks/useStoreContent';
import { formatPrice, vatPortion } from '../../../lib/formatPrice';
import { handleProductImageError } from '../../../lib/imageFallback';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose }) => {
  const { cartItems, removeFromCart, updateQuantity, liveQuantity, cartSubtotal, cartTotal, cartNotice, dismissCartNotice } = useCart();
  const { t, language } = useLanguage();
  // Live VAT rate (admin `vat_rate_percent`); 0 = VAT-exempt → the IVA line hides.
  const vatRate = useVatRatePct();
  // Free-shipping progress lives at CHECKOUT now (FreeShippingProgress), not the
  // cart: thresholds are per-zone and we don't know the destination here, so a
  // single "add €X" bar in the basket could promise the wrong threshold.
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const titleId = useId();
  const confirmTitleId = useId();

  const panelRef = useFocusTrap<HTMLDivElement>({
    active: isOpen && !pendingRemoveId,
    onEscape: onClose,
  });
  const confirmRef = useFocusTrap<HTMLDivElement>({
    active: !!pendingRemoveId,
    onEscape: () => setPendingRemoveId(null),
  });

  useScrollLock(isOpen);

  const pendingItem = cartItems.find(item => item.id === pendingRemoveId) ?? null;

  const confirmRemove = () => {
    if (pendingRemoveId) {
      removeFromCart(pendingRemoveId);
      setPendingRemoveId(null);
    }
  };

  return (
    <div
      // Closed drawer stays mounted off-screen: keep it out of the tab order and
      // the accessibility tree so keyboard/screen-reader users don't land in it.
      inert={!isOpen}
      className={`fixed inset-0 z-[300] transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[hsl(var(--scrim)/0.4)] motion-safe:animate-[scrim-fade-in_0.25s_var(--ease)_both]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`absolute top-0 right-0 h-full w-full xs:max-w-sm sm:max-w-md bg-background shadow-2xl transition-transform duration-500 flex flex-col outline-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <h2 id={titleId} className="text-lg sm:text-xl font-bold tracking-widest uppercase truncate">{t('cart.title')}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded-full transition-[color,background-color,border-color,scale] duration-200 active:scale-90 shrink-0 ml-2"
            aria-label={t('cart.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* In-cart confirmation banner (add/remove/clear). Lives inside the
            drawer header band so it reads as "in the cart" and never covers the
            checkout button or the page header. */}
        <AnimatePresence>
          {cartNotice && (
            <motion.div
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden border-b border-border"
            >
              <div className="flex items-center gap-2.5 px-4 sm:px-6 py-3 bg-muted/40">
                {cartNotice.variant === 'success'
                  ? <CheckCircle2 className="w-4 h-4 shrink-0 text-success" aria-hidden="true" />
                  : <Info className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                <p className="flex-1 text-xs sm:text-sm font-medium leading-snug text-foreground">{cartNotice.message}</p>
                <button
                  type="button"
                  onClick={dismissCartNotice}
                  aria-label={t('cart.close')}
                  className="shrink-0 -mr-1 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-[color,background-color,border-color,scale] duration-200 active:scale-90"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <ShoppingCart className="w-12 h-12 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">{t('cart.empty')}</p>
              <button
                onClick={onClose}
                className="mt-4 px-8 py-3 bg-primary text-primary-foreground border border-primary text-sm font-medium uppercase tracking-widest rounded-pill hover:bg-transparent hover:text-primary transition-[color,background-color,border-color,scale] duration-200 active:scale-[0.97]"
              >
                {t('cart.startShopping')}
              </button>
            </div>
          ) : (
            <ul className="space-y-5 sm:space-y-6">
              {cartItems.map(item => (
                <li key={item.id} className="flex gap-3 sm:gap-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted rounded-xl overflow-hidden shrink-0 p-2">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        width={96}
                        height={96}
                        onError={handleProductImageError(item.id, 200)}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-foreground/10 rounded-lg" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold uppercase text-sm line-clamp-2 break-words">{item.name}</h3>
                        <p className="text-xs text-muted-foreground uppercase mt-1 truncate">
                          {item.capacity || item.description}
                        </p>
                      </div>
                      <button
                        onClick={() => setPendingRemoveId(item.id)}
                        className="text-muted-foreground hover:text-foreground transition-[color,background-color,border-color,scale] duration-200 active:scale-90 shrink-0 p-1 -m-1"
                        aria-label={t('cart.removeItem', { name: item.name })}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-3 sm:mt-4">
                      {/* Three separate outlined circles (−, number, +) — same
                          treatment as the PDP stepper, scaled down for the
                          drawer; no shared capsule wrapper. */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            // Read the freshest quantity (not the rendered prop)
                            // so rapid -/+ clicks don't act on a stale value.
                            const q = liveQuantity(item.id);
                            if (q <= 1) {
                              setPendingRemoveId(item.id);
                            } else {
                              updateQuantity(item.id, q - 1);
                            }
                          }}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-[color,background-color,border-color,scale] duration-200 active:scale-90"
                          aria-label={t('cart.decreaseQty')}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 sm:w-7 text-center text-sm font-medium" aria-live="polite">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, liveQuantity(item.id) + 1)}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-[color,background-color,border-color,scale] duration-200 active:scale-90"
                          aria-label={t('cart.increaseQty')}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="font-bold text-sm sm:text-base truncate">{formatPrice(parseFloat(item.price) * item.quantity, language)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-4 sm:p-6 border-t border-border bg-background">
            <div className="flex justify-between items-center gap-3 mb-1">
              <span className="text-sm font-bold uppercase tracking-widest">{t('checkout.subtotal')}</span>
              <span className="text-lg sm:text-xl font-bold truncate">{formatPrice(cartTotal, language)}</span>
            </div>
            {/* Prices are gross — surface the VAT already inside the total.
                Hidden when VAT-exempt (regime forfettario → vatPortion is 0). */}
            {vatPortion(cartTotal, vatRate) > 0 && (
              <div className="flex justify-between items-center gap-3 mb-4 sm:mb-6 text-xs text-muted-foreground">
                <span>{t('cart.vatNote', { rate: vatRate })}</span>
                <span>{formatPrice(vatPortion(cartTotal, vatRate), language)}</span>
              </div>
            )}
            <Link
              to="/checkout"
              onClick={onClose}
              className="w-full py-3.5 sm:py-4 bg-primary text-primary-foreground border border-primary text-[13px] sm:text-sm font-medium uppercase tracking-widest rounded-pill hover:bg-transparent hover:text-primary transition-[color,background-color,border-color,scale] duration-200 active:scale-[0.97] flex justify-center"
            >
              {t('cart.checkout')}
            </Link>
          </div>
        )}
      </div>
      {/* ─── Remove confirmation dialog ─── */}
      <AnimatePresence>
        {pendingItem && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden="true"
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setPendingRemoveId(null)}
            />
            <motion.div
              ref={confirmRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={confirmTitleId}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative w-full max-w-xs sm:max-w-sm bg-background rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.25)] flex flex-col items-center text-center gap-5 sm:gap-6 outline-none"
              onClick={e => e.stopPropagation()}
            >
              {/* Product thumbnail */}
              <div className="w-20 h-20 bg-muted rounded-2xl overflow-hidden p-2 shrink-0">
                {pendingItem.image ? (
                  <img
                    src={pendingItem.image}
                    alt={pendingItem.name}
                    loading="lazy"
                    decoding="async"
                    width={80}
                    height={80}
                    onError={handleProductImageError(pendingItem.id, 200)}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-foreground/10 rounded-xl flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="w-full min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">{t('cart.removeFromCart')}</p>
                <h3 id={confirmTitleId} className="text-base sm:text-lg font-bold leading-tight break-words">{pendingItem.name}</h3>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('cart.removeConfirm')}
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setPendingRemoveId(null)}
                  className="flex-1 py-3 border border-border rounded-full text-sm font-bold uppercase tracking-widest hover:bg-muted transition-[color,background-color,border-color,scale] duration-200 active:scale-[0.97]"
                >
                  {t('cart.cancel')}
                </button>
                <button
                  onClick={confirmRemove}
                  className="flex-1 py-3 bg-foreground text-background rounded-full text-sm font-bold uppercase tracking-widest hover:bg-foreground/85 transition-[color,background-color,border-color,scale] duration-200 active:scale-[0.97]"
                >
                  {t('cart.remove')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
