import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useLanguage } from './LanguageContext';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, options?: { variant?: ToastVariant; duration?: number }) => string;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Prototype default auto-hide (dark bottom-center pill): 2400ms. Errors linger
// a touch longer so they can be read.
const DEFAULT_DURATION = 2400;
const ERROR_DURATION = 4000;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const showToast: ToastContextValue['showToast'] = useCallback(
    (message: string, options?: { variant?: ToastVariant; duration?: number }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duration = options?.duration ?? DEFAULT_DURATION;
      const variant: ToastVariant = options?.variant ?? 'info';
      setToasts(prev => [...prev, { id, message, variant, duration }]);
      if (duration > 0) {
        timers.current[id] = setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  useEffect(() => () => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
  }, []);

  const success: ToastContextValue['success'] = useCallback(
    (message, duration) => showToast(message, { variant: 'success', duration }),
    [showToast]
  );
  const error: ToastContextValue['error'] = useCallback(
    (message, duration) => showToast(message, { variant: 'error', duration: duration ?? ERROR_DURATION }),
    [showToast]
  );
  const info: ToastContextValue['info'] = useCallback(
    (message, duration) => showToast(message, { variant: 'info', duration }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, success, error, info, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

const ToastViewport: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  const { t } = useLanguage();
  return (
  // Prototype: dark pill, bottom-center. We keep the ARIA live region + stacking
  // (both are ours, not the prototype's); each toast is restyled to the dark pill.
  <div
    className="fixed left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 w-auto max-w-[88vw] pointer-events-none"
    style={{ bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}
  >
    <AnimatePresence initial={false}>
      {toasts.map(toast => (
          <motion.button
            type="button"
            key={toast.id}
            role={toast.variant === 'error' ? 'alert' : 'status'}
            aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            onClick={() => onDismiss(toast.id)}
            aria-label={t('a11y.closeNotification')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.28, ease: [0.22, 0.8, 0.24, 1] }}
            className="pointer-events-auto max-w-[88vw] rounded-full bg-[#111] px-5 py-[11px] text-center font-sans text-[13.5px] font-semibold leading-snug text-white shadow-elevated"
          >
            {toast.message}
          </motion.button>
      ))}
    </AnimatePresence>
  </div>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
