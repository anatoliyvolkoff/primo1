import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollRestoration = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hash) {
      // Scroll to the anchored section (e.g. /#bestsellers from search).
      // The target may not be mounted on the first tick after a route
      // change, so retry briefly before giving up.
      const id = hash.slice(1);
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return true;
        }
        return false;
      };
      if (tryScroll()) return;
      // If the anchor still isn't mounted after the retry, don't strand the
      // user at the previous scroll position — fall back to the top. (LB151-1)
      const timer = setTimeout(() => {
        if (!tryScroll()) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }, 350);
      return () => clearTimeout(timer);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
};
