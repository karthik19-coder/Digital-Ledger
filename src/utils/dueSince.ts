import { CustomerTransaction } from '../services/customer.service';
import { VendorTransaction } from '../types/vendor';
import { differenceInCalendarDays } from 'date-fns';

export interface DueSinceInfo {
  days: number;
  colorClass: string; // text CSS class or color variant
  badgeClass: string; // badge background + text class
}

type TxWithDate = {
  business_date?: string;
  date?: string;
  created_at?: string;
};

const getTxDate = (t: TxWithDate): Date => {
  return new Date(t.business_date || t.date || t.created_at || new Date());
};

/**
 * Calculates Due Since info (days since oldest unpaid transaction) for a Customer.
 * Outstanding balance must be > 0.
 * Filter transactions by customer, sort by date ascending (oldest first).
 * Apply payments sequentially (FIFO) against credit transactions.
 * Find the first credit transaction with remaining unpaid balance.
 */
export function calculateCustomerDueSince(
  transactions: CustomerTransaction[],
  totalOutstanding: number
): DueSinceInfo | null {
  if (totalOutstanding <= 0) return null;

  // Filter credit and payment transactions
  // Sort oldest first (ascending date)
  const sortedTxs = [...transactions].sort((a, b) => getTxDate(a).getTime() - getTxDate(b).getTime());

  let totalPayments = sortedTxs
    .filter((t) => t.type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0);

  const credits = sortedTxs.filter((t) => t.type === 'credit');

  let oldestUnpaidDate: Date | null = null;

  for (const credit of credits) {
    if (totalPayments >= credit.amount) {
      totalPayments -= credit.amount;
    } else {
      // Remaining payment is less than this credit amount, so this credit is partially or fully unpaid
      oldestUnpaidDate = getTxDate(credit);
      break;
    }
  }

  if (!oldestUnpaidDate) {
    // If for any reason no unpaid credit was found but totalOutstanding > 0, fallback to oldest credit
    if (credits.length > 0) {
      oldestUnpaidDate = getTxDate(credits[0]);
    } else {
      return null;
    }
  }
  
  if (isNaN(oldestUnpaidDate.getTime())) {
    return null;
  }

  const days = Math.max(0, differenceInCalendarDays(new Date(), oldestUnpaidDate));

  let colorClass = 'text-green-600';
  let badgeClass = 'bg-green-50 text-green-700 border-green-200';

  if (days >= 16 && days <= 30) {
    colorClass = 'text-orange-600';
    badgeClass = 'bg-orange-50 text-orange-700 border-orange-200';
  } else if (days >= 31) {
    colorClass = 'text-red-600';
    badgeClass = 'bg-red-50 text-red-700 border-red-200';
  }

  return { days, colorClass, badgeClass };
}

/**
 * Calculates Due Since info (days since oldest unpaid transaction) for a Vendor.
 * Outstanding balance must be > 0.
 * Filter transactions by vendor, sort by date ascending (oldest first).
 * Apply payments sequentially (FIFO) against purchase transactions.
 * Find the first purchase transaction with remaining unpaid balance.
 */
export function calculateVendorDueSince(
  transactions: VendorTransaction[],
  totalOutstanding: number
): DueSinceInfo | null {
  if (totalOutstanding <= 0) return null;

  // Filter purchase and payment transactions
  // Sort oldest first (ascending date)
  const sortedTxs = [...transactions].sort((a, b) => getTxDate(a).getTime() - getTxDate(b).getTime());

  let totalPayments = sortedTxs
    .filter((t) => t.type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0);

  const purchases = sortedTxs.filter((t) => t.type === 'purchase');

  let oldestUnpaidDate: Date | null = null;

  for (const purchase of purchases) {
    if (totalPayments >= purchase.amount) {
      totalPayments -= purchase.amount;
    } else {
      // Remaining payment is less than this purchase amount, so this purchase is partially or fully unpaid
      oldestUnpaidDate = getTxDate(purchase);
      break;
    }
  }

  if (!oldestUnpaidDate) {
    if (purchases.length > 0) {
      oldestUnpaidDate = getTxDate(purchases[0]);
    } else {
      return null;
    }
  }
  
  if (isNaN(oldestUnpaidDate.getTime())) {
    return null;
  }

  const days = Math.max(0, differenceInCalendarDays(new Date(), oldestUnpaidDate));

  let colorClass = 'text-green-600';
  let badgeClass = 'bg-green-50 text-green-700 border-green-200';

  if (days >= 16 && days <= 30) {
    colorClass = 'text-orange-600';
    badgeClass = 'bg-orange-50 text-orange-700 border-orange-200';
  } else if (days >= 31) {
    colorClass = 'text-red-600';
    badgeClass = 'bg-red-50 text-red-700 border-red-200';
  }

  return { days, colorClass, badgeClass };
}
