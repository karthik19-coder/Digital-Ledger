import { useCallback } from 'react';
import { useNavigation } from '../context/NavigationContext';

/**
 * A hook for smart back navigation.
 * Uses the centralized NavigationContext to determine if it's safe to go back,
 * preventing users from accidentally exiting the application if they landed via deep link.
 */
export function useSmartBack() {
  const { smartBack: contextSmartBack, canGoBack } = useNavigation();

  const smartBack = useCallback((fallbackRoute: string) => {
    contextSmartBack(fallbackRoute);
  }, [contextSmartBack]);

  return { smartBack, canGoBack };
}
