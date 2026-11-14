import React, { useState, useEffect, useId, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { MEDUSA_BACKEND_URL } from '../lib/medusa';
import { useScrollLock, isScrollLocked, subscribeScrollLock } from '../lib/scrollLock';
import { Button, Input, SectionTitle, Text } from './ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const NewsletterPopup: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  // The scroll sentinel has tripped; we may show as soon as no other modal
  // (cart / search / filter sheet / quick-view) is holding the scroll lock.
  const [armed, setArmed] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { t, language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const headingId = useId();
  const emailId = useId();

  const handleDismiss = useCallback(() => {
    localStorage.setItem('newsletter_dismissed', 'true');
    setArmed(false);
    setIsVisible(false);
  }, []);

  const containerRef = useFocusTrap<HTMLDivElement>({
    active: isVisible,
    onEscape: handleDismiss,
  });

  useEffect(() => {
    if (localStorage.getItem('newsletter_dismissed')) return;

    // Drop a sentinel ~50% down the document; IntersectionObserver fires
    // once when it scrolls into view — no per-frame work like a scroll
    // listener, and the localStorage check happens exactly once.
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.position = 'absolute';
    sentinel.style.top = '50%';
    sentinel.style.left = '0';
    sentinel.style.width = '1px';
    sentinel.style.height = '1px';
    sentinel.style.pointerEvents = 'none';
    document.body.appendChild(sentinel);

    const observer = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        setArmed(true);
        observer.disconnect();
      }
    });
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  // Once armed, show the popup — but never on top of another open modal.
  // If one is open, wait for it to close (the scroll lock dropping to zero).
  useEffect(() => {
    if (!armed || isVisible) return;
    // Guard against re-showing after the user dismissed it: closing the popup
    // flips isVisible→false and re-runs this effect, which would otherwise
    // immediately re-open it.
    if (localStorage.getItem('newsletter_dismissed')) return;
    const tryShow = () => {
      if (!localStorage.getItem('newsletter_dismissed') && !isScrollLocked()) {
        setIsVisible(true);
      }
    };
    tryShow();
    return subscribeScrollLock(tryShow);
  }, [armed, isVisible]);

  // Lock body scroll while the popup itself is open (shared refcounted lock).
  useScrollLock(isVisible);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setEmailError(t('newsletter.invalidEmail'));
      return;
    }
    if (isSubmitting) return;
    setEmailError(null);
    setIsSubmitting(true);
    try {
      const publishableKey = (import.meta as any).env?.VITE_MEDUSA_PUBLISHABLE_KEY || '';
      const res = await fetch(`${MEDUSA_BACKEND_URL}/store/newsletter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(publishableKey ? { 'x-publishable-api-key': publishableKey } : {}),
        },
        body: JSON.stringify({ email: trimmed, language }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.error === 'invalid_email') {
          setEmailError(t('newsletter.invalidEmail'));
        } else {
          toast.error(t('newsletter.error' as any));
        }
        return;
      }
      setIsSubmitted(true);
      toast.success(t('newsletter.thankYou'));
      setTimeout(() => {
        handleDismiss();
      }, 2500);
    } catch {
      toast.error(t('newsletter.error' as any));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-[#faf8f6]! text-card-foreground w-full max-w-[820px] max-h-[92vh] rounded-[16px] sm:rounded-[20px] overflow-y-auto md:overflow-hidden flex flex-col md:flex-row shadow-elevated outline-none"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label={t('search.close')}
              className="absolute top-3 right-3 sm:top-5 sm:right-5 z-20 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Left Image Section */}
            <div className="relative w-full md:w-1/2 h-[140px] sm:h-[180px] md:h-auto overflow-hidden shrink-0">
              <img
                src="/newsletter.png"
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              {/* Champagne editorial wash to tie the photo into the palette */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-accent-gold/25 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-card/20"
              />
            </div>

            {/* Right Form Section */}
            <div className="w-full md:w-1/2 px-6 pt-8 pb-7 sm:px-8 sm:py-9 md:px-12 md:py-10 flex flex-col justify-center items-center text-center">
              {!isSubmitted ? (
                <>
                  <SectionTitle
                    as="h2"
                    id={headingId}
                    align="center"
                    className="mb-5 sm:mb-6 [&_h2]:leading-none"
                    title={
                      <span className="block font-semibold text-[15px] sm:text-[17px] md:text-[19px] leading-snug tracking-[0.04em] uppercase text-balance">
                        {t('newsletter.heading')}
                        <span className="block my-1.5 font-bold text-accent-gold text-[34px] sm:text-[40px] md:text-[46px] leading-none tracking-[-0.02em]">
                          {t('newsletter.discount')}
                        </span>
                        {t('newsletter.firstOffer')}
                      </span>
                    }
                  />

                  <form onSubmit={handleSubmit} noValidate className="w-full max-w-[320px] flex flex-col gap-3">
                    <Input
                      id={emailId}
                      type="email"
                      placeholder={t('newsletter.emailPlaceholder')}
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      onBlur={() => {
                        const v = email.trim();
                        if (v && !EMAIL_RE.test(v)) {
                          setEmailError(t('newsletter.invalidEmail'));
                        }
                      }}
                      aria-label={t('newsletter.emailLabel')}
                      error={emailError || undefined}
                      autoComplete="email"
                      wrapperClassName="text-left"
                    />

                    <Button
                      type="submit"
                      size="lg"
                      uppercase
                      fullWidth
                      loading={isSubmitting}
                      disabled={isSubmitting}
                    >
                      {t('newsletter.subscribeNow')}
                    </Button>
                  </form>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="mt-4 text-[12px] sm:text-[13px] font-sans text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                  >
                    {t('newsletter.noThanks')}
                  </button>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 py-12"
                >
                  <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center text-success-foreground mb-4">
                    <Check className="w-9 h-9" aria-hidden="true" />
                  </div>
                  <SectionTitle as="h3" title={t('newsletter.thankYou')} />
                  <Text tone="muted" weight="medium">{t('newsletter.checkEmail')}</Text>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
