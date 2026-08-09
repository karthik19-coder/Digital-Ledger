import { useState, useEffect, useCallback } from 'react';
import { businessDateService } from '../services/businessDate.service';

export function useBusinessDate() {
  const [selectedDate, setDateState] = useState<Date>(
    businessDateService.getSelectedBusinessDate()
  );

  useEffect(() => {
    // Sync initial state in case it changed between initial render and effect execution
    setDateState(businessDateService.getSelectedBusinessDate());

    // Subscribe to future changes
    const unsubscribe = businessDateService.subscribe((newDate) => {
      setDateState(newDate);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const setSelectedDate = useCallback((date: Date) => {
    businessDateService.setSelectedBusinessDate(date);
  }, []);

  const nextDay = useCallback(() => {
    businessDateService.nextDay();
  }, []);

  const previousDay = useCallback(() => {
    businessDateService.previousDay();
  }, []);

  const isToday = businessDateService.isToday();

  return {
    selectedDate,
    setSelectedDate,
    nextDay,
    previousDay,
    isToday,
  };
}
