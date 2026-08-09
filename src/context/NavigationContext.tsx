import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, To, NavigateOptions } from 'react-router-dom';
import { NavigationDirection } from '../types/navigation';

interface NavigationContextType {
  currentRoute: string;
  previousRoute: string | null;
  canGoBack: boolean;
  direction: NavigationDirection;
  isInternalEntry: boolean;
  smartBack: (fallback: string) => void;
  navigateTo: (to: To, options?: NavigateOptions) => void;
  replaceTo: (to: To, options?: NavigateOptions) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [currentRoute, setCurrentRoute] = useState(location.pathname + location.search);
  const [previousRoute, setPreviousRoute] = useState<string | null>(null);
  const [direction, setDirection] = useState<NavigationDirection>('unknown');
  
  // Track if they entered the app fresh (deep link or initial load)
  const isInternalEntry = useRef(window.history.length > 1 && window.history.state?.idx > 0);
  
  const historyStack = useRef<string[]>([location.pathname + location.search]);
  const currentIdx = useRef(0);

  useEffect(() => {
    const newRoute = location.pathname + location.search;
    if (newRoute === currentRoute) return;

    // React router adds state.idx in most environments
    const stateIdx = window.history.state?.idx;
    let newDirection: NavigationDirection = 'forward';

    if (stateIdx !== undefined) {
      if (stateIdx < currentIdx.current) newDirection = 'backward';
      else if (stateIdx === currentIdx.current) newDirection = 'replace';
      currentIdx.current = stateIdx;
    }

    setPreviousRoute(currentRoute);
    setCurrentRoute(newRoute);
    setDirection(newDirection);

    if (newDirection === 'forward') {
      historyStack.current.push(newRoute);
      if (historyStack.current.length > 50) {
        historyStack.current.shift(); // Cap history stack length to prevent memory growth
      }
    } else if (newDirection === 'backward') {
      historyStack.current.pop();
    } else if (newDirection === 'replace') {
      historyStack.current[historyStack.current.length - 1] = newRoute;
    }

    isInternalEntry.current = true;
  }, [location, currentRoute]);

  const canGoBack = useMemo(() => {
    // Determine if we can safely go back within our own application
    const browserHasHistory = window.history.length > 1 && window.history.state?.idx > 0;
    return historyStack.current.length > 1 || browserHasHistory;
  }, [currentRoute]); // Recalculate on route change

  const smartBack = useCallback((fallback: string) => {
    if (canGoBack) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  }, [canGoBack, navigate]);

  const navigateTo = useCallback((to: To, options?: NavigateOptions) => {
    navigate(to, options);
  }, [navigate]);

  const replaceTo = useCallback((to: To, options?: NavigateOptions) => {
    navigate(to, { ...options, replace: true });
  }, [navigate]);

  const value = useMemo(() => ({
    currentRoute,
    previousRoute,
    canGoBack,
    direction,
    isInternalEntry: isInternalEntry.current,
    smartBack,
    navigateTo,
    replaceTo,
  }), [currentRoute, previousRoute, canGoBack, direction, smartBack, navigateTo, replaceTo]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
