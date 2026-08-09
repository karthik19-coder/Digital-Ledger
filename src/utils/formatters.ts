let globalCurrency = 'INR';
// let globalTimezone = 'Asia/Kolkata'; // Timezone is fetched but currently unused in formatters

export const setGlobalFormatSettings = (currency: string, timezone: string) => {
  if (currency) globalCurrency = currency;
  // if (timezone) globalTimezone = timezone;
};

export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: globalCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(0);
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: globalCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
