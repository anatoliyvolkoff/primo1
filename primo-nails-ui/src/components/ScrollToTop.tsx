import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const ScrollToTop = () => {
    const { t } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = () => {
        if (window.scrollY > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    const scrollToTop = () => {
        const reduced =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({
            top: 0,
            behavior: reduced ? 'auto' : 'smooth',
        });
    };

    useEffect(() => {
        toggleVisibility();
        window.addEventListener('scroll', toggleVisibility, { passive: true });
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    whileHover={{ scale: 1.08, translateY: -3 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={scrollToTop}
                    className="scroll-to-top fixed right-4 sm:right-8 z-[90] w-12 h-12 sm:w-14 sm:h-14 bg-background border border-border shadow-2xl rounded-full flex items-center justify-center text-foreground hover:bg-foreground hover:text-background transition-colors duration-300 group"
                    style={{
                        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
                    }}
                    aria-label={t('a11y.scrollToTop')}
                >
                    <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5] group-hover:animate-bounce" />
                    <div aria-hidden="true" className="absolute inset-0 rounded-full bg-foreground/5 opacity-0 group-hover:opacity-100 blur-xl transition-opacity animate-pulse" />
                </motion.button>
            )}
        </AnimatePresence>
    );
};
