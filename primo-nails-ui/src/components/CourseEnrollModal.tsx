import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { MEDUSA_BACKEND_URL } from '../lib/medusa';
import { useScrollLock } from '../lib/scrollLock';
import { PhoneField, emptyPhone, type PhoneValue } from './PhoneField';
import { Button, Input, Textarea } from './ui';

/** WhatsApp logo glyph (filled), so the option reads as WhatsApp at a glance. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor" stroke="none">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.21 4.24-9.45 9.46-9.45 2.52 0 4.9.99 6.68 2.77a9.4 9.4 0 0 1 2.77 6.68c0 5.21-4.24 9.46-9.43 9.46zM20.52 3.45A11.38 11.38 0 0 0 12.04.1C5.74.1.62 5.22.62 11.52c0 2.01.53 3.98 1.53 5.71L.5 23.5l6.4-1.68a11.4 11.4 0 0 0 5.14 1.31h.01c6.29 0 11.42-5.12 11.42-11.42 0-3.05-1.19-5.92-3.35-8.08z"/>
    </svg>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CourseEnrollModalProps {
  open: boolean;
  onClose: () => void;
  /** WhatsApp deep-link with the prefilled message (or "" to hide the option). */
  whatsappUrl: string;
  courseTitle: string;
  coursePrice?: string;
  /** Prefilled message body — same text used for the WhatsApp deep-link. */
  defaultMessage: string;
}

type Step = 'choice' | 'form' | 'success';

export function CourseEnrollModal({
  open,
  onClose,
  whatsappUrl,
  courseTitle,
  coursePrice,
  defaultMessage,
}: CourseEnrollModalProps) {
  const { t, language } = useLanguage();
  const toast = useToast();
  const titleId = useId();
  const fieldId = useId();
  const firstNameId = `${fieldId}-first-name`;
  const lastNameId = `${fieldId}-last-name`;
  const emailId = `${fieldId}-email`;
  const phoneId = `${fieldId}-phone`;
  const messageId = `${fieldId}-message`;

  const [step, setStep] = useState<Step>('choice');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState<PhoneValue>(emptyPhone('IT'));
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  // Keep the latest defaultMessage in a ref so a live change (e.g. a language
  // switch) doesn't clobber the message the user is typing — it's only read at
  // the moment the modal opens.
  const defaultMessageRef = useRef(defaultMessage);
  defaultMessageRef.current = defaultMessage;

  // Reset to a clean state only on the closed→open transition, seeding the
  // message. Tracking the previous `open` avoids re-running when other props
  // (like defaultMessage) change while the modal is already open.
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setStep('choice');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone(emptyPhone('IT'));
      setMessage(defaultMessageRef.current);
      setErrors({});
      setSubmitting(false);
    }
    prevOpenRef.current = open;
  }, [open]);

  // Lock body scroll while the modal is open, via the shared refcounted lock
  // so it composes with the app's other overlays instead of clobbering them.
  useScrollLock(open);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Move focus into the dialog when it opens.
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = dialog.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? dialog).focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, step]);

  const goWhatsApp = () => {
    if (whatsappUrl) window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const validate = () => {
    const next: Record<string, boolean> = {};
    if (!firstName.trim()) next.firstName = true;
    if (!lastName.trim()) next.lastName = true;
    if (!EMAIL_RE.test(email.trim())) next.email = true;
    if (!phone.isValid) next.phone = true;
    if (!message.trim()) next.message = true;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      const publishableKey = (import.meta as any).env?.VITE_MEDUSA_PUBLISHABLE_KEY || '';
      const res = await fetch(`${MEDUSA_BACKEND_URL}/store/course-enrollment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(publishableKey ? { 'x-publishable-api-key': publishableKey } : {}),
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.e164,
          courseTitle,
          coursePrice,
          message: message.trim(),
          language,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStep('success');
    } catch {
      toast.error(t('courseEnroll.errGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  // Fields without a dedicated inline message (name / message) still need the
  // red invalid border. The Input/Textarea primitives only turn red via their
  // `error` prop, so drive the border + aria-invalid directly for those.
  const invalidProps = (bad?: boolean) =>
    bad ? ({ 'aria-invalid': true as const, className: 'border-destructive' }) : {};

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(20,20,20,.55)]"
          />
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="relative bg-white w-full max-w-[520px] max-h-[92dvh] rounded-t-[26px] sm:rounded-[32px] overflow-y-auto shadow-[0_30px_60px_-36px_rgba(0,0,0,0.3)] outline-none"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={t('courseEnroll.close')}
              className="absolute top-3 right-3 sm:top-5 sm:right-5 z-20 size-10 grid place-items-center bg-white text-[#555] shadow-[0_0_0_1px_#ececec] rounded-full transition-[transform,background-color] duration-[250ms] hover:rotate-90 hover:bg-[#f3f3f3] focus-visible:ring-2 focus-visible:ring-foreground"
            >
              <X className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>

            <div className="px-6 sm:px-9 pt-12 pb-7 sm:pt-14 sm:pb-9">
              {step === 'choice' && (
                <div className="flex flex-col">
                  <p className="text-[11px] leading-4 font-bold uppercase tracking-[1.8px] text-[#c8742d] text-center">
                    PriMo Academy
                  </p>
                  <h2 id={titleId} className="mt-2 text-[26px] sm:text-[30px] font-bold tracking-[-0.8px] leading-[1.15] text-center text-[#111]">
                    {t('courseEnroll.chooseTitle')}
                  </h2>
                  <div className="mt-6 mb-5 flex items-center justify-between gap-4 border-y border-[#e6e1dc] py-3.5 text-[14px]">
                    <span className="min-w-0 truncate text-[#8a8580]">{courseTitle}</span>
                    {coursePrice && <b className="shrink-0 font-semibold text-[#111]">€{coursePrice}</b>}
                  </div>

                  <div className="flex flex-col gap-3">
                    {whatsappUrl && (
                      <button
                        type="button"
                        onClick={goWhatsApp}
                        className="group flex items-center gap-4 w-full bg-[#25D366] text-white rounded-[28px] px-6 py-4 text-left hover:bg-[#1ebe5b] active:scale-[0.98] transition-[background-color,transform] shadow-[0_10px_24px_-12px_rgba(37,211,102,0.7)]"
                      >
                        <WhatsAppIcon className="w-7 h-7 shrink-0" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-semibold tracking-[0.2px]">{t('courseEnroll.whatsapp')}</span>
                          <span className="block font-inter text-[12.5px] text-white/90">{t('courseEnroll.whatsappDesc')}</span>
                        </span>
                        <ArrowRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setStep('form')}
                      className="group flex items-center gap-4 w-full bg-white text-black border border-[#d9d5d0] rounded-[28px] px-6 py-4 text-left hover:bg-[#f6f3ef] active:scale-[0.98] transition-[background-color,transform]"
                    >
                      <Mail className="w-5 h-5 shrink-0" strokeWidth={1.8} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] font-semibold tracking-[0.2px]">{t('courseEnroll.email')}</span>
                        <span className="block font-inter text-[12.5px] text-[#8a8580]">{t('courseEnroll.emailDesc')}</span>
                      </span>
                      <ArrowRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                  <p className="mt-4 text-center font-inter text-[12.5px] text-[#8a8580]">{t('courseEnroll.note')}</p>
                </div>
              )}

              {step === 'form' && (
                <form onSubmit={submit} noValidate className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setStep('choice')}
                    className="self-start flex items-center gap-1.5 text-[13px] font-semibold text-[#8a8580] hover:text-black transition-colors mb-4"
                  >
                    <ArrowLeft className="w-4 h-4" /> {t('courseEnroll.back')}
                  </button>
                  <h2 id={titleId} className="text-[24px] sm:text-[28px] font-bold tracking-[-0.8px] leading-[1.15] text-[#111]">
                    {t('courseEnroll.formTitle')}
                  </h2>
                  <p className="font-inter text-[14px] text-[#8a8580] mt-1 mb-6">
                    {courseTitle}{coursePrice ? ` · €${coursePrice}` : ''}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      id={firstNameId}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t('courseEnroll.firstName')}
                      aria-label={t('courseEnroll.firstName')}
                      {...invalidProps(errors.firstName)}
                    />
                    <Input
                      id={lastNameId}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t('courseEnroll.lastName')}
                      aria-label={t('courseEnroll.lastName')}
                      {...invalidProps(errors.lastName)}
                    />
                  </div>

                  <div className="mt-3">
                    <Input
                      id={emailId}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('courseEnroll.emailLabel')}
                      aria-label={t('courseEnroll.emailLabel')}
                      error={errors.email ? t('courseEnroll.errEmail') : undefined}
                    />
                  </div>

                  <div className="mt-3">
                    <PhoneField
                      value={phone}
                      onChange={setPhone}
                      invalid={errors.phone}
                      placeholder={t('courseEnroll.phonePh')}
                      locale={language}
                      searchPlaceholder={t('courseEnroll.searchCountry')}
                      emptyText={t('courseEnroll.noCountry')}
                    />
                    {errors.phone && <p className="text-xs text-destructive mt-1.5 pl-4">{t('courseEnroll.errPhone')}</p>}
                  </div>

                  <div className="mt-3">
                    <Textarea
                      id={messageId}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      placeholder={t('courseEnroll.messageLabel')}
                      aria-label={t('courseEnroll.messageLabel')}
                      {...invalidProps(errors.message)}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={submitting}
                    disabled={submitting}
                    className="mt-6 !rounded-full !bg-black !text-white hover:!bg-[#2a2a2a] font-semibold"
                  >
                    {submitting ? t('courseEnroll.sending') : t('courseEnroll.send')}
                  </Button>
                </form>
              )}

              {step === 'success' && (
                <div className="flex flex-col items-center text-center py-8">
                  <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white mb-6">
                    <Check className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={3} />
                  </div>
                  <h2 id={titleId} className="text-[26px] sm:text-[30px] font-bold tracking-[-0.8px] text-[#111]">
                    {t('courseEnroll.successTitle')}
                  </h2>
                  <p className="font-inter text-[15px] leading-6 text-[#555] mt-3 max-w-[320px]">
                    {t('courseEnroll.successBody')}
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-8 h-[52px] px-10 bg-black text-white font-semibold tracking-[0.2px] rounded-full transition-[background-color,transform] text-[15px] hover:bg-[#2a2a2a] active:scale-[0.98]"
                  >
                    {t('courseEnroll.close')}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
