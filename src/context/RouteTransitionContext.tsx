import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useNavigation } from './NavigationContext';
import { NavigationDirection } from '../types/navigation';

interface RouteTransitionContextType {
  isTransitioning: boolean;
  transitionDirection: NavigationDirection;
  previousRoute: string | null;
  currentRoute: string;
}

const RouteTransitionContext = createContext<RouteTransitionContextType | undefined>(undefined);

export function RouteTransitionProvider({ children }: { children: React.ReactNode }) {
  const { currentRoute, previousRoute, direction } = useNavigation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<NavigationDirection>('unknown');

  useEffect(() => {
    if (previousRoute && previousRoute !== currentRoute) {
      setIsTransitioning(true);
      setTransitionDirection(direction);

      // In the future, this timeout would match the CSS animation duration
      // For now, it's just infrastructure resolving immediately on next tick or tiny delay
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [currentRoute, previousRoute, direction]);

  const value = useMemo(() => ({
    isTransitioning,
    transitionDirection,
    previousRoute,
    currentRoute,
  }), [isTransitioning, transitionDirection, previousRoute, currentRoute]);

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  const context = useContext(RouteTransitionContext);
  if (!context) {
    throw new Error('useRouteTransition must be used within a RouteTransitionProvider');
  }
  return context;
}
