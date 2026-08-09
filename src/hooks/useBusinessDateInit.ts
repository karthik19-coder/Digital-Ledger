import { useEffect, useState } from 'react';
import { businessDateService } from '../services/businessDate.service';
import { closingService } from '../services/closing.service';
import { format, startOfDay } from 'date-fns';

export function useBusinessDateInit() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    async function init() {
      const today = startOfDay(new Date());
      const todayStr = format(today, 'yyyy-MM-dd');
      
      const storedDate = sessionStorage.getItem('global_business_date');
      
      if (storedDate) {
        // Active session exists.
        const storedDateObj = new Date(storedDate);
        const storedDateStr = format(storedDateObj, 'yyyy-MM-dd');
        
        if (storedDateStr !== todayStr) {
          // If viewing an older date, check if it's closed.
          const isClosed = await closingService.isDayClosed(storedDateStr);
          if (isClosed) {
            // "If the user is simply viewing an older CLOSED Business Day, 
            // closing or refreshing the application should automatically return to Today's Business Day."
            businessDateService.setSelectedBusinessDate(today);
          }
        }
      } else {
        // Application starting fresh (no session storage).
        // "If a previous Business Day is still OPEN do NOT automatically switch to Today."
        const pendingDayStr = await closingService.getPendingPreviousDay(todayStr);
        if (pendingDayStr) {
          businessDateService.setSelectedBusinessDate(startOfDay(new Date(pendingDayStr)));
        } else {
          businessDateService.setSelectedBusinessDate(today);
        }
      }
      
      if (isMounted) {
        setInitialized(true);
      }
    }
    
    init();
    
    return () => {
      isMounted = false;
    };
  }, []);

  return initialized;
}
