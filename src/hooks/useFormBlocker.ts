import { useEffect, useState, useCallback } from 'react';

/**
 * A hook to block navigation when a form has unsaved changes.
 * Currently uses window.beforeunload for browser tab closing/refreshing.
 * React Router v6 useBlocker requires a data router, so internal 
 * client-side navigation blocking is temporarily disabled.
 */
export function useFormBlocker(initialDirty: boolean = false) {
  const [isDirty, setIsDirty] = useState(initialDirty);

  // Sync state if initialDirty changes (e.g. from react-hook-form)
  useEffect(() => {
    setIsDirty(initialDirty);
  }, [initialDirty]);

  // Block browser tab close/refresh
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Most modern browsers ignore the custom string, but require returnValue to be set
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // Stub functions to maintain API compatibility
  const confirmNavigation = useCallback(() => {}, []);
  const cancelNavigation = useCallback(() => {}, []);
  const resetDirty = useCallback(() => {
    setIsDirty(false);
  }, []);

  return {
    isDirty,
    setIsDirty,
    resetDirty,
    confirmNavigation,
    cancelNavigation,
    isBlocked: false,
  };
}

