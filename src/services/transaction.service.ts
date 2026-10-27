import { businessDayService } from './businessDay.service';

export const transactionService = {
  // A simple mechanism to batch recalculations if multiple transactions occur rapidly
  _recalcTimeout: null as any,
  _pendingRecalcs: new Set<string>(),
  _isExecuting: false,

  /**
   * Universal wrapper for all financial transactions in the application.
   * @param payload The transaction payload or context (for logging/debugging).
   * @param transactionDate The date of the transaction (to know which day to recalculate).
   * @param saveCallback The actual callback that writes data to the domain service (e.g. salesService).
   * @param refreshEvents The events to dispatch after the transaction is saved (e.g., ['sales-refresh', 'dashboard-refresh'])
   */
  async executeTransaction<T>(
    // Payload arrives directly from raw Supabase generic realtime socket events.
    // Kept as `any` because the payload schema structure is externally driven.
    payload: any,
    transactionDate: string,
    saveCallback: () => Promise<T>,
    refreshEvents: string[] = []
  ): Promise<T> {
    if (this._isExecuting) {
      throw new Error('Transaction already in progress. Please wait.');
    }
    
    this._isExecuting = true;
    
    try {
      let result: T;
      
      // 1. Save the transaction via the domain service
      try {
        result = await saveCallback();
      } catch (error) {
        console.error('Transaction Save Error:', error);
        throw error;
      }

      // 2. Queue the business day for recalculation
      this._queueRecalculation(transactionDate, refreshEvents);

      return result;
    } finally {
      this._isExecuting = false;
    }
  },

  _queueRecalculation(dateStr: string, refreshEvents: string[]) {
    this._pendingRecalcs.add(dateStr);

    if (this._recalcTimeout) {
      clearTimeout(this._recalcTimeout);
    }

    this._recalcTimeout = setTimeout(async () => {
      const datesToRecalc = Array.from(this._pendingRecalcs);
      this._pendingRecalcs.clear();

      try {
        // Run batch recalculations
        await Promise.all(datesToRecalc.map((d: string) => businessDayService.recalculateBusinessDay(d)));
        
        // Dispatch ONE global refresh event to trigger all UI updates
        window.dispatchEvent(new Event('app-data-refresh'));
      } catch (error) {
        console.error('Error recalculating business day totals:', error);
        // Show fallback error without losing the transaction
        alert('Transaction saved, but unable to update Daily Closing. Please refresh the page.');
      }
    }, 50); // 50ms debounce for snappier UI
  }
};
