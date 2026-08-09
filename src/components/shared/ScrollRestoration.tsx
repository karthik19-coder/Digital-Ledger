import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * A centralized scroll restoration component for BrowserRouter.
 * React Router's built-in <ScrollRestoration> only works with createBrowserRouter (data routers).
 * This component mimics that behavior by saving scroll positions to sessionStorage.
 */
export function ScrollRestoration() {
  const location = useLocation();
  const navType = useNavigationType();
  const scrollTimeout = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollTimeout.current === null) {
        scrollTimeout.current = window.setTimeout(() => {
          // Save current scroll position for the current key
          sessionStorage.setItem(`scroll-${location.key}`, window.scrollY.toString());
          scrollTimeout.current = null;
        }, 100);
      }
    };

    // Use a small delay to attach the listener to avoid capturing initial zero state incorrectly
    const timeoutId = setTimeout(() => {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (scrollTimeout.current !== null) {
        clearTimeout(scrollTimeout.current);
        scrollTimeout.current = null;
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.key]);

  useEffect(() => {
    if (navType === 'POP') {
      // Navigating back/forward, restore scroll
      const savedPosition = sessionStorage.getItem(`scroll-${location.key}`);
      if (savedPosition) {
        // Use requestAnimationFrame to ensure the DOM has rendered before scrolling
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(savedPosition, 10));
        });
      }
    } else {
      // PUSH or REPLACE, scroll to top
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.search, location.key, navType]);

  return null;
}
