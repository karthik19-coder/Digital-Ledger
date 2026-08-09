export const mapPaymentMethodToUI = (method: string | null): 'Cash' | 'UPI' | 'Bank' | undefined => {
  if (!method) return undefined;
  if (method === 'Cash') return 'Cash';
  if (method === 'UPI') return 'UPI';
  if (method === 'Bank') return 'Bank';
  return undefined;
};

export const mapPaymentMethodToDB = (method: string | undefined): 'Cash' | 'UPI' | 'Bank' | null => {
  if (!method) return null;
  if (method.toLowerCase() === 'cash') return 'Cash';
  if (method.toLowerCase() === 'upi') return 'UPI';
  if (method.toLowerCase() === 'bank') return 'Bank';
  return null;
};
