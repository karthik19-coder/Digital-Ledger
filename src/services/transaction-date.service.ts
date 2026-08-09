import { format, isAfter, startOfDay } from 'date-fns';
import { closingService } from './closing.service';

/**
 * Service to manage business rules for transaction dates across all financial modules.
 * Ensures consistent date logic for sales, expenses, payroll, and stock management.
 */
export const transactionDateService = {
  /**
   * Checks if the given date string corresponds to today.
   */
  isToday(dateStr: string): boolean {
    if (!dateStr) return false;
    return dateStr === format(new Date(), 'yyyy-MM-dd');
  },

  /**
   * Checks if the given date string is in the past compared to today.
   */
  isPreviousDate(dateStr: string): boolean {
    if (!dateStr) return false;
    return dateStr < format(new Date(), 'yyyy-MM-dd');
  },

  /**
   * Checks if the given date string is a future date.
   */
  isFutureDate(dateStr: string): boolean {
    if (!dateStr) return false;
    const dateObj = new Date(dateStr);
    return isAfter(startOfDay(dateObj), startOfDay(new Date()));
  },

  /**
   * Checks if the business day corresponding to the date has already been closed.
   */
  async isClosedBusinessDay(dateStr: string): Promise<boolean> {
    if (!dateStr || this.isToday(dateStr)) return false;
    return await closingService.isDayClosed(dateStr);
  },

  /**
   * Determines if the selected date is valid and can be selected.
   * Blocks future dates.
   */
  canSelectDate(dateStr: string): boolean {
    return !this.isFutureDate(dateStr);
  },

  /**
   * Gets the appropriate warning message for a given past date.
   * @param dateStr 
   * @returns Warning message string or null if no warning needed
   */
  getDateWarning(dateStr: string): string | null {
    if (this.isPreviousDate(dateStr)) {
      const formattedDate = format(new Date(dateStr), 'dd MMM yyyy');
      return `Recording transaction for ${formattedDate}. This transaction will be saved for the selected business day.`;
    }
    return null;
  },
};
