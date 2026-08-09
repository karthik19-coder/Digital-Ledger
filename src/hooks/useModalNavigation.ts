import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * A hook for managing modal state via React Router history.
 * By using location.state, we can push a new history entry without changing the URL.
 * When the user presses the Android back button or browser back button, the history entry is popped,
 * effectively closing the modal without leaving the page.
 */
export function useModalNavigation(modalId: string) {
  const location = useLocation();
  const navigate = useNavigate();
  const isOpening = useRef(false);

  const modals: string[] = useMemo(() => {
    return Array.isArray(location.state?.modals) ? location.state.modals : [];
  }, [location.state]);

  const isOpen = modals.includes(modalId);

  useEffect(() => {
    if (isOpen) {
      isOpening.current = false;
    }
  }, [isOpen]);

  const openModal = useCallback(() => {
    if (!isOpen && !isOpening.current) {
      isOpening.current = true;
      navigate('.', {
        state: { 
          ...location.state, 
          modals: [...modals, modalId] 
        },
        replace: false // Push to history so the back button can pop it
      });
      
      // Fallback in case navigation gets interrupted
      setTimeout(() => {
        isOpening.current = false;
      }, 300);
    }
  }, [isOpen, location.state, modals, modalId, navigate]);

  const closeModal = useCallback(() => {
    if (isOpen) {
      // Find how deep this modal is in the stack. 
      // If there are multiple modals open on top of each other, 
      // and we want to close *this* specific one (and any above it),
      // we navigate back by the appropriate delta.
      const index = modals.indexOf(modalId);
      if (index !== -1) {
        const delta = modals.length - index;
        navigate(-delta);
      }
    }
  }, [isOpen, modals, modalId, navigate]);

  return { isOpen, openModal, closeModal };
}
